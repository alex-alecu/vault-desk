use crate::security::{
    Handle, Pointer, SecurityDescriptor, SidAndAttributes, current_token, current_user_descriptor,
    invalid_handle, last_error, sid_string, token_user, wide, wide_text,
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
const OWNER_SECURITY_INFORMATION: u32 = 1;
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
    fn EqualSid(first: Pointer, second: Pointer) -> i32;
}

pub(crate) struct PipeSecurity {
    pub(crate) current_user_owned_and_only: bool,
    pub(crate) sddl: String,
}

fn descriptor_sddl(descriptor: Pointer) -> Result<String, Box<dyn Error>> {
    let mut text = null_mut();
    if unsafe {
        ConvertSecurityDescriptorToStringSecurityDescriptorW(
            descriptor,
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

pub(crate) fn pipe_security(pipe: Pointer) -> Result<PipeSecurity, Box<dyn Error>> {
    let token = current_token(TOKEN_QUERY)?;
    let (_user, current_user_sid) = token_user(token.0)?;
    let expected = current_user_descriptor()?;
    let mut owner = null_mut();
    let mut descriptor = null_mut();
    let status = unsafe {
        GetSecurityInfo(
            pipe,
            SE_KERNEL_OBJECT,
            OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
            &mut owner,
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
    let sddl = descriptor_sddl(descriptor.as_ptr())?;
    Ok(PipeSecurity {
        current_user_owned_and_only: unsafe { EqualSid(owner, current_user_sid) } != 0
            && sddl == descriptor_sddl(expected.as_ptr())?,
        sddl,
    })
}

fn endpoint_security(endpoint: &str) -> Result<PipeSecurity, Box<dyn Error>> {
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
    pipe_security(pipe.0)
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
    let security = endpoint_security(endpoint)?;
    let sddl = security.sddl;
    let current_user_only = security.current_user_owned_and_only;
    let restricted_denied = restricted_connection_denied(endpoint, token.0, sid)?;
    println!(
        "{{\"currentUserOnly\":{current_user_only},\"currentUserSid\":\"{current_user_sid}\",\"restrictedConnectionDenied\":{restricted_denied},\"sddl\":\"{sddl}\"}}"
    );
    Ok(())
}
