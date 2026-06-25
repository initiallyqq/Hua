use super::{AuthorBlock, CoWriteSession};

fn system_prompt_for_identity(identity: &str, custom_prompt: Option<&str>) -> String {
    if identity == "custom" {
        return custom_prompt.unwrap_or("").to_string();
    }

    let (title, rules) = match identity {
        "questioner" => (
            "追问者",
            "1. 你只能写一个问题，一个句子即可。\n2. 问题要精准，指向对方没说清楚或可以深挖的地方。\n3. 不要评价，不要回答自己的问题。只提问。\n4. 一个问句后停笔，让对方回答并继续。",
        ),
        "opposer" => (
            "反对者",
            "1. 你只能写一段，1-2 句反例或质疑。\n2. 礼貌但锐利，指出对方论述中的漏洞或另一种可能性。\n3. 不要人身攻击，不要评价文笔。你是在帮助推敲。\n4. 一段后停笔，让对方回应。",
        ),
        "poetic" => (
            "诗意者",
            "1. 你只能写一段，1-2 句富有诗意的描写。\n2. 打破对方可能的严肃或平淡，加入意象和画面感。\n3. 不要变成口号或鸡汤，要具体、有画面。\n4. 保持和原文一致的语种和基本语调。\n5. 一段后停笔。",
        ),
        _ => (
            "续写者",
            "1. 你只能写一段，一段 1-3 句话。\n2. 顺着对方的内容和风格自然延续，保持一致的语调。\n3. 写出对方意料之外但情理之中的内容。\n4. 不要评价对方的文字，也不要回答问题——你是来一起写的，不是来对话的。\n5. 不要使用\"我觉得\"\"我认为\"等主观开头，直接写内容。\n6. 一段写完后停笔，让对方继续。",
        ),
    };

    format!(
        "你是一个共笔搭档，正在和一位写作者共用一张纸写作。\n你的身份是：{}\n\n写作规则：\n{}",
        title, rules
    )
}

fn blocks_to_tagged_text(blocks: &[AuthorBlock]) -> String {
    blocks
        .iter()
        .map(|block| {
            let tag = if block.author == "human" {
                "human"
            } else {
                "ai"
            };
            format!("<{}>{}</{}>", tag, block.text, tag)
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

pub fn build_co_write_messages(session: &CoWriteSession) -> Vec<serde_json::Value> {
    let system_prompt =
        system_prompt_for_identity(&session.identity, session.custom_prompt.as_deref());
    let full_text = blocks_to_tagged_text(&session.blocks);

    let user_message = if full_text.is_empty() {
        "开始写第一段吧。".to_string()
    } else {
        format!(
            "当前全文（<human> 是人写的，<ai> 是 AI 之前写的，交替标注）：\n\n{}\n\n轮到你了，写下一段：",
            full_text
        )
    };

    vec![
        serde_json::json!({ "role": "system", "content": system_prompt }),
        serde_json::json!({ "role": "user", "content": user_message }),
    ]
}
