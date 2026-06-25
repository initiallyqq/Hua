# 共笔模式 PRD — 开发者 B：AI 引擎 + 应用接入

## 你的职责

负责 AI 续写的全套 Prompt 工程、DeepSeek API 调用封装，以及把共笔功能接入到应用导航系统（侧边栏入口、路由、样式）。

## 需要你新建的文件

### 1. `src/features/cowrite/prompts.ts` — AI 身份 Prompt 模板 ✅ 已创建

包含：
- 5 套身份预设（续写者 / 追问者 / 反对者 / 诗意者 / 自定义），每套含 system prompt 全文
- `getSystemPrompt(identity, customPrompt?)` — 获取对应 prompt
- `buildCoWriteMessages(session, identity, customPrompt?)` — 拼装完整消息（system + user），user 消息中包含全文上下文（`<human>` / `<ai>` 交替标注）

已完成，请审阅。

### 2. `src/features/cowrite/coWriteAI.ts` — DeepSeek 共笔调用 ✅ 已创建

- 复用现有 Provider 配置（优先选 DeepSeek provider）
- 调用 `buildCoWriteMessages` 拼装 Prompt + 上下文
- 发起 `/chat/completions` 请求（temperature 0.8, max_tokens 500）
- 返回 AI 生成的下一段文字
- 错误处理：无供应商 / API 错误

核心函数签名：
```typescript
async function requestCoWriteAITurn(
  session: CoWriteSession,
  identity: CoWriteIdentity,
  customPrompt: string | undefined,
  providers: ProviderConfig[]
): Promise<string>
```

已完成，请审阅。

## 需要你修改的文件

### 1. `src/App.tsx` — 路由接入 ✅ 已修改

- import `CoWritePage` from `./components/CoWritePage`
- 在 `sidebarView === "cowrite"` 时渲染 `CoWritePage`，传入 `providers`

已完成，当联调时需要填入真实的 `noteId` 和 `noteContent`。

### 2. `src/components/AppSidebar.tsx` — 侧边栏入口 ✅ 已修改

- `AppView` 类型新增 `"cowrite"`
- 新增 `CowriteIcon` SVG 组件
- `sidebarItems` 新增 `{ view: "cowrite", label: "共笔", icon: CowriteIcon }`

已完成，请审阅。

### 3. `src/App.css` — 共笔样式 ✅ 已修改

新增约 400 行样式，包含：
- `.cowrite-container` — 左右分栏布局
- `.cowrite-sidebar` — 会话列表侧栏
- `.cowrite-main` — 编辑区（轮次指示器、内容区、输入区、合并栏）
- `.cowrite-author-human` — 人类文字样式（墨色）
- `.cowrite-author-ai` — AI 文字样式（bamboo 绿 + 浅绿底色）
- `.cowrite-dialog-*` — 新建会话弹窗
- `.cowrite-btn-*` — 按钮组件
- 所有样式使用 CSS 变量，支持深色模式

已完成，请审阅。

## 依赖开发者 A 的接口

你依赖 A 写好的以下文件，请直接 import 使用：

| 文件 | 你需要什么 |
|---|---|
| `src/features/cowrite/types.ts` | `CoWriteIdentity`、`CoWriteSession`、`AuthorBlock` 类型 |
| `src/features/cowrite/coWriteUtils.ts` | `blocksToText()` 函数（拼接 blocks 为带标注的全文） |
| `src/components/CoWritePage.tsx` | 组件 Props 接口 `CoWritePageProps` |

## AI Prompt 设计说明

### 5 种身份

| 身份 | Prompt 核心规则 |
|---|---|
| 续写者 | 写 1-3 句，顺着风格延续，不评价 |
| 追问者 | 只写 1 个问题，精准深挖，不回答 |
| 反对者 | 写 1-2 句反例或质疑，礼貌锐利 |
| 诗意者 | 写 1-2 句诗意的描写，具体有画面 |
| 自定义 | 用户自行输入完整 system prompt |

### 上下文传递格式

发给 AI 时，全文用标签标记每个段落的作者：

```
当前全文（<human> 是人写的，<ai> 是 AI 之前写的，交替标注）：

<human>今天天气真好，我想出去走走。</human>

<ai>阳光穿过树叶的缝隙，在地上画出了斑驳的影子。</ai>

轮到你了，写下一段：
```

### DeepSeek 调用参数

```
model: 当前选中的模型
temperature: 0.8
max_tokens: 500
stream: false
```

## 验收标准

- [ ] 侧边栏有"共笔"入口，图标清晰，点击后进入共笔页面
- [ ] 5 种 AI 身份 Prompt 正常加载，自定义 Prompt 可输入
- [ ] 用户点"轮到 AI"后能正常调用 DeepSeek 返回续写内容
- [ ] AI 返回的文字以 bamboo 绿色显示，人类文字以墨色显示
- [ ] 页面样式和现有应用风格高度一致
- [ ] 深色模式下样式正常切换
