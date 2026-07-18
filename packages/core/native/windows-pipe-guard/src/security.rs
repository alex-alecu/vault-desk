use std::error::Error;
use std::ffi::{OsStr, c_void};
use std::mem::size_of;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;

pub(crate) type Pointer = *mut c_void;

const TOKEN_QUERY: u32 = 0x0008;
const TOKEN_USER: u32 = 1;

#[repr(C)]
pub(crate) struct SidAndAttributes {
    pub(crate) sid: Pointer,
    pub(crate) attributes: u32,
}

#[repr(C)]
struct TokenUser {
    user: SidAndAttributes,
}

#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetCurrentProcess() -> Pointer;
    fn CloseHandle(handle: Pointer) -> i32;
    fn LocalFree(memory: Pointer) -> Pointer;
}

#[link(name = "advapi32")]
unsafe extern "system" {
    fn OpenProcessToken(process: Pointer, access: u32, token: *mut Pointer) -> i32;
    fn GetTokenInformation(
        token: Pointer,
        class: u32,
        information: Pointer,
        length: u32,
        return_length: *mut u32,
    ) -> i32;
    fn ConvertSidToStringSidW(sid: Pointer, text: *mut *mut u16) -> i32;
    fn ConvertStringSecurityDescriptorToSecurityDescriptorW(
        text: *const u16,
        revision: u32,
        descriptor: *mut Pointer,
        size: *mut u32,
    ) -> i32;
}

pub struct SecurityDescriptor(Pointer);

impl SecurityDescriptor {
    pub(crate) fn new(value: Pointer) -> Self {
        Self(value)
    }

    pub fn as_ptr(&self) -> Pointer {
        self.0
    }
}

pub(crate) struct Handle(pub(crate) Pointer);

impl Handle {
    pub(crate) fn new(value: Pointer, action: &str) -> Result<Self, Box<dyn Error>> {
        if value.is_null() || value == invalid_handle() {
            return Err(last_error(action));
        }
        Ok(Self(value))
    }
}

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

impl Drop for SecurityDescriptor {
    fn drop(&mut self) {
        unsafe { LocalFree(self.0) };
    }
}

pub(crate) fn invalid_handle() -> Pointer {
    usize::MAX as Pointer
}

pub(crate) fn last_error(action: &str) -> Box<dyn Error> {
    format!("{action} failed: {}", std::io::Error::last_os_error()).into()
}

pub(crate) fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

pub(crate) fn wide_text(value: *const u16) -> String {
    let mut length = 0;
    unsafe {
        while *value.add(length) != 0 {
            length += 1;
        }
        String::from_utf16_lossy(std::slice::from_raw_parts(value, length))
    }
}

pub(crate) fn current_token(access: u32) -> Result<Handle, Box<dyn Error>> {
    let mut token = null_mut();
    if unsafe { OpenProcessToken(GetCurrentProcess(), access, &mut token) } == 0 {
        return Err(last_error("current token open"));
    }
    Handle::new(token, "current token open")
}

pub(crate) fn token_user(token: Pointer) -> Result<(Vec<u64>, Pointer), Box<dyn Error>> {
    let mut bytes = 0;
    unsafe { GetTokenInformation(token, TOKEN_USER, null_mut(), 0, &mut bytes) };
    let mut buffer = vec![0_u64; (bytes as usize).div_ceil(size_of::<u64>())];
    if bytes == 0
        || unsafe {
            GetTokenInformation(
                token,
                TOKEN_USER,
                buffer.as_mut_ptr().cast(),
                bytes,
                &mut bytes,
            )
        } == 0
    {
        return Err(last_error("token user query"));
    }
    let sid = unsafe { (*(buffer.as_ptr().cast::<TokenUser>())).user.sid };
    Ok((buffer, sid))
}

pub(crate) fn sid_string(sid: Pointer) -> Result<String, Box<dyn Error>> {
    let mut text = null_mut();
    if unsafe { ConvertSidToStringSidW(sid, &mut text) } == 0 {
        return Err(last_error("SID conversion"));
    }
    let text = SecurityDescriptor(text.cast());
    Ok(wide_text(text.0.cast()))
}

pub fn current_user_descriptor() -> Result<SecurityDescriptor, Box<dyn Error>> {
    let token = current_token(TOKEN_QUERY)?;
    let (_user, sid) = token_user(token.0)?;
    let sddl = wide(OsStr::new(&format!("D:P(A;;GA;;;{})", sid_string(sid)?)));
    let mut descriptor = null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            1,
            &mut descriptor,
            null_mut(),
        )
    } == 0
    {
        return Err(last_error("security descriptor construction"));
    }
    Ok(SecurityDescriptor(descriptor))
}
