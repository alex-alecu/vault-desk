use crate::security::{
    Handle, Pointer, SecurityDescriptor, SidAndAttributes, current_token, invalid_handle,
    last_error, sid_string, token_user, wide, wide_text,
};
use std::error::Error;
use std::ffi::OsStr;
use std::ptr::null_mut;

const TOKEN_DUPLICATE: u32 = 0x0002;
const TOKEN_IMPERSONATE: u32 = 0x0004;
const TOKEN_QUERY: u32 = 0x0008;
const DISABLE_MAX_PRIVILEGE: u32 = 1;
const READ_CONTROL: u32 = 0x0002_0000;
const GENERIC_READ: u32 = 0x8000_0000;
const GENERIC_WRITE: u32 = 0x4000_0000;
const OPEN_EXISTING: u32 = 3;
const DACL_SECURITY_INFORMATION: u32 = 4;
const SE_KERNEL_OBJECT: u32 = 6;
const ERROR_ACCESS_DENIED: u32 = 5;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetLastError() -> u32;
    fn CreateFileW(
        name: *const u16,
        access: u32,
        share: u32,
        security: Pointer,
        creation: u32,
        flags: u32,
        template: Pointer,
    ) -> Pointer;
    fn WaitNamedPipeW(name: *const u16, timeout: u32) -> i32;
    fn CloseHandle(handle: Pointer) -> i32;
}

#[link(name = "advapi32")]
unsafe extern "system" {
    fn GetSecurityInfo(
        handle: Pointer,
        object_type: u32,
        information: u32,
        owner: *mut Pointer,
        group: *mut Pointer,
        dacl: *mut Pointer,
        sacl: *mut Pointer,
        descriptor: *mut Pointer,
    ) -> u32;
    fn ConvertSecurityDescriptorToStringSecurityDescriptorW(
        descriptor: Pointer,
        revision: u32,
        information: u32,
        text: *mut *mut u16,
        length: *mut u32,
    ) -> i32;
    fn CreateRestrictedToken(
        existing: Pointer,
        flags: u32,
        disabled_count: u32,
        disabled: *const SidAndAttributes,
        deleted_count: u32,
        deleted: Pointer,
        restricted_count: u32,
        restricted: Pointer,
        token: *mut Pointer,
    ) -> i32;
    fn ImpersonateLoggedOnUser(token: Pointer) -> i32;
    fn RevertToSelf() -> i32;
}

fn pipe_sddl(endpoint: &str) -> Result<String, Box<dyn Error>> {
    let endpoint = wide(OsStr::new(endpoint));
    let pipe = Handle::new(
        unsafe {
            CreateFileW(
                endpoint.as_ptr(),
                READ_CONTROL,
                0,
                null_mut(),
                OPEN_EXISTING,
                0,
                null_mut(),
            )
        },
        "pipe security open",
    )?;
    let mut descriptor = null_mut();
    let status = unsafe {
        GetSecurityInfo(
            pipe.0,
            SE_KERNEL_OBJECT,
            DACL_SECURITY_INFORMATION,
            null_mut(),
            null_mut(),
            null_mut(),
            null_mut(),
            &mut descriptor,
        )
    };
    if status != 0 {
        return Err(format!("pipe security query failed with {status}").into());
    }
    let descriptor = SecurityDescriptor::new(descriptor);
    let mut text = null_mut();
    if unsafe {
        ConvertSecurityDescriptorToStringSecurityDescriptorW(
            descriptor.as_ptr(),
            1,
            DACL_SECURITY_INFORMATION,
            &mut text,
            null_mut(),
        )
    } == 0
    {
        return Err(last_error("pipe SDDL conversion"));
    }
    let text = SecurityDescriptor::new(text.cast());
    Ok(wide_text(text.as_ptr().cast()))
}

fn restricted_connection_denied(
    endpoint: &str,
    token: Pointer,
    sid: Pointer,
) -> Result<bool, Box<dyn Error>> {
    let disabled = SidAndAttributes { sid, attributes: 0 };
    let mut restricted = null_mut();
    if unsafe {
        CreateRestrictedToken(
            token,
            DISABLE_MAX_PRIVILEGE,
            1,
            &disabled,
            0,
            null_mut(),
            0,
            null_mut(),
            &mut restricted,
        )
    } == 0
    {
        return Err(last_error("restricted token creation"));
    }
    let restricted = Handle::new(restricted, "restricted token creation")?;
    if unsafe { ImpersonateLoggedOnUser(restricted.0) } == 0 {
        return Err(last_error("restricted token impersonation"));
    }
    let endpoint = wide(OsStr::new(endpoint));
    let mut denied = false;
    for _ in 0..100 {
        unsafe { WaitNamedPipeW(endpoint.as_ptr(), 50) };
        let pipe = unsafe {
            CreateFileW(
                endpoint.as_ptr(),
                GENERIC_READ | GENERIC_WRITE,
                0,
                null_mut(),
                OPEN_EXISTING,
                0,
                null_mut(),
            )
        };
        if pipe != invalid_handle() {
            unsafe { CloseHandle(pipe) };
            break;
        }
        if unsafe { GetLastError() } == ERROR_ACCESS_DENIED {
            denied = true;
            break;
        }
    }
    unsafe { RevertToSelf() };
    Ok(denied)
}

pub fn probe(endpoint: &str) -> Result<(), Box<dyn Error>> {
    let token = current_token(TOKEN_QUERY | TOKEN_DUPLICATE | TOKEN_IMPERSONATE)?;
    let (_user, sid) = token_user(token.0)?;
    let current_user_sid = sid_string(sid)?;
    let sddl = pipe_sddl(endpoint)?;
    let restricted_denied = restricted_connection_denied(endpoint, token.0, sid)?;
    println!(
        "{{\"currentUserSid\":\"{current_user_sid}\",\"restrictedConnectionDenied\":{restricted_denied},\"sddl\":\"{sddl}\"}}"
    );
    Ok(())
}
