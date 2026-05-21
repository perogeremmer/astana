use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

use crate::db;

// Global session storage
pub struct SessionStore {
    sessions: Mutex<HashMap<String, db::Session>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self { sessions: Mutex::new(HashMap::new()) }
    }

    pub fn create_session(&self, user_id: i64, username: String, role: String) -> String {
        let token = Uuid::new_v4().to_string();
        let expires_at = chrono::Utc::now().timestamp() + (8 * 60 * 60);
        let session = db::Session { user_id, username, role, token: token.clone(), expires_at };
        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(token.clone(), session);
        token
    }

    pub fn get_session(&self, token: &str) -> Option<db::Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions.get(token).cloned()
    }

    pub fn remove_session(&self, token: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(token);
    }

    pub fn is_valid(&self, token: &str) -> bool {
        if let Some(session) = self.get_session(token) {
            let now = chrono::Utc::now().timestamp();
            session.expires_at > now
        } else { false }
    }

    pub fn cleanup_expired(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        sessions.retain(|_, session| session.expires_at > now);
    }
}

// Global store untuk Superadmin_0 password yang di-generate
pub struct FirstRunState {
    pub superadmin_password: Mutex<Option<String>>,
}

impl FirstRunState {
    pub fn new() -> Self {
        Self { superadmin_password: Mutex::new(None) }
    }

    pub fn set_password(&self, password: String) {
        let mut pwd = self.superadmin_password.lock().unwrap();
        *pwd = Some(password);
    }

    pub fn get_and_clear_password(&self) -> Option<String> {
        let mut pwd = self.superadmin_password.lock().unwrap();
        pwd.take()
    }
}
