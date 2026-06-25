export type CoWriteIdentity =
  | "continuator" // 续写者
  | "questioner"  // 追问者
  | "opposer"     // 反对者
  | "poetic"      // 诗意者
  | "custom";     // 自定义

export interface AuthorBlock {
  author: "human" | "ai";
  text: string;
  timestamp: number;
}

export interface CoWriteSession {
  id: string;
  noteId: string;
  identity: CoWriteIdentity;
  customPrompt?: string;
  blocks: AuthorBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface CoWriteSessionSummary {
  id: string;
  noteId: string;
  identity: CoWriteIdentity;
  blockCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}
