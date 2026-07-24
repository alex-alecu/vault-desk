use std::error::Error;
use std::ffi::{OsStr, c_void};
use std::mem::size_of;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::ptr::null_mut;

const SE_FILE_OBJECT: u32 = 1;
const DACL_SECURITY_INFORMATION: u32 = 4;
const GRANT_ACCESS: u32 = 1;
const REVOKE_ACCESS: u32 = 4;
const SUB_CONTAINERS_AND_OBJECTS_INHERIT: u32 = 3;
const FILE_GENERIC_READ: u32 = 0x0012_0089;
const FILE_GENERIC_EXECUTE: u32 = 0x0012_00a0;
const FILE_ALL_ACCESS: u32 = 0x001f_01ff;

type Pointer = *mut c_void;

#[repr(C)]
struct Trustee {
    multiple_trustee: *mut Trustee,
    multiple_trustee_operation: u32,
    trustee_form: u32,
    trustee_type: u32,
    name: *mut u16,
}

#[repr(C)]
struct ExplicitAccess {
    permissions: u32,
    access_mode: u32,
    inheritance: u32,
    trustee: Trustee,
}

#[link(name = "advapi32")]
unsafe extern "system" {
    fn LookupAccountNameW(
        system_name: *const u16,
        account_name: *const u16,
        sid: Pointer,
        sid_size: *mut u32,
        domain: *mut u16,
        domain_size: *mut u32,
        sid_type: *mut u32,
    ) -> i32;
    fn GetNamedSecurityInfoW(
        name: *const u16,
        object_type: u32,
        security_information: u32,
        owner: *mut Pointer,
        group: *mut Pointer,
        dacl: *mut Pointer,
        sacl: *mut Pointer,
        descriptor: *mut Pointer,
    ) -> u32;
    fn SetEntriesInAclW(
        entry_count: u32,
        entries: *const ExplicitAccess,
        old_acl: Pointer,
        new_acl: *mut Pointer,
    ) -> u32;
    fn SetNamedSecurityInfoW(
        name: *mut u16,
        object_type: u32,
        security_information: u32,
        owner: Pointer,
        group: Pointer,
        dacl: Pointer,
        sacl: Pointer,
    ) -> u32;
}

#[link(name = "kernel32")]
unsafe extern "system" {
    fn LocalFree(memory: Pointer) -> Pointer;
}

struct LocalMemory(Pointer);

impl Drop for LocalMemory {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { LocalFree(self.0) };
        }
    }
}

fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

fn succeeded(status: u32, action: &str) -> Result<(), Box<dyn Error>> {
    if status == 0 {
        return Ok(());
    }
    Err(format!(
        "{action} failed: {}",
        std::io::Error::from_raw_os_error(status as i32)
    )
    .into())
}

fn virtual_machine_sid(runtime_id: &str) -> Result<Vec<u32>, Box<dyn Error>> {
    let account = wide(OsStr::new(&format!("NT VIRTUAL MACHINE\\{runtime_id}")));
    let mut sid_size = 0;
    let mut domain_size = 0;
    let mut sid_type = 0;
    unsafe {
        LookupAccountNameW(
            null_mut(),
            account.as_ptr(),
            null_mut(),
            &mut sid_size,
            null_mut(),
            &mut domain_size,
            &mut sid_type,
        )
    };
    if sid_size == 0 {
        return Err(format!(
            "VM account lookup failed: {}",
            std::io::Error::last_os_error()
        )
        .into());
    }
    let mut sid = vec![0_u32; (sid_size as usize).div_ceil(size_of::<u32>())];
    let mut domain = vec![0_u16; domain_size as usize];
    if unsafe {
        LookupAccountNameW(
            null_mut(),
            account.as_ptr(),
            sid.as_mut_ptr().cast(),
            &mut sid_size,
            domain.as_mut_ptr(),
            &mut domain_size,
            &mut sid_type,
        )
    } == 0
    {
        return Err(format!(
            "VM account lookup failed: {}",
            std::io::Error::last_os_error()
        )
        .into());
    }
    Ok(sid)
}

fn update(
    runtime_id: &str,
    path: &Path,
    permissions: u32,
    access_mode: u32,
    inheritance: u32,
) -> Result<(), Box<dyn Error>> {
    let mut path = wide(path.canonicalize()?.as_os_str());
    let mut descriptor = null_mut();
    let mut old_acl = null_mut();
    succeeded(
        unsafe {
            GetNamedSecurityInfoW(
                path.as_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                null_mut(),
                null_mut(),
                &mut old_acl,
                null_mut(),
                &mut descriptor,
            )
        },
        "file ACL query",
    )?;
    let _descriptor = LocalMemory(descriptor);

    let mut sid = virtual_machine_sid(runtime_id)?;
    let entry = ExplicitAccess {
        permissions,
        access_mode,
        inheritance,
        trustee: Trustee {
            multiple_trustee: null_mut(),
            multiple_trustee_operation: 0,
            trustee_form: 0,
            trustee_type: 0,
            name: sid.as_mut_ptr().cast(),
        },
    };
    let mut new_acl = null_mut();
    succeeded(
        unsafe { SetEntriesInAclW(1, &entry, old_acl, &mut new_acl) },
        "VM ACL construction",
    )?;
    let _new_acl = LocalMemory(new_acl);
    succeeded(
        unsafe {
            SetNamedSecurityInfoW(
                path.as_mut_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                null_mut(),
                null_mut(),
                new_acl,
                null_mut(),
            )
        },
        "VM file permission grant",
    )
}

pub fn grant_read(runtime_id: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    update(runtime_id, path, FILE_GENERIC_READ, GRANT_ACCESS, 0)
}

pub fn grant_traverse(runtime_id: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    update(
        runtime_id,
        path,
        FILE_GENERIC_READ | FILE_GENERIC_EXECUTE,
        GRANT_ACCESS,
        0,
    )
}

pub fn grant_full(runtime_id: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    update(runtime_id, path, FILE_ALL_ACCESS, GRANT_ACCESS, 0)
}

pub fn grant_tree_read(runtime_id: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    update(
        runtime_id,
        path,
        FILE_GENERIC_READ | FILE_GENERIC_EXECUTE,
        GRANT_ACCESS,
        SUB_CONTAINERS_AND_OBJECTS_INHERIT,
    )
}

pub fn revoke(runtime_id: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    update(runtime_id, path, 0, REVOKE_ACCESS, 0)
}
