import { describe, expect, it } from "vitest";
import { computeCoWriteStats } from "./coWriteUtils";
import type { CoWriteSession } from "./types";

const createSession = (blocks: CoWriteSession["blocks"]): CoWriteSession => ({
  id: "s1",
  noteId: "n1",
  identity: "continuator",
  blocks,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

describe("computeCoWriteStats", () => {
  it("returns zero stats for empty session", () => {
    const stats = computeCoWriteStats(createSession([]));
    expect(stats.humanBlocks).toBe(0);
    expect(stats.aiBlocks).toBe(0);
    expect(stats.humanChars).toBe(0);
    expect(stats.aiChars).toBe(0);
    expect(stats.totalTurns).toBe(0);
    expect(stats.durationMs).toBe(0);
  });

  it("counts human and AI blocks and chars", () => {
    const stats = computeCoWriteStats(
      createSession([
        { author: "human", text: "今天天气很好。", timestamp: 1 },
        { author: "ai", text: "适合出去走走。", timestamp: 2 },
      ]),
    );
    expect(stats.humanBlocks).toBe(1);
    expect(stats.aiBlocks).toBe(1);
    expect(stats.totalTurns).toBe(2);
    expect(stats.humanChars).toBe(7); // 今天天气很好。
    expect(stats.aiChars).toBe(7); // 适合出去走走。
  });

  it("computes duration from first to last block", () => {
    const stats = computeCoWriteStats(
      createSession([
        { author: "human", text: "a", timestamp: 1000 },
        { author: "ai", text: "b", timestamp: 5000 },
      ]),
    );
    expect(stats.durationMs).toBe(4000);
  });
});
