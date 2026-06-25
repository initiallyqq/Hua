import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CoWriteIdentity,
  CoWriteSession,
  CoWriteSessionSummary,
} from "../features/cowrite/types";
import type { ProviderConfig } from "../features/settings/types";
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
import { getNote } from "../features/notes/api";

export interface CoWritePageProps {
  providers: ProviderConfig[];
  noteId: string;
}

const IDENTITY_OPTIONS: { key: CoWriteIdentity; label: string; desc: string }[] = [
  { key: "continuator", label: "续写者", desc: "顺着你的思路往下写" },
  { key: "questioner", label: "追问者", desc: "不断追问，帮你挖得更深" },
  { key: "opposer", label: "反对者", desc: "找反例、挑漏洞" },
  { key: "poetic", label: "诗意者", desc: "注入诗意和画面感" },
  { key: "custom", label: "自定义", desc: "自己定义 AI 的角色" },
];

export function CoWritePage({ providers, noteId }: CoWritePageProps) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  // 新内容自动滚动到底部
  useEffect(() => {
    if (editRef.current) {
      editRef.current.scrollTo({
        top: editRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [activeSession?.blocks.length]);

  // 加载当前笔记标题，显示在侧边栏顶部
  useEffect(() => {
    if (!noteId) {
      setNoteTitle(null);
      return;
    }
    getNote(noteId)
      .then((note) => setNoteTitle(note.title || null))
      .catch(() => setNoteTitle(null));
  }, [noteId]);

  // 加载会话列表，笔记切换时清空当前会话避免串到其它笔记
  useEffect(() => {
    setErrorMessage(null);
    setActiveSession(null);
    setActiveSessionId(null);
    setSelectedBlocks(new Set());
    setMergeDone(false);
    listCoWriteSessions(noteId)
      .then(setSessions)
      .catch((e) => {
        console.error(e);
        setErrorMessage(e instanceof Error ? e.message : "加载会话列表失败");
      });
  }, [noteId]);

  // 切换到某个会话
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await getCoWriteSession(sessionId);
      setActiveSession(session);
      setActiveSessionId(sessionId);
      setSelectedBlocks(new Set());
      setMergeDone(false);
      setErrorMessage(null);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "加载会话失败");
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
      setErrorMessage(null);
      const list = await listCoWriteSessions(noteId);
      setSessions(list);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "创建会话失败");
    }
  }, [noteId, selectedIdentity, customPrompt]);

  // 人类写一段
  const handleHumanSubmit = useCallback(async () => {
    if (!humanInput.trim() || !activeSessionId) return;
    try {
      const updated = await appendHumanText(activeSessionId, humanInput.trim());
      setActiveSession(updated);
      setHumanInput("");
      setErrorMessage(null);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "提交失败");
    }
  }, [humanInput, activeSessionId]);

  // AI 续写（PRD 原版：前端直接调用 DeepSeek）
  const handleAITurn = useCallback(async () => {
    console.log("[cowrite] handleAITurn clicked", { activeSessionId, aiLoading, hasActiveSession: !!activeSession });
    if (!activeSession || aiLoading) {
      console.warn("[cowrite] handleAITurn early return", { activeSession, aiLoading });
      return;
    }
    setAiLoading(true);
    setErrorMessage(null);
    console.log("[cowrite] requesting AI turn for session", activeSession.id);
    try {
      const aiText = await requestCoWriteAITurn(
        activeSession,
        activeSession.identity,
        activeSession.customPrompt,
        providers,
      );
      console.log("[cowrite] AI raw text", JSON.stringify(aiText));
      if (!aiText.trim()) {
        throw new Error("AI 返回内容为空");
      }
      const updated = await appendAIText(activeSession.id, aiText);
      console.log(
        "[cowrite] AI turn success | blocks count:",
        updated.blocks.length,
        "last author:",
        updated.blocks[updated.blocks.length - 1]?.author,
      );
      setActiveSession(updated);
    } catch (e) {
      console.error("[cowrite] AI turn failed", e);
      setErrorMessage(e instanceof Error ? e.message : "AI 调用失败");
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
      setErrorMessage(null);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "合并失败");
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
      setErrorMessage(null);
      const list = await listCoWriteSessions(noteId);
      setSessions(list);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "删除失败");
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

  console.log("[cowrite] render", { noteId, activeSessionId, currentTurn, blocksCount: activeSession?.blocks.length });

  const hasNote = Boolean(noteId);

  if (!hasNote) {
    return (
      <div className="cowrite-container">
        <div className="cowrite-main" style={{ width: "100%" }}>
          <div className="cowrite-placeholder">
            请先在左侧边栏点击“笔记”，选择一篇笔记后再开始共笔
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cowrite-container">
      {/* 左侧：会话列表 */}
      <div className="cowrite-sidebar">
        {noteId && (
          <div className="cowrite-note-info" title={noteTitle ?? noteId}>
            <span className="cowrite-note-info-label">当前笔记</span>
            <span className="cowrite-note-info-title">
              {noteTitle || "（无标题）"}
            </span>
          </div>
        )}
        <div className="cowrite-sidebar-header">
          <h3>共笔会话</h3>
          <button
            className="cowrite-btn-new"
            onClick={() => setShowNewDialog(true)}
            title="新建共笔会话"
          >
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
                <div className="cowrite-session-preview">{s.preview}</div>
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
        {errorMessage && (
          <div
            className="cowrite-error-bar"
            style={{
              padding: "10px 20px",
              fontSize: "12px",
              color: "#ef4444",
              background: "var(--color-danger-bg)",
              borderBottom: "1px solid var(--color-paper-deep)",
            }}
          >
            {errorMessage}
          </div>
        )}
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
                    onClick={() => {
                      console.log("[cowrite] button '轮到 AI' clicked (human turn)");
                      void handleAITurn();
                    }}
                    disabled={aiLoading}
                  >
                    轮到 AI
                  </button>
                </div>
              </div>
            )}

            {currentTurn === "ai" && !aiLoading && (
              <div className="cowrite-input-area">
                <button
                  className="cowrite-btn-ai"
                  onClick={() => {
                    console.log("[cowrite] button '轮到 AI' clicked (ai turn)");
                    void handleAITurn();
                  }}
                >
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
