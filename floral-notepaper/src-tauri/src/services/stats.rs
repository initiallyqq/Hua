use crate::services::notes::{default_store, AppError};
use chrono::{Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayActivity {
    pub date: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayUsage {
    pub date: String,
    pub total_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
    pub provider_tokens: BTreeMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageLogEntry {
    pub date: String,
    pub provider: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsData {
    pub daily_activity: Vec<DayActivity>,
    pub token_usage: Vec<DayUsage>,
    pub total_summaries: u64,
}

fn usage_log_path() -> Result<std::path::PathBuf, AppError> {
    Ok(default_store()?.base_dir.join("usage_log.json"))
}

fn load_usage_log() -> Result<Vec<UsageLogEntry>, AppError> {
    let path = usage_log_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| AppError {
        code: "io".into(),
        message: e.to_string(),
        details: Default::default(),
    })?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&content).map_err(|e| AppError {
        code: "parse".into(),
        message: e.to_string(),
        details: Default::default(),
    })
}

fn save_usage_log(log: &[UsageLogEntry]) -> Result<(), AppError> {
    let path = usage_log_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| AppError {
            code: "io".into(),
            message: e.to_string(),
            details: Default::default(),
        })?;
    }
    let json = serde_json::to_string_pretty(log).map_err(|e| AppError {
        code: "serialize".into(),
        message: e.to_string(),
        details: Default::default(),
    })?;
    std::fs::write(&path, json).map_err(|e| AppError {
        code: "io".into(),
        message: e.to_string(),
        details: Default::default(),
    })
}

fn format_date(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

pub fn get_stats() -> Result<StatsData, AppError> {
    let store = default_store()?;
    let notes = store.list_notes()?;

    // Build daily activity map from note created_at timestamps
    let now = Utc::now();
    let today = now.date_naive();
    let start = today - Duration::days(364);

    let mut activity_map: BTreeMap<String, u32> = BTreeMap::new();
    for d in 0..365 {
        let date = start + Duration::days(d);
        activity_map.insert(format_date(date), 0);
    }

    for note in &notes {
        let created = note.created_at.date_naive();
        let updated = note.updated_at.date_naive();
        if created >= start {
            let key = format_date(created);
            *activity_map.entry(key).or_insert(0) += 1;
        }
        // Also count update days (skip if same as created)
        if updated != created && updated >= start {
            let key = format_date(updated);
            *activity_map.entry(key).or_insert(0) += 1;
        }
    }

    let daily_activity: Vec<DayActivity> = (0..365)
        .map(|d| {
            let date = start + Duration::days(d);
            let key = format_date(date);
            DayActivity {
                date: key,
                count: *activity_map.get(&format_date(date)).unwrap_or(&0),
            }
        })
        .collect();

    // Load usage log and aggregate by day
    let usage_log = load_usage_log()?;
    let mut usage_map: BTreeMap<String, DayUsage> = BTreeMap::new();

    for entry in &usage_log {
        let day = usage_map
            .entry(entry.date.clone())
            .or_insert_with(|| DayUsage {
                date: entry.date.clone(),
                total_tokens: 0,
                input_tokens: 0,
                output_tokens: 0,
                cached_tokens: 0,
                provider_tokens: BTreeMap::new(),
            });
        day.input_tokens += entry.input_tokens;
        day.output_tokens += entry.output_tokens;
        day.cached_tokens += entry.cached_tokens;
        day.total_tokens += entry.input_tokens + entry.output_tokens + entry.cached_tokens;
        *day.provider_tokens
            .entry(entry.provider.clone())
            .or_insert(0) += entry.input_tokens + entry.output_tokens + entry.cached_tokens;
    }

    let token_usage: Vec<DayUsage> = usage_map.into_values().collect();
    let total_summaries = usage_log.len() as u64;

    Ok(StatsData {
        daily_activity,
        token_usage,
        total_summaries,
    })
}

pub fn log_usage(
    provider: String,
    input_tokens: u64,
    output_tokens: u64,
    cached_tokens: u64,
) -> Result<(), AppError> {
    let now = Utc::now();
    let date = format_date(now.date_naive());

    let mut log = load_usage_log()?;
    log.push(UsageLogEntry {
        date,
        provider,
        input_tokens,
        output_tokens,
        cached_tokens,
    });
    save_usage_log(&log)
}
