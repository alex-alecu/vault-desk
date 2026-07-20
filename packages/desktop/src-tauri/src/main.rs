use serde_json::{Value, json};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

const MAX_RESPONSE_BYTES: u64 = 1024 * 1024;

#[cfg(windows)]
fn add_platform_arguments(
    arguments: &mut Vec<String>,
    core_resources: &Path,
) -> Result<(), String> {
    arguments.extend([
        "--windows-pipe-guard".to_owned(),
        path_text(&core_resources.join("vault-pipe-guard.exe"))?,
    ]);
    Ok(())
}

#[cfg(not(windows))]
fn add_platform_arguments(_: &mut Vec<String>, _: &Path) -> Result<(), String> {
    Ok(())
}

struct CoreBridge {
    child: Mutex<Option<CommandChild>>,
    endpoint: String,
    next_id: AtomicU64,
}

impl CoreBridge {
    fn start(app: &AppHandle) -> Result<Self, String> {
        let data_root = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        let resource_root = app
            .path()
            .resource_dir()
            .map_err(|error| error.to_string())?;
        let workspace = data_root.join("state");
        let model_store = data_root.join("models");
        let ready_file = data_root.join("core.ready");
        let core_resources = resource_root.join("resources/core");
        fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
        fs::create_dir_all(&model_store).map_err(|error| error.to_string())?;
        remove_stale_ready_file(&ready_file)?;

        let mut arguments = vec![
            "--workspace".to_owned(),
            path_text(&workspace)?,
            "--model-store".to_owned(),
            path_text(&model_store)?,
            "--profile".to_owned(),
            "local12".to_owned(),
            "--migration-directory".to_owned(),
            path_text(&core_resources.join("migrations"))?,
            "--native-binding".to_owned(),
            path_text(&core_resources.join("better_sqlite3.node"))?,
            "--ready-file".to_owned(),
            path_text(&ready_file)?,
            "--sessions-only".to_owned(),
        ];
        add_platform_arguments(&mut arguments, &core_resources)?;
        let (mut events, child) = app
            .shell()
            .sidecar("vault-core")
            .map_err(|error| error.to_string())?
            .args(arguments)
            .spawn()
            .map_err(|error| error.to_string())?;
        tauri::async_runtime::spawn(async move { while events.recv().await.is_some() {} });
        let endpoint = wait_for_ready_file(&ready_file)?;
        Ok(Self {
            child: Mutex::new(Some(child)),
            endpoint,
            next_id: AtomicU64::new(1),
        })
    }

    fn call(&self, method: &str, params: Value) -> Result<Value, String> {
        let request = json!({
            "jsonrpc": "2.0",
            "id": self.next_id.fetch_add(1, Ordering::Relaxed),
            "method": method,
            "params": params,
            "protocolVersion": 1,
        });
        let response = exchange(&self.endpoint, &format!("{request}\n"))?;
        let envelope: Value =
            serde_json::from_slice(&response).map_err(|error| error.to_string())?;
        if let Some(error) = envelope.get("error") {
            return Err(error
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Vault Core rejected the request.")
                .to_owned());
        }
        envelope
            .get("result")
            .cloned()
            .ok_or_else(|| "Vault Core returned no result.".to_owned())
    }

    fn stop(&self) {
        if let Ok(mut child) = self.child.lock()
            && let Some(child) = child.take()
        {
            let _ = child.kill();
        }
    }
}

fn path_text(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_owned)
        .ok_or_else(|| "Vault Desk requires UTF-8 application paths.".to_owned())
}

fn remove_stale_ready_file(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn wait_for_ready_file(path: &Path) -> Result<String, String> {
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        match fs::read_to_string(path) {
            Ok(endpoint) if !endpoint.trim().is_empty() => return Ok(endpoint.trim().to_owned()),
            Ok(_) | Err(_) if Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(25));
            }
            Ok(_) | Err(_) => return Err("Vault Core did not become ready.".to_owned()),
        }
    }
}

#[cfg(unix)]
fn connect(endpoint: &str) -> std::io::Result<std::os::unix::net::UnixStream> {
    std::os::unix::net::UnixStream::connect(endpoint)
}

#[cfg(windows)]
fn connect(endpoint: &str) -> std::io::Result<std::fs::File> {
    std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(endpoint)
}

fn exchange(endpoint: &str, request: &str) -> Result<Vec<u8>, String> {
    let mut stream = connect(endpoint).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .map_err(|error| error.to_string())?;
        stream
            .set_write_timeout(Some(Duration::from_secs(5)))
            .map_err(|error| error.to_string())?;
    }
    stream
        .write_all(request.as_bytes())
        .map_err(|error| error.to_string())?;
    let mut response = Vec::new();
    stream
        .take(MAX_RESPONSE_BYTES + 1)
        .read_to_end(&mut response)
        .map_err(|error| error.to_string())?;
    if response.len() as u64 > MAX_RESPONSE_BYTES {
        return Err("Vault Core response exceeded its limit.".to_owned());
    }
    Ok(response)
}

#[tauri::command]
async fn desktop_bootstrap(core: State<'_, CoreBridge>) -> Result<Value, String> {
    let folders = core.call("folders.list", json!({}))?;
    let global_sessions = core.call("sessions.list", json!({ "folderId": null, "limit": 5 }))?;
    let mut folder_sessions = Vec::new();
    let items = folders
        .as_array()
        .ok_or_else(|| "Vault Core returned invalid folders.".to_owned())?;
    for folder in items {
        let folder_id = folder
            .get("id")
            .and_then(Value::as_str)
            .ok_or_else(|| "Vault Core returned an invalid folder.".to_owned())?;
        let page = core.call(
            "sessions.list",
            json!({ "folderId": folder_id, "limit": 5 }),
        )?;
        folder_sessions.push(json!({ "folderId": folder_id, "page": page }));
    }
    Ok(json!({
        "folders": folders,
        "globalSessions": global_sessions,
        "folderSessions": folder_sessions,
    }))
}

#[tauri::command]
async fn choose_folder(
    app: AppHandle,
    core: State<'_, CoreBridge>,
) -> Result<Option<Value>, String> {
    let Some(selection) = app
        .dialog()
        .file()
        .set_title("Choose a folder for Vault Desk")
        .blocking_pick_folder()
    else {
        return Ok(None);
    };
    let path = selection.into_path().map_err(|error| error.to_string())?;
    Ok(Some(core.call(
        "folders.add",
        json!({ "rootPath": path_text(&path)? }),
    )?))
}

#[tauri::command]
async fn create_session(
    core: State<'_, CoreBridge>,
    folder_id: Option<String>,
) -> Result<Value, String> {
    core.call("sessions.create", json!({ "folderId": folder_id }))
}

#[tauri::command]
async fn list_sessions(
    core: State<'_, CoreBridge>,
    folder_id: Option<String>,
    cursor: Option<String>,
) -> Result<Value, String> {
    let mut params = json!({ "folderId": folder_id, "limit": 5 });
    if let Some(cursor) = cursor {
        params["cursor"] = Value::String(cursor);
    }
    core.call("sessions.list", params)
}

#[tauri::command]
async fn list_messages(core: State<'_, CoreBridge>, session_id: String) -> Result<Value, String> {
    core.call("messages.list", json!({ "sessionId": session_id }))
}

#[tauri::command]
async fn append_user_message(
    core: State<'_, CoreBridge>,
    session_id: String,
    content: String,
) -> Result<Value, String> {
    core.call(
        "messages.append",
        json!({ "sessionId": session_id, "role": "user", "content": content }),
    )
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let core = CoreBridge::start(app.handle()).map_err(std::io::Error::other)?;
            app.manage(core);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            append_user_message,
            choose_folder,
            create_session,
            desktop_bootstrap,
            list_messages,
            list_sessions,
        ])
        .build(tauri::generate_context!())
        .expect("Vault Desk desktop failed");
    app.run(|app, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. })
            && let Some(core) = app.try_state::<CoreBridge>()
        {
            core.stop();
        }
    });
}
