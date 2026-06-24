import { useState, useMemo, useCallback } from "react";
import type { ProviderConfig, ModelConfig } from "../features/settings/types";

interface ModelProviderPageProps {
  providers: ProviderConfig[];
  onProvidersChange: (providers: ProviderConfig[]) => void;
}

const PROTOCOL_OPTIONS = [
  { value: "openaiCompatible", label: "OpenAI Compatible" },
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "gemini", label: "Gemini (Google)" },
];

function makeId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

function defaultBaseUrl(protocol: string): string {
  switch (protocol) {
    case "gemini": return "https://generativelanguage.googleapis.com";
    case "claude": return "https://api.anthropic.com";
    default: return "https://api.openai.com/v1";
  }
}

function defaultApiPath(protocol: string): string {
  switch (protocol) {
    case "claude": return "/v1/messages";
    case "gemini": return "";
    default: return "/chat/completions";
  }
}

function providerTemplate(template: string): ProviderConfig {
  const normalized = template.toLowerCase();
  if (normalized === "google" || normalized === "gemini") {
    return {
      id: makeId("Google"),
      enabled: true,
      name: "Google",
      protocol: "gemini",
      apiKey: "",
      baseUrl: "https://generativelanguage.googleapis.com",
      apiPath: "",
      models: [{ modelId: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" }],
    };
  }
  if (normalized === "claude") {
    return {
      id: makeId("Claude"),
      enabled: true,
      name: "Claude",
      protocol: "claude",
      apiKey: "",
      baseUrl: "https://api.anthropic.com",
      apiPath: "/v1/messages",
      models: [{ modelId: "claude-sonnet-4", displayName: "Claude Sonnet 4" }],
    };
  }
  return {
    id: makeId("OpenAI"),
    enabled: true,
    name: "OpenAI",
    protocol: "openaiCompatible",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    apiPath: "/chat/completions",
    models: [{ modelId: "gpt-4.1-mini", displayName: "GPT-4.1 Mini" }],
  };
}

export function ModelProviderPage({ providers, onProvidersChange }: ModelProviderPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    providers.length > 0 ? providers[0].id : null,
  );
  const [showAddDialog, setShowAddDialog] = useState(false);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedId) ?? null,
    [providers, selectedId],
  );

  const filteredProviders = useMemo(
    () => providers.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [providers, searchQuery],
  );

  const handleUpdateProvider = useCallback(
    (updated: ProviderConfig) => {
      onProvidersChange(
        providers.map((p) => (p.id === updated.id ? updated : p)),
      );
    },
    [providers, onProvidersChange],
  );

  const handleDeleteProvider = useCallback(
    (id: string) => {
      const next = providers.filter((p) => p.id !== id);
      onProvidersChange(next);
      if (selectedId === id) {
        setSelectedId(next.length > 0 ? next[0].id : null);
      }
    },
    [providers, onProvidersChange, selectedId],
  );

  const handleAddProvider = useCallback(
    (template: string) => {
      const provider = providerTemplate(template);
      onProvidersChange([...providers, provider]);
      setSelectedId(provider.id);
      setShowAddDialog(false);
    },
    [providers, onProvidersChange],
  );

  const handleAddCustomProvider = useCallback(() => {
    const provider: ProviderConfig = {
      id: makeId("Custom"),
      enabled: true,
      name: "自定义供应商",
      protocol: "openaiCompatible",
      apiKey: "",
      baseUrl: "",
      apiPath: "/chat/completions",
      models: [],
    };
    onProvidersChange([...providers, provider]);
    setSelectedId(provider.id);
    setShowAddDialog(false);
  }, [providers, onProvidersChange]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-cloud/60">
      <div className="flex items-center justify-between h-11 px-5 border-b border-paper-deep/25 shrink-0 bg-paper/30">
        <h2 className="text-[13px] font-display font-medium text-ink-soft flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bamboo">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01" />
          </svg>
          模型供应商配置
        </h2>
        <span className="text-[10px] text-ink-ghost font-mono">
          {providers.length} 个供应商
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* 左侧供应商列表 */}
        <div className="w-[280px] shrink-0 border-r border-paper-deep/25 flex flex-col bg-paper/20">
          <div className="p-3 pb-2">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 focus-within:border-bamboo/30 transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink-ghost shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索供应商..."
                className="flex-1 text-[12px] font-body text-ink placeholder:text-ink-ghost/60 bg-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-ink-ghost hover:text-ink-faint transition-colors cursor-pointer">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filteredProviders.length === 0 ? (
              <div className="px-3 py-8 text-center text-[12px] text-ink-ghost">
                {searchQuery ? "没有匹配的供应商" : "暂无供应商，点击下方添加"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProviders.map((provider) => {
                  const isSelected = provider.id === selectedId;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedId(provider.id)}
                      className={`
                        w-full text-left rounded-lg px-3 py-2.5 transition-all duration-200 cursor-pointer group
                        ${isSelected
                          ? "bg-bamboo-mist/70"
                          : "hover:bg-paper-warm/70"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                          provider.enabled
                            ? "bg-bamboo/10 text-bamboo"
                            : "bg-paper-deep/30 text-ink-ghost"
                        }`}>
                          {provider.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[12px] font-medium truncate ${isSelected ? "text-bamboo" : "text-ink-soft"}`}>
                              {provider.name}
                            </span>
                            {!provider.enabled && (
                              <span className="text-[9px] text-ink-ghost bg-paper-deep/30 px-1.5 py-0.5 rounded-full">停用</span>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-ghost font-mono truncate mt-0.5">
                            {provider.protocol} · {provider.models.length} 模型
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 pt-2 border-t border-paper-deep/25">
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-paper-deep/45 text-[11px] text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 hover:border-bamboo/30 transition-all cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加供应商
            </button>
          </div>
        </div>

        {/* 右侧供应商详情 */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {selectedProvider ? (
            <ProviderDetail
              provider={selectedProvider}
              onUpdate={handleUpdateProvider}
              onDelete={handleDeleteProvider}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13px] text-ink-ghost">
              选择一个供应商查看详情
            </div>
          )}
        </div>
      </div>

      {/* 添加供应商对话框 */}
      {showAddDialog && (
        <AddProviderDialog
          onSelect={handleAddProvider}
          onAddCustom={handleAddCustomProvider}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

/* ─── 添加供应商对话框 ─── */
interface AddProviderDialogProps {
  onSelect: (template: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

function AddProviderDialog({ onSelect, onAddCustom, onClose }: AddProviderDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[380px] bg-cloud rounded-2xl border border-paper-deep/40 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-paper-deep/25">
          <h3 className="text-[13px] font-display font-medium text-ink-soft">添加供应商</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-[11px] text-ink-ghost mb-3">选择一个预设供应商，或创建自定义配置</p>
          <button
            onClick={() => onSelect("openai")}
            className="w-full text-left px-4 py-3 rounded-xl border border-paper-deep/30 hover:border-bamboo/30 hover:bg-bamboo-mist/40 transition-all cursor-pointer group"
          >
            <div className="font-medium text-[13px] text-ink-soft group-hover:text-bamboo transition-colors">OpenAI</div>
            <div className="text-[11px] text-ink-ghost mt-0.5">api.openai.com · GPT-4.1 Mini</div>
          </button>
          <button
            onClick={() => onSelect("claude")}
            className="w-full text-left px-4 py-3 rounded-xl border border-paper-deep/30 hover:border-bamboo/30 hover:bg-bamboo-mist/40 transition-all cursor-pointer group"
          >
            <div className="font-medium text-[13px] text-ink-soft group-hover:text-bamboo transition-colors">Claude (Anthropic)</div>
            <div className="text-[11px] text-ink-ghost mt-0.5">api.anthropic.com · Claude Sonnet 4</div>
          </button>
          <button
            onClick={() => onSelect("gemini")}
            className="w-full text-left px-4 py-3 rounded-xl border border-paper-deep/30 hover:border-bamboo/30 hover:bg-bamboo-mist/40 transition-all cursor-pointer group"
          >
            <div className="font-medium text-[13px] text-ink-soft group-hover:text-bamboo transition-colors">Google Gemini</div>
            <div className="text-[11px] text-ink-ghost mt-0.5">generativelanguage.googleapis.com · Gemini 2.5 Flash</div>
          </button>
          <div className="pt-2 border-t border-paper-deep/20">
            <button
              onClick={onAddCustom}
              className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-paper-deep/40 hover:border-bamboo/30 hover:bg-bamboo-mist/30 transition-all cursor-pointer group"
            >
              <div className="font-medium text-[13px] text-ink-ghost group-hover:text-ink-soft transition-colors flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                自定义供应商
              </div>
              <div className="text-[11px] text-ink-ghost/60 mt-0.5 ml-6">手动配置 API 地址和模型</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 供应商详情面板 ─── */
interface ProviderDetailProps {
  provider: ProviderConfig;
  onUpdate: (provider: ProviderConfig) => void;
  onDelete: (id: string) => void;
}

function ProviderDetail({ provider, onUpdate, onDelete }: ProviderDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bamboo/10 flex items-center justify-center text-[16px] font-bold text-bamboo">
            {provider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-display font-bold text-ink">{provider.name}</h3>
              <span className="px-2 py-0.5 rounded-full bg-paper-deep/30 text-[9px] font-mono text-ink-ghost/70">
                {provider.protocol}
              </span>
            </div>
            <p className="text-[11px] text-ink-ghost mt-0.5">{provider.models.length} 个模型 · {provider.enabled ? "已启用" : "已停用"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={provider.enabled}
              onChange={(e) => onUpdate({ ...provider, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-[18px] rounded-full transition-colors duration-250 bg-paper-deep/50 peer-checked:bg-bamboo peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[14px] after:h-[14px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.15)] after:transition-transform after:duration-250" />
          </label>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 animate-fade-in">
              <button
                onClick={() => { onDelete(provider.id); setShowDeleteConfirm(false); }}
                className="px-2.5 h-7 rounded-md text-[11px] text-cloud bg-red-400 hover:bg-red-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                确认删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 h-7 rounded-md text-[11px] text-ink-faint hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-red-400 hover:bg-danger-bg transition-all cursor-pointer"
              title="删除供应商"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 配置表单 */}
      <div className="space-y-4 max-w-[640px]">
        <TextField
          label="名称"
          value={provider.name}
          onChange={(value) => onUpdate({ ...provider, name: value })}
          placeholder="供应商名称"
        />

        <div>
          <label className="block text-[11px] font-mono text-ink-faint mb-1.5">协议</label>
          <div className="flex gap-2">
            {PROTOCOL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate({
                  ...provider,
                  protocol: opt.value,
                  baseUrl: defaultBaseUrl(opt.value),
                  apiPath: defaultApiPath(opt.value),
                })}
                className={`px-3 h-8 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                  provider.protocol === opt.value
                    ? "bg-bamboo/10 text-bamboo border border-bamboo/30"
                    : "bg-paper-warm/50 text-ink-faint border border-paper-deep/30 hover:text-ink-soft hover:bg-paper-warm"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <TextField
          label="API Key"
          value={provider.apiKey}
          onChange={(value) => onUpdate({ ...provider, apiKey: value })}
          placeholder="sk-..."
          secret={!showApiKey}
          onToggleSecret={() => setShowApiKey(!showApiKey)}
        />

        <TextField
          label="API Base URL"
          value={provider.baseUrl}
          onChange={(value) => onUpdate({ ...provider, baseUrl: value })}
          placeholder="https://api.openai.com/v1"
        />

        <TextField
          label="API 路径"
          value={provider.apiPath}
          onChange={(value) => onUpdate({ ...provider, apiPath: value })}
          placeholder="/chat/completions"
        />

        {/* 模型列表 */}
        <div className="pt-4 border-t border-paper-deep/20">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-mono text-ink-faint">模型列表</label>
            <button
              onClick={() => setShowAddModel(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-paper-deep/40 text-[11px] text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 hover:border-bamboo/30 transition-all cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加模型
            </button>
          </div>

          {provider.models.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-ink-ghost bg-paper-warm/30 rounded-xl border border-dashed border-paper-deep/30">
              暂无模型，点击上方添加
            </div>
          ) : (
            <div className="space-y-1.5">
              {provider.models.map((model, idx) => (
                <ModelRow
                  key={model.modelId}
                  model={model}
                  onUpdate={(updated) => {
                    const models = [...provider.models];
                    models[idx] = updated;
                    onUpdate({ ...provider, models });
                  }}
                  onDelete={() => {
                    const models = provider.models.filter((_, i) => i !== idx);
                    onUpdate({ ...provider, models });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 添加模型对话框 */}
      {showAddModel && (
        <AddModelDialog
          onAdd={(model) => {
            onUpdate({ ...provider, models: [...provider.models, model] });
            setShowAddModel(false);
          }}
          onClose={() => setShowAddModel(false)}
        />
      )}
    </div>
  );
}

/* ─── 文本字段 ─── */
interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  onToggleSecret?: () => void;
}

function TextField({ label, value, onChange, placeholder, secret, onToggleSecret }: TextFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-ink-faint mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-paper-warm/50 border border-paper-deep/30 focus-within:border-bamboo/30 focus-within:bg-paper-warm/80 transition-all">
        <input
          type={secret ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-[12px] font-mono text-ink placeholder:text-ink-ghost/50 bg-transparent outline-none"
        />
        {onToggleSecret && (
          <button
            onClick={onToggleSecret}
            className="text-ink-ghost hover:text-ink-faint transition-colors cursor-pointer shrink-0"
          >
            {secret ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 模型行 ─── */
interface ModelRowProps {
  model: ModelConfig;
  onUpdate: (model: ModelConfig) => void;
  onDelete: () => void;
}

function ModelRow({ model, onUpdate, onDelete }: ModelRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="p-3 rounded-xl bg-bamboo-mist/40 border border-bamboo/20 space-y-2">
        <div>
          <label className="text-[9px] font-mono text-ink-ghost block mb-1">Model ID</label>
          <input
            type="text"
            value={model.modelId}
            onChange={(e) => onUpdate({ ...model, modelId: e.target.value })}
            className="w-full h-7 px-2.5 rounded-lg text-[11px] font-mono text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-ink-ghost block mb-1">显示名称</label>
          <input
            type="text"
            value={model.displayName}
            onChange={(e) => onUpdate({ ...model, displayName: e.target.value })}
            className="w-full h-7 px-2.5 rounded-lg text-[11px] font-mono text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30"
          />
        </div>
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setEditing(false)}
            className="px-2.5 h-6 rounded-md text-[10px] text-bamboo bg-bamboo/10 hover:bg-bamboo/20 transition-colors cursor-pointer"
          >
            完成
          </button>
          <button
            onClick={onDelete}
            className="px-2.5 h-6 rounded-md text-[10px] text-red-400 hover:bg-danger-bg transition-colors cursor-pointer"
          >
            删除
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-paper-warm/30 border border-paper-deep/20 hover:border-paper-deep/40 transition-all group">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-ink-soft truncate">{model.displayName}</div>
        <div className="text-[10px] font-mono text-ink-ghost truncate mt-0.5">{model.modelId}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-all cursor-pointer"
          title="编辑"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center rounded-md text-ink-ghost hover:text-red-400 hover:bg-danger-bg transition-all cursor-pointer"
          title="删除模型"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── 添加模型对话框 ─── */
interface AddModelDialogProps {
  onAdd: (model: ModelConfig) => void;
  onClose: () => void;
}

function AddModelDialog({ onAdd, onClose }: AddModelDialogProps) {
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleAdd = () => {
    if (!modelId.trim()) return;
    onAdd({
      modelId: modelId.trim(),
      displayName: displayName.trim() || modelId.trim(),
      modelTypes: ["chat"],
      inputModes: ["text"],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[360px] bg-cloud rounded-2xl border border-paper-deep/40 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-paper-deep/25">
          <h3 className="text-[13px] font-display font-medium text-ink-soft">添加模型</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono text-ink-faint block mb-1">Model ID</label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="gpt-4"
              className="w-full h-8 px-2.5 rounded-lg text-[12px] font-mono text-ink bg-paper-warm/70 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/50"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onClose(); }}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-ink-faint block mb-1">显示名称 (可选)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="GPT-4"
              className="w-full h-8 px-2.5 rounded-lg text-[12px] font-mono text-ink bg-paper-warm/70 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 h-8 rounded-lg border border-paper-deep/40 text-[11px] text-ink-faint hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={!modelId.trim()}
              className="flex-1 h-8 rounded-lg bg-bamboo/90 text-cloud text-[11px] hover:bg-bamboo transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
