const STORAGE_KEY = "phendo_threads";

type ThreadEntry = {
  id: string;
  title: string | null;
  status: "regular" | "archived";
  dataTimespan?: string;
  createdAt: string;
  updatedAt: string;
};

type MessageEntry = {
  id: string;
  threadId: string;
  parent_id: string | null;
  format: string;
  content: unknown;
  createdAt?: string;
};

type StoreData = { threads: ThreadEntry[]; messages: MessageEntry[] };

export type { ThreadEntry, MessageEntry, StoreData };

export function readStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { threads: [], messages: [] };
  } catch {
    return { threads: [], messages: [] };
  }
}

export function writeStore(data: StoreData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// -- search helpers (mirrors persistence.ts logic) --

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  const parts = Array.isArray(content)
    ? content
    : "parts" in content && Array.isArray((content as { parts: unknown }).parts)
      ? (content as { parts: unknown[] }).parts
      : [];
  return parts
    .map((p) =>
      typeof p === "object" && p && "text" in p
        ? String((p as { text: unknown }).text)
        : "",
    )
    .join(" ");
}

const SNIPPET_RADIUS = 40;

function snippet(text: string, q: string): string | null {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return null;
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + q.length + SNIPPET_RADIUS);
  return (
    (start > 0 ? "..." : "") +
    text.slice(start, end).trim() +
    (end < text.length ? "..." : "")
  );
}

export function searchThreads(
  query: string,
): { id: string; title: string | null; preview: string | null }[] {
  const store = readStore();
  const q = query.toLowerCase();
  const snippets = new Map<string, string | null>();

  for (const msg of store.messages) {
    if (snippets.has(msg.threadId)) continue;
    const text = extractText(msg.content);
    const s = snippet(text, q);
    if (s) snippets.set(msg.threadId, s);
  }
  for (const t of store.threads) {
    if (!snippets.has(t.id) && t.title?.toLowerCase().includes(q)) {
      snippets.set(t.id, null);
    }
  }

  return store.threads
    .filter((t) => t.status === "regular" && snippets.has(t.id))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      preview: snippets.get(t.id) ?? null,
    }));
}
