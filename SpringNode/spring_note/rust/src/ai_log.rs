use chrono::Utc;
use serde_json::json;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

pub struct ApiNetworkLog<'a> {
    pub app_data_dir: &'a str,
    pub enabled: bool,
    pub provider_id: &'a str,
    pub provider_name: &'a str,
    pub protocol: &'a str,
    pub model_id: &'a str,
    pub purpose: &'a str,
    pub method: &'a str,
    pub url: &'a str,
    pub request_body: &'a str,
    pub response_status: Option<u16>,
    pub response_body: &'a str,
    pub duration_ms: u128,
    pub error: &'a str,
}

pub fn write_api_network_log(entry: ApiNetworkLog<'_>) {
    if !entry.enabled {
        return;
    }

    let directory = Path::new(entry.app_data_dir).join("logs");
    if fs::create_dir_all(&directory).is_err() {
        return;
    }

    let line = json!({
        "timestamp": Utc::now().to_rfc3339(),
        "providerId": entry.provider_id,
        "providerName": entry.provider_name,
        "protocol": entry.protocol,
        "modelId": entry.model_id,
        "purpose": entry.purpose,
        "method": entry.method,
        "url": entry.url,
        "requestBody": entry.request_body,
        "responseStatus": entry.response_status,
        "responseBody": entry.response_body,
        "durationMs": entry.duration_ms,
        "error": entry.error,
    })
    .to_string();

    let path = directory.join("api_network.log");
    let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) else {
        return;
    };
    let _ = writeln!(file, "{line}");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn writes_full_request_and_response_body() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("spring_note_api_log_{suffix}"));
        let app_data_dir = dir.to_string_lossy().to_string();

        write_api_network_log(ApiNetworkLog {
            app_data_dir: &app_data_dir,
            enabled: true,
            provider_id: "p",
            provider_name: "OpenAI",
            protocol: "openaiCompatible",
            model_id: "gpt-test",
            purpose: "test",
            method: "POST",
            url: "https://api.example.com/v1/chat/completions",
            request_body: r#"{"messages":[{"content":"完整请求"}]}"#,
            response_status: Some(200),
            response_body: r#"{"choices":[{"message":{"content":"完整响应"}}]}"#,
            duration_ms: 12,
            error: "",
        });

        let content = fs::read_to_string(dir.join("logs").join("api_network.log")).unwrap();
        assert!(content.contains("完整请求"));
        assert!(content.contains("完整响应"));
        fs::remove_dir_all(dir).ok();
    }

    #[test]
    fn writes_fim_request_and_response_body() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("spring_note_fim_api_log_{suffix}"));
        let app_data_dir = dir.to_string_lossy().to_string();

        write_api_network_log(ApiNetworkLog {
            app_data_dir: &app_data_dir,
            enabled: true,
            provider_id: "p",
            provider_name: "OpenAI Compatible",
            protocol: "openaiCompatible",
            model_id: "deepseek-v4-pro",
            purpose: "fim_edit_completion",
            method: "POST",
            url: "https://api.example.com/v1/completions",
            request_body: r#"{"model":"deepseek-v4-pro","prompt":"def fib(a):","suffix":"    return fib(a-1) + fib(a-2)","max_tokens":128}"#,
            response_status: Some(200),
            response_body: r#"{"choices":[{"text":"\n    if a <= 1:\n        return a"}]}"#,
            duration_ms: 12,
            error: "",
        });

        let content = fs::read_to_string(dir.join("logs").join("api_network.log")).unwrap();
        assert!(content.contains("fim_edit_completion"));
        assert!(content.contains("def fib(a):"));
        assert!(content.contains("return fib(a-1) + fib(a-2)"));
        assert!(content.contains("if a <= 1"));
        fs::remove_dir_all(dir).ok();
    }
}
