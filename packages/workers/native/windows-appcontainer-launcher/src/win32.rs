use crate::sandbox::Pointer;
use std::error::Error;
use std::mem::{size_of, zeroed};
use std::ptr::{null, null_mut};

pub(crate) const EXTENDED_STARTUPINFO_PRESENT: u32 = 0x0008_0000;
pub(crate) const CREATE_UNICODE_ENVIRONMENT: u32 = 0x0000_0400;
pub(crate) const CREATE_SUSPENDED: u32 = 0x0000_0004;
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;
pub(crate) const STARTF_USESTDHANDLES: u32 = 0x0000_0100;
pub(crate) const ATTRIBUTE_SECURITY_CAPABILITIES: usize = 0x0002_0009;
const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: u32 = 9;
const JOB_LIMIT_ACTIVE_PROCESS: u32 = 0x0000_0008;
const JOB_LIMIT_PROCESS_MEMORY: u32 = 0x0000_0100;
const JOB_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x0000_2000;
pub(crate) const INFINITE: u32 = u32::MAX;

#[repr(C)]
pub(crate) struct SidAndAttributes {
    sid: Pointer,
    attributes: u32,
}

#[repr(C)]
pub(crate) struct SecurityCapabilities {
    pub(crate) app_container_sid: Pointer,
    pub(crate) capabilities: *mut SidAndAttributes,
    pub(crate) capability_count: u32,
    pub(crate) reserved: u32,
}

#[repr(C)]
pub(crate) struct StartupInfo {
    pub(crate) cb: u32,
    reserved: *mut u16,
    desktop: *mut u16,
    title: *mut u16,
    x: u32,
    y: u32,
    x_size: u32,
    y_size: u32,
    x_count_chars: u32,
    y_count_chars: u32,
    fill_attribute: u32,
    pub(crate) flags: u32,
    show_window: u16,
    reserved_bytes: u16,
    reserved_data: *mut u8,
    pub(crate) stdin: Pointer,
    pub(crate) stdout: Pointer,
    pub(crate) stderr: Pointer,
}

#[repr(C)]
pub(crate) struct StartupInfoEx {
    pub(crate) startup: StartupInfo,
    pub(crate) attributes: Pointer,
}

#[repr(C)]
pub(crate) struct ProcessInformation {
    pub(crate) process: Pointer,
    pub(crate) thread: Pointer,
    process_id: u32,
    thread_id: u32,
}

#[repr(C)]
struct BasicLimitInformation {
    process_time: i64,
    job_time: i64,
    flags: u32,
    minimum_working_set: usize,
    maximum_working_set: usize,
    active_process_limit: u32,
    affinity: usize,
    priority_class: u32,
    scheduling_class: u32,
}

#[repr(C)]
struct IoCounters {
    values: [u64; 6],
}

#[repr(C)]
struct ExtendedLimitInformation {
    basic: BasicLimitInformation,
    io: IoCounters,
    process_memory_limit: usize,
    job_memory_limit: usize,
    peak_process_memory: usize,
    peak_job_memory: usize,
}

#[link(name = "kernel32")]
unsafe extern "system" {
    fn InitializeProcThreadAttributeList(
        list: Pointer,
        count: u32,
        flags: u32,
        size: *mut usize,
    ) -> i32;
    fn UpdateProcThreadAttribute(
        list: Pointer,
        flags: u32,
        attribute: usize,
        value: Pointer,
        size: usize,
        previous: Pointer,
        returned: Pointer,
    ) -> i32;
    fn DeleteProcThreadAttributeList(list: Pointer);
    pub(crate) fn CreateProcessW(
        application: *const u16,
        command: *mut u16,
        process_security: Pointer,
        thread_security: Pointer,
        inherit: i32,
        flags: u32,
        environment: Pointer,
        directory: *const u16,
        startup: *mut StartupInfo,
        information: *mut ProcessInformation,
    ) -> i32;
    fn CreateJobObjectW(attributes: Pointer, name: *const u16) -> Pointer;
    fn SetInformationJobObject(job: Pointer, class: u32, information: Pointer, length: u32) -> i32;
    pub(crate) fn AssignProcessToJobObject(job: Pointer, process: Pointer) -> i32;
    pub(crate) fn ResumeThread(thread: Pointer) -> u32;
    pub(crate) fn WaitForSingleObject(handle: Pointer, milliseconds: u32) -> u32;
    pub(crate) fn GetExitCodeProcess(process: Pointer, code: *mut u32) -> i32;
    pub(crate) fn TerminateProcess(process: Pointer, code: u32) -> i32;
    pub(crate) fn GetStdHandle(kind: u32) -> Pointer;
    fn CloseHandle(handle: Pointer) -> i32;
}

pub(crate) struct Handle(Pointer);

impl Handle {
    pub(crate) fn new(pointer: Pointer, action: &str) -> Result<Self, Box<dyn Error>> {
        if pointer.is_null() {
            return Err(last_error(action));
        }
        Ok(Self(pointer))
    }

    pub(crate) fn pointer(&self) -> Pointer {
        self.0
    }
}

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

pub(crate) struct AttributeList {
    storage: Vec<usize>,
    pointer: Pointer,
}

impl AttributeList {
    pub(crate) fn new(count: u32) -> Result<Self, Box<dyn Error>> {
        let mut bytes = 0;
        unsafe { InitializeProcThreadAttributeList(null_mut(), count, 0, &mut bytes) };
        let mut storage = vec![0_usize; bytes.div_ceil(size_of::<usize>())];
        let pointer = storage.as_mut_ptr().cast();
        if bytes == 0
            || unsafe { InitializeProcThreadAttributeList(pointer, count, 0, &mut bytes) } == 0
        {
            return Err(last_error("attribute-list initialization"));
        }
        Ok(Self { storage, pointer })
    }

    pub(crate) fn update<T>(
        &mut self,
        attribute: usize,
        value: &mut T,
    ) -> Result<(), Box<dyn Error>> {
        if unsafe {
            UpdateProcThreadAttribute(
                self.pointer,
                0,
                attribute,
                (value as *mut T).cast(),
                size_of::<T>(),
                null_mut(),
                null_mut(),
            )
        } == 0
        {
            return Err(last_error("process attribute update"));
        }
        Ok(())
    }

    pub(crate) fn pointer(&self) -> Pointer {
        self.pointer
    }
}

impl Drop for AttributeList {
    fn drop(&mut self) {
        let _ = self.storage.len();
        unsafe { DeleteProcThreadAttributeList(self.pointer) };
    }
}

pub(crate) fn last_error(action: &str) -> Box<dyn Error> {
    format!("{action} failed: {}", std::io::Error::last_os_error()).into()
}

pub(crate) fn job(memory_bytes: usize) -> Result<Handle, Box<dyn Error>> {
    let handle = unsafe { CreateJobObjectW(null_mut(), null()) };
    let handle = Handle::new(handle, "job creation")?;
    let mut limits: ExtendedLimitInformation = unsafe { zeroed() };
    limits.basic.flags =
        JOB_LIMIT_ACTIVE_PROCESS | JOB_LIMIT_PROCESS_MEMORY | JOB_LIMIT_KILL_ON_JOB_CLOSE;
    limits.basic.active_process_limit = 1;
    limits.process_memory_limit = memory_bytes;
    if unsafe {
        SetInformationJobObject(
            handle.0,
            JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
            (&mut limits as *mut ExtendedLimitInformation).cast(),
            size_of::<ExtendedLimitInformation>() as u32,
        )
    } == 0
    {
        return Err(last_error("job limit configuration"));
    }
    Ok(handle)
}
