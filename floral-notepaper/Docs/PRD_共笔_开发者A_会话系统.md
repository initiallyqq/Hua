# 共笔模式 PRD — 开发者 A：会话系统

## 你的职责

端到端负责共笔模式的**完整会话系统**：数据模型（前后端统一）、本地持久化（Rust）、会话 CRUD、共笔页面整体 UI 框架、作者分色渲染。

## 需要你新建的文件

### 1. `src/features/cowrite/types.ts` — 数据模型 ✅ 已创建

整个共笔功能共享的类型定义，开发者 B 也会引用这个文件。已完成，请审阅。

### 2. `src/features/cowrite/api.ts` — 前端 API 层 ✅ 已创建

封装 7 个 Tauri 命令调用。已完成，请审阅。

### 3. `src/features/cowrite/coWriteUtils.ts` — 工具函数 ✅ 已创建

`splitBlocksByAuthor`、`getCurrentTurn`、`blocksToText` 等。已完成，请审阅。

### 4. `src/components/CoWritePage.tsx` — 主页面 ✅ 已创建

完整的共笔页面组件，包含：
- 左侧会话列表（新建 / 切换 / 删除）
- 新建会话弹窗（5 种 AI 身份选择）
- 交替写编辑区（human 写 → 点"轮到 AI" → AI 返回）
- 作者分色（human 墨色 / AI bamboo 绿 + 浅绿底色）
- 轮次指示器（"轮到你了" / "轮到 AI"）
- AI 思考 loading 动画
- 合并到笔记（点击段落选中 → 合并选中内容回主笔记）

已完成，请审阅。

### 5. `src-tauri/src/services/cowrite.rs` — Rust 后端存储 ✅ 已创建

- `CoWriteSession` 数据模型（JSON 持久化，路径 `<base_dir>/cowrite/<sessionId>.json`）
- 完整 CRUD：create / get / list / append_human / append_ai / merge_to_note / delete
- 错误处理、目录自动创建

已完成，请审阅。

## 需要你修改的文件

| 文件 | 改动 | 状态 |
|---|---|---|
| `src-tauri/src/services/mod.rs` | 加 `pub mod cowrite;` | ✅ |
| `src-tauri/src/lib.rs` | 新增 7 个 Tauri 命令 + import + invoke_handler 注册 | ✅ |

## 接口约定（和开发者 B 的"合同"）

### Tauri 命令（你暴露，B 的 coWriteAI.ts 会被 A 的 CoWritePage 调用）

```
cowrite_create_session(noteId, identity, customPrompt?) → CoWriteSession
cowrite_append_human(sessionId, text) → CoWriteSession
cowrite_append_ai(sessionId, text) → CoWriteSession
cowrite_get_session(sessionId) → CoWriteSession
cowrite_list_sessions(noteId) → CoWriteSessionSummary[]
cowrite_merge_to_note(sessionId, selectedBlockIndices[]) → string
cowrite_delete_session(sessionId) → void
```

### 数据模型（你定义在 types.ts，Rust 侧需完全对应）

```typescript
type CoWriteIdentity = "continuator" | "questioner" | "opposer" | "poetic" | "custom";

interface AuthorBlock {
  author: "human" | "ai";
  text: string;
  timestamp: number;
}

interface CoWriteSession {
  id: string;
  noteId: string;
  identity: CoWriteIdentity;
  customPrompt?: string;
  blocks: AuthorBlock[];
  createdAt: string;
  updatedAt: string;
}
```

### 组件接口

`CoWritePage` 需要以下 props（由开发 B 在 `App.tsx` 中传入）：

```typescript
interface CoWritePageProps {
  providers: ProviderConfig[];  // 当前配置的 AI 供应商列表
  noteId: string;               // 当前笔记 ID
  noteContent: string;          // 当前笔记内容
}
```

## 验收标准

- [ ] 用户可以从侧边栏进入"共笔"页面
- [ ] 用户可以创建新共笔会话，选择 AI 身份（5 种可选）
- [ ] 用户可以写一段文字并提交，显示为 human 样式
- [ ] 用户点"轮到 AI"后，AI 内容以不同颜色显示
- [ ] 会话数据关闭后重新打开仍然存在
- [ ] 用户可以删除会话
- [ ] 用户可以选中段落并合并到原笔记
- [ ] 页面样式和现有应用风格一致（bamboo 绿 + paper 色系）
