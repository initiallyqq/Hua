use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::PathBuf};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::services::notes::{default_store, AppError};

mod ai_client;
mod prompts;

pub use ai_client::request_ai_turn;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AuthorBlock {
    pub author: String,
    pub text: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CoWriteSession {
    pub id: String,
    pub note_id: String,
    pub identity: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_prompt: Option<String>,
    #[serde(default)]
    pub blocks: Vec<AuthorBlock>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CoWriteSessionSummary {
    pub id: String,
    pub note_id: String,
    pub identity: String,
    pub block_count: usize,
    pub preview: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn cowrite_dir() -> Result<PathBuf, AppError> {
    let store = default_store()?;
    Ok(store.base_dir().join("cowrite"))
}

fn session_path(session_id: &str) -> Result<PathBuf, AppError> {
    Ok(cowrite_dir()?.join(format!("{session_id}.json")))
}

fn ensure_cowrite_dir() -> Result<(), AppError> {
    fs::create_dir_all(cowrite_dir()?)?;
    Ok(())
}

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn create_session(
    note_id: &str,
    identity: &str,
    custom_prompt: Option<&str>,
) -> Result<CoWriteSession, AppError> {
    ensure_cowrite_dir()?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let session = CoWriteSession {
        id: id.clone(),
        note_id: note_id.to_string(),
        identity: identity.to_string(),
        custom_prompt: custom_prompt.map(str::to_string),
        blocks: vec![],
        created_at: now,
        updated_at: now,
    };

    save_session(&session)?;
    Ok(session)
}

pub fn save_session(session: &CoWriteSession) -> Result<(), AppError> {
    ensure_cowrite_dir()?;
    let path = session_path(&session.id)?;
    let json = serde_json::to_string_pretty(session)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn get_session(session_id: &str) -> Result<CoWriteSession, AppError> {
    let path = session_path(session_id)?;
    if !path.exists() {
        return Err(AppError {
            code: "sessionNotFound".into(),
            message: format!("共笔会话 {session_id} 不存在"),
            details: BTreeMap::new(),
        });
    }
    let json = fs::read_to_string(&path)?;
    let session: CoWriteSession = serde_json::from_str(&json)?;
    Ok(session)
}

pub fn list_sessions(note_id: &str) -> Result<Vec<CoWriteSessionSummary>, AppError> {
    ensure_cowrite_dir()?;
    let dir = cowrite_dir()?;
    let mut sessions = Vec::new();

    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let Ok(json) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(session): Result<CoWriteSession, _> = serde_json::from_str(&json) else {
            continue;
        };

        if session.note_id != note_id {
            continue;
        }

        let preview = session
            .blocks
            .first()
            .map(|b| {
                let trimmed = b.text.trim();
                if trimmed.len() > 60 {
                    format!("{}…", &trimmed[..60])
                } else {
                    trimmed.to_string()
                }
            })
            .unwrap_or_default();

        sessions.push(CoWriteSessionSummary {
            id: session.id,
            note_id: session.note_id,
            identity: session.identity,
            block_count: session.blocks.len(),
            preview,
            created_at: session.created_at,
            updated_at: session.updated_at,
        });
    }

    sessions.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    Ok(sessions)
}

pub fn append_human_text(session_id: &str, text: &str) -> Result<CoWriteSession, AppError> {
    let mut session = get_session(session_id)?;
    session.blocks.push(AuthorBlock {
        author: "human".to_string(),
        text: text.to_string(),
        timestamp: now_ms(),
    });
    session.updated_at = Utc::now();
    save_session(&session)?;
    Ok(session)
}

pub fn append_ai_text(session_id: &str, text: &str) -> Result<CoWriteSession, AppError> {
    let mut session = get_session(session_id)?;
    session.blocks.push(AuthorBlock {
        author: "ai".to_string(),
        text: text.to_string(),
        timestamp: now_ms(),
    });
    session.updated_at = Utc::now();
    save_session(&session)?;
    Ok(session)
}

pub fn merge_to_note(
    app: &AppHandle,
    session_id: &str,
    selected_block_indices: &[usize],
) -> Result<String, AppError> {
    let session = get_session(session_id)?;
    let store = default_store()?;
    let note = store.read_note(&session.note_id)?;

    let mut selected_texts: Vec<String> = Vec::new();
    for &idx in selected_block_indices {
        if let Some(block) = session.blocks.get(idx) {
            selected_texts.push(block.text.clone());
        }
    }

    let merged = selected_texts.join("\n\n");
    let new_content = if note.content.is_empty() {
        merged.clone()
    } else {
        format!("{}\n\n{}", note.content, merged)
    };

    store.update_note(
        &session.note_id,
        crate::services::notes::SaveNoteRequest {
            title: note.title,
            content: new_content.clone(),
            category: note.category,
        },
    )?;

    let _ = app.emit("notes-changed", ());
    Ok(new_content)
}

pub fn delete_session(session_id: &str) -> Result<(), AppError> {
    let path = session_path(session_id)?;
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
}
