import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderConfig } from "../features/settings/types";
import type {
  CoWriteIdentity,
  CoWriteSession,
  CoWriteSessionSummary,
} from "../features/cowrite/types";
import {
  createCoWriteSession,
  appendHumanText,
  appendAIText,
  getCoWriteSession,
  listCoWriteSessions,
  mergeToNote,
  deleteCoWriteSession,
} from "../features/cowrite/api";
import { requestCoWriteAITurn } from "../features/cowrite/coWriteAI";
import { blocksToText, formatSessionPreview, sessionWordCount } from "../features/cowrite/coWriteUtils";

interface CoWritePageProps {
  providers: ProviderConfig[];
  noteId: string;
  noteContent: string;
}

const IDENTITY_OPTIONS: { key: CoWriteIdentity; label: string; desc: string }[] = [
  { key: "continuator", label: "续写者", desc: "顺着你的思路往下写" },
  { key: "questioner", label: "追问者", desc: "不断追问，帮你挖得更深" },
  { key: "opposer", label: "反对者", desc: "找反例、挑漏洞" },
  { key: "poetic", label: "诗意者", desc: "注入诗意和画面感" },
  { key: "custom", label: "自定义", desc: "自己定义 AI 的角色" },
];

export function CoWritePage({ providers, noteId, noteContent }: CoWritePageProps) {
  const [sessions, setSessions] = useState<CoWriteSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<CoWriteSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<CoWriteIdentity>("continuator");
  const [customPrompt, setCustomPrompt] = useState("");
  const [humanInput, setHumanInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());
  const [mergeDone, setMergeDone] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  // 加载会话列表
  useEffect(() => {
    listCoWriteSessions(noteId)
      .then(setSessions)
      .catch(console.error);
  }, [noteId]);

  // 切换到某个会话
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await getCoWriteSession(sessionId);
      setActiveSession(session);
      setActiveSessionId(sessionId);
      setSelectedBlocks(new Set());
      setMergeDone(false);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 新建会话
  const handleCreate = useCallback(async () => {
    try {
      const session = await createCoWriteSession(
        noteId,
        selectedIdentity,
        selectedIdentity === "custom" ? customPrompt : undefined,
      );
      setActiveSession(session);
      setActiveSessionId(session.id);
      setShowNewDialog(false);
      setCustomPrompt("");
      const list = await listCoWriteSessions(noteId);
      setSessions(list);
    } catch (e) {
      console.error(e);
    }
  }, [noteId, selectedIdentity, customPrompt]);

  // 人类写一段
  const handleHumanSubmit = useCallback(async () => {
    if (!humanInput.trim() || !activeSessionId) return;
    try {
      const updated = await appendHumanText(activeSessionId, humanInput.trim());
      setActiveSession(updated);
      setHumanInput("");
    } catch (e) {
      console.error(e);
    }
  }, [humanInput, activeSessionId]);

  // AI 续写
  const handleAITurn = useCallback(async () => {
    if (!activeSession || aiLoading) return;
    setAiLoading(true);
    try {
      const aiText = await requestCoWriteAITurn(
        activeSession,
        activeSession.identity,
        activeSession.customPrompt,
        providers,
      );
      const updated = await appendAIText(activeSession.id, aiText);
      setActiveSession(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }, [activeSession, aiLoading, providers]);

  // 合并到笔记
  const handleMerge = useCallback(async () => {
    if (!activeSessionId || selectedBlocks.size === 0) return;
    try {
      await mergeToNote(activeSessionId, Array.from(selectedBlocks).sort((a, b) => a - b));
      setMergeDone(true);
    } catch (e) {
      console.error(e);
    }
  }, [activeSessionId, selectedBlocks]);

  // 删除会话
  const handleDelete = useCallback(async (sessionId: string) => {
    try {
      await deleteCoWriteSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSession(null);
        setActiveSessionId(null);
      }
      const list = await listCoWriteSessions(noteId);
      setSessions(list);
    } catch (e) {
      console.error(e);
    }
  }, [noteId, activeSessionId]);

  const toggleBlock = (index: number) => {
    const next = new Set(selectedBlocks);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedBlocks(next);
  };

  const currentTurn = activeSession
    ? (activeSession.blocks.length === 0 ||
       activeSession.blocks[activeSession.blocks.length - 1].author === "ai"
        ? "human"
        : "ai")
    : "human";

  return (
    <div className="cowrite-container">
      {/* 左侧：会话列表 */}
      <div className="cowrite-sidebar">
        <div className="cowrite-sidebar-header">
          <h3>共笔会话</h3>
          <button className="cowrite-btn-new" onClick={() => setShowNewDialog(true)}>
            + 新建
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="cowrite-empty">暂无共笔会话，点击"新建"开始</div>
        ) : (
          <div className="cowrite-session-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`cowrite-session-item ${activeSessionId === s.id ? "active" : ""}`}
                onClick={() => loadSession(s.id)}
              >
                <div className="cowrite-session-meta">
                  <span className="cowrite-session-identity">
                    {IDENTITY_OPTIONS.find((o) => o.key === s.identity)?.label ?? s.identity}
                  </span>
                  <span className="cowrite-session-count">{s.blockCount} 段</span>
                </div>
                <div className="cowrite-session-preview">{formatSessionPreview([]) || s.preview}</div>
                <button
                  className="cowrite-session-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id);
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右侧：编辑区 */}
      <div className="cowrite-main">
        {!activeSession ? (
          <div className="cowrite-placeholder">
            选择一个共笔会话，或新建一个
          </div>
        ) : (
          <>
            {/* 轮次指示器 */}
            <div className="cowrite-turn-indicator">
              {aiLoading ? (
                <span className="cowrite-turn-ai-loading">AI 正在思考…</span>
              ) : currentTurn === "human" ? (
                <span className="cowrite-turn-human">轮到你了</span>
              ) : (
                <span className="cowrite-turn-ai">轮到 AI</span>
              )}
            </div>

            {/* 内容展示区 */}
            <div ref={editRef} className="cowrite-content">
              {activeSession.blocks.map((block, i) => (
                <div
                  key={i}
                  className={`cowrite-block cowrite-author-${block.author} ${
                    selectedBlocks.has(i) ? "selected" : ""
                  }`}
                  onClick={() => toggleBlock(i)}
                >
                  <span className="cowrite-block-author">
                    {block.author === "human" ? "你" : "AI"}
                  </span>
                  <p className="cowrite-block-text">{block.text}</p>
                </div>
              ))}
              {activeSession.blocks.length === 0 && (
                <div className="cowrite-content-empty">开始写第一段吧</div>
              )}
            </div>

            {/* 输入区 */}
            {currentTurn === "human" && !aiLoading && (
              <div className="cowrite-input-area">
                <textarea
                  className="cowrite-input"
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  placeholder="写一段…"
                  rows={3}
                  disabled={aiLoading}
                />
                <div className="cowrite-input-actions">
                  <button
                    className="cowrite-btn-submit"
                    onClick={handleHumanSubmit}
                    disabled={!humanInput.trim()}
                  >
                    提交
                  </button>
                  <button
                    className="cowrite-btn-ai"
                    onClick={handleAITurn}
                    disabled={aiLoading}
                  >
                    轮到 AI
                  </button>
                </div>
              </div>
            )}

            {currentTurn === "ai" && !aiLoading && (
              <div className="cowrite-input-area">
                <button className="cowrite-btn-ai" onClick={handleAITurn}>
                  轮到 AI
                </button>
              </div>
            )}

            {/* 合并操作 */}
            {activeSession.blocks.length > 0 && (
              <div className="cowrite-merge-bar">
                <span className="cowrite-merge-hint">
                  点击段落选中/取消，选中后合并到笔记
                </span>
                <button
                  className="cowrite-btn-merge"
                  onClick={handleMerge}
                  disabled={selectedBlocks.size === 0 || mergeDone}
                >
                  {mergeDone ? "已合并" : `合并选中段落 (${selectedBlocks.size})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新建会话弹窗 */}
      {showNewDialog && (
        <div className="cowrite-dialog-overlay" onClick={() => setShowNewDialog(false)}>
          <div className="cowrite-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>新建共笔会话</h3>
            <div className="cowrite-identity-grid">
              {IDENTITY_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  className={`cowrite-identity-card ${
                    selectedIdentity === opt.key ? "active" : ""
                  }`}
                  onClick={() => setSelectedIdentity(opt.key)}
                >
                  <div className="cowrite-identity-label">{opt.label}</div>
                  <div className="cowrite-identity-desc">{opt.desc}</div>
                </div>
              ))}
            </div>
            {selectedIdentity === "custom" && (
              <textarea
                className="cowrite-custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="输入自定义 Prompt…"
                rows={3}
              />
            )}
            <div className="cowrite-dialog-actions">
              <button
                className="cowrite-btn-cancel"
                onClick={() => setShowNewDialog(false)}
              >
                取消
              </button>
              <button className="cowrite-btn-create" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
