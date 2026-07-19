use crate::security::current_user_descriptor;
use std::error::Error;
use std::ffi::{OsStr, c_void};
use std::io::{ErrorKind, Read, Write};
use std::mem::size_of;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;

type Pointer = *mut c_void;

const PIPE_ACCESS_DUPLEX: u32 = 3;
const FILE_FLAG_FIRST_PIPE_INSTANCE: u32 = 0x0008_0000;
const PIPE_REJECT_REMOTE_CLIENTS: u32 = 8;
const SYNCHRONIZE: u32 = 0x0010_0000;
const INFINITE: u32 = u32::MAX;
const ERROR_PIPE_CONNECTED: u32 = 535;
const ERROR_BROKEN_PIPE: u32 = 109;
const ERROR_NO_DATA: u32 = 232;
const ERROR_PIPE_NOT_CONNECTED: u32 = 233;
const BUFFER_BYTES: usize = 65_536;

#[repr(C)]
struct SecurityAttributes {
    length: u32,
    descriptor: Pointer,
    inherit: i32,
}

#[link(name = "kernel32")]
unsafe extern "system" {
    fn CreateNamedPipeW(
        name: *const u16,
        open_mode: u32,
        pipe_mode: u32,
        maximum_instances: u32,
        output_size: u32,
        input_size: u32,
        timeout: u32,
        security: *const SecurityAttributes,
    ) -> Pointer;
    fn ConnectNamedPipe(pipe: Pointer, overlapped: Pointer) -> i32;
    fn ReadFile(
        pipe: Pointer,
        buffer: Pointer,
        bytes: u32,
        read: *mut u32,
        overlapped: Pointer,
    ) -> i32;
    fn WriteFile(
        pipe: Pointer,
        buffer: Pointer,
        bytes: u32,
        written: *mut u32,
        overlapped: Pointer,
    ) -> i32;
    fn FlushFileBuffers(pipe: Pointer) -> i32;
    fn CloseHandle(handle: Pointer) -> i32;
    fn GetLastError() -> u32;
    fn OpenProcess(access: u32, inherit: i32, process_id: u32) -> Pointer;
    fn WaitForSingleObject(handle: Pointer, milliseconds: u32) -> u32;
}

struct Pipe(Pointer);

impl Drop for Pipe {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

fn invalid_handle() -> Pointer {
    usize::MAX as Pointer
}

fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

fn exit_with_parent(parent_pid: u32) -> Result<(), Box<dyn Error>> {
    let parent = unsafe { OpenProcess(SYNCHRONIZE, 0, parent_pid) };
    if parent.is_null() {
        return Err(format!(
            "parent process open failed: {}",
            std::io::Error::last_os_error()
        )
        .into());
    }
    let parent_address = parent as usize;
    std::thread::spawn(move || {
        let parent = parent_address as Pointer;
        unsafe {
            WaitForSingleObject(parent, INFINITE);
            CloseHandle(parent);
        }
        std::process::exit(0);
    });
    Ok(())
}

fn create_pipe(endpoint: &str) -> Result<Pipe, Box<dyn Error>> {
    let descriptor = current_user_descriptor()?;
    let security = SecurityAttributes {
        length: size_of::<SecurityAttributes>() as u32,
        descriptor: descriptor.as_ptr(),
        inherit: 0,
    };
    let name = wide(OsStr::new(endpoint));
    let pipe = unsafe {
        CreateNamedPipeW(
            name.as_ptr(),
            PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE,
            PIPE_REJECT_REMOTE_CLIENTS,
            1,
            BUFFER_BYTES as u32,
            BUFFER_BYTES as u32,
            0,
            &security,
        )
    };
    if pipe == invalid_handle() {
        return Err(format!("pipe creation failed: {}", std::io::Error::last_os_error()).into());
    }
    Ok(Pipe(pipe))
}

fn connect(pipe: Pointer) -> Result<(), Box<dyn Error>> {
    if unsafe { ConnectNamedPipe(pipe, null_mut()) } != 0 {
        return Ok(());
    }
    let error = unsafe { GetLastError() };
    if error == ERROR_PIPE_CONNECTED {
        Ok(())
    } else {
        Err(format!("pipe connection failed with {error}").into())
    }
}

fn read_request(pipe: Pointer, maximum_bytes: usize) -> Result<Option<Vec<u8>>, Box<dyn Error>> {
    let mut request = Vec::new();
    let mut buffer = [0_u8; BUFFER_BYTES];
    loop {
        let mut read = 0;
        let succeeded = unsafe {
            ReadFile(
                pipe,
                buffer.as_mut_ptr().cast(),
                buffer.len() as u32,
                &mut read,
                null_mut(),
            )
        };
        if succeeded == 0 {
            let error = unsafe { GetLastError() };
            if matches!(
                error,
                ERROR_BROKEN_PIPE | ERROR_NO_DATA | ERROR_PIPE_NOT_CONNECTED
            ) {
                return Ok(None);
            }
            return Err(format!("pipe read failed with {error}").into());
        }
        let chunk = &buffer[..read as usize];
        if request.len().saturating_add(chunk.len()) > maximum_bytes {
            return Ok(None);
        }
        request.extend_from_slice(chunk);
        if request.contains(&b'\n') {
            return Ok(Some(request));
        }
    }
}

fn write_all(pipe: Pointer, mut value: &[u8]) -> Result<(), Box<dyn Error>> {
    while !value.is_empty() {
        let mut written = 0;
        if unsafe {
            WriteFile(
                pipe,
                value.as_ptr().cast_mut().cast(),
                value.len() as u32,
                &mut written,
                null_mut(),
            )
        } == 0
        {
            return Err(format!("pipe write failed: {}", std::io::Error::last_os_error()).into());
        }
        value = &value[written as usize..];
    }
    Ok(())
}

fn exchange(pipe: Pointer, maximum_bytes: usize) -> Result<bool, Box<dyn Error>> {
    let Some(request) = read_request(pipe, maximum_bytes)? else {
        return Ok(true);
    };
    let mut output = std::io::stdout().lock();
    output.write_all(&(request.len() as u32).to_le_bytes())?;
    output.write_all(&request)?;
    output.flush()?;
    let mut input = std::io::stdin().lock();
    let mut length = [0_u8; 4];
    if let Err(error) = input.read_exact(&mut length) {
        return if error.kind() == ErrorKind::UnexpectedEof {
            Ok(false)
        } else {
            Err(error.into())
        };
    }
    let mut response = vec![0_u8; u32::from_le_bytes(length) as usize];
    input.read_exact(&mut response)?;
    write_all(pipe, &response)?;
    unsafe { FlushFileBuffers(pipe) };
    Ok(true)
}

pub fn serve(endpoint: &str, maximum_bytes: usize, parent_pid: u32) -> Result<(), Box<dyn Error>> {
    if maximum_bytes == 0 {
        return Err("maximum request bytes must be positive".into());
    }
    exit_with_parent(parent_pid)?;
    let mut pipe = create_pipe(endpoint)?;
    eprintln!("ready");
    std::io::stderr().flush()?;
    loop {
        connect(pipe.0)?;
        let keep_running = exchange(pipe.0, maximum_bytes)?;
        if !keep_running {
            return Ok(());
        }
        drop(pipe);
        pipe = create_pipe(endpoint)?;
    }
}
