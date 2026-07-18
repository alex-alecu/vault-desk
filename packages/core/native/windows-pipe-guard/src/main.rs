#[cfg(windows)]
mod probe;
#[cfg(windows)]
mod security;
#[cfg(windows)]
mod server;

#[cfg(windows)]
use std::env;
#[cfg(windows)]
use std::error::Error;

#[cfg(windows)]
fn run() -> Result<(), Box<dyn Error>> {
    let mut arguments = env::args().skip(1);
    match (
        arguments.next().as_deref(),
        arguments.next(),
        arguments.next(),
        arguments.next(),
    ) {
        (Some("serve"), Some(endpoint), Some(maximum), None) => {
            server::serve(&endpoint, maximum.parse()?)
        }
        (Some("probe"), Some(endpoint), None, None) => probe::probe(&endpoint),
        _ => Err("Usage: vault-pipe-guard <serve ENDPOINT MAXIMUM|probe ENDPOINT>.".into()),
    }
}

#[cfg(windows)]
fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

#[cfg(not(windows))]
fn main() {
    println!("The Vault Desk pipe guard is built only on Windows.");
}
