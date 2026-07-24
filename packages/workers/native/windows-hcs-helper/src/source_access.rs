use crate::acl;
use std::error::Error;
use std::path::PathBuf;

pub struct SourceAccess {
    runtime_id: String,
    path: PathBuf,
    revoked: bool,
}

impl SourceAccess {
    pub fn new(runtime_id: String, path: PathBuf) -> Self {
        Self {
            runtime_id,
            path,
            revoked: false,
        }
    }

    pub fn revoke(mut self) -> Result<(), Box<dyn Error>> {
        acl::revoke(&self.runtime_id, &self.path)?;
        self.revoked = true;
        Ok(())
    }
}

impl Drop for SourceAccess {
    fn drop(&mut self) {
        if !self.revoked {
            let _ = acl::revoke(&self.runtime_id, &self.path);
        }
    }
}
