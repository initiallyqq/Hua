import type { ProviderConfig } from "../settings/types";
import type { CoWriteIdentity, CoWriteSession } from "./types";
import { buildCoWriteMessages } from "./prompts";

function getActiveApiConfig(providers: ProviderConfig[]): {
  apiUrl: string;
  apiKey: string;
  modelId: string;
} | null {
  const enabled = providers.filter(
    (p) => p.enabled && p.models.length > 0,
  );
  if (enabled.length === 0) return null;

  // 优先选 DeepSeek
  const ds = enabled.find((p) =>
    p.name.toLowerCase().includes("deepseek"),
  );
  const provider = ds ?? enabled[0];
  const model = provider.models[0];
  if (!model) return null;

  const apiUrl =
    provider.baseUrl.replace(/\/+$/, "") + provider.apiPath;

  return {
    apiUrl,
    apiKey: provider.apiKey,
    modelId: model.modelId,
  };
}

export async function requestCoWriteAITurn(
  session: CoWriteSession,
  identity: CoWriteIdentity,
  customPrompt: string | undefined,
  providers: ProviderConfig[],
): Promise<string> {
  const config = getActiveApiConfig(providers);
  if (!config) {
    throw new Error("没有可用的 AI 供应商，请先在设置中配置");
  }

  const messages = buildCoWriteMessages(session, identity, customPrompt);
  console.log("[coWriteAI] request", { url: config.apiUrl, model: config.modelId, messages });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.modelId,
      messages,
      stream: false,
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  console.log("[coWriteAI] response status", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[coWriteAI] response error body", errorText);
    throw new Error(`AI 响应错误 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log("[coWriteAI] response data", data);

  const content: string =
    data.choices?.[0]?.message?.content ?? "（未收到回复）";

  console.log("[coWriteAI] extracted content", content);
  return content.trim();
}
