import fs from "fs/promises";
import path from "path";

// -- Types --

export type ThreadRecord = {
  id: string;
  title: string | null;
  status: "regular" | "archived";
  dataTimespan?: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  threadId: string;
  parentId: string | null;
  format: string;
  content: unknown;
  createdAt: string;
};

type StoreData = {
  threads: ThreadRecord[];
  messages: MessageRecord[];
};

// -- Env helpers --

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

function getFilePath(): string {
  const dir = getEnv("PATIENT_THREADS_LOCATION");
  const patientId = getEnv("PATIENT_ID");
  return path.join(dir, `${patientId}.json`);
}

// -- Read / Write store --

async function readStore(): Promise<StoreData> {
  const filePath = getFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return { threads: [], messages: [] };
  }
}

async function writeStore(data: StoreData): Promise<void> {
  const filePath = getFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// -- Thread CRUD --

export async function listThreads(): Promise<ThreadRecord[]> {
  const store = await readStore();
  return store.threads.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getThread(id: string): Promise<ThreadRecord | null> {
  const store = await readStore();
  return store.threads.find((t) => t.id === id) ?? null;
}

export async function createThread(id: string): Promise<ThreadRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const thread: ThreadRecord = {
    id,
    title: null,
    status: "regular",
    createdAt: now,
    updatedAt: now,
  };
  store.threads.push(thread);
  await writeStore(store);
  return thread;
}

export async function updateThread(
  id: string,
  patch: { title?: string; status?: "regular" | "archived"; dataTimespan?: string },
): Promise<void> {
  const store = await readStore();
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) return;
  if (patch.title !== undefined) thread.title = patch.title;
  if (patch.status !== undefined) thread.status = patch.status;
  if (patch.dataTimespan !== undefined) thread.dataTimespan = patch.dataTimespan;
  thread.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function deleteThread(id: string): Promise<void> {
  const store = await readStore();
  store.threads = store.threads.filter((t) => t.id !== id);
  store.messages = store.messages.filter((m) => m.threadId !== id);
  await writeStore(store);
}

// -- Message CRUD --

export async function listMessages(threadId: string): Promise<MessageRecord[]> {
  const store = await readStore();
  return store.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function appendMessage(
  threadId: string,
  msg: {
    id: string;
    parentId: string | null;
    format: string;
    content: unknown;
  },
): Promise<void> {
  const store = await readStore();
  store.messages.push({
    id: msg.id,
    threadId,
    parentId: msg.parentId,
    format: msg.format,
    content: msg.content,
    createdAt: new Date().toISOString(),
  });
  // touch thread updatedAt
  const thread = store.threads.find((t) => t.id === threadId);
  if (thread) thread.updatedAt = new Date().toISOString();
  await writeStore(store);
}

// -- Search --

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  const parts = Array.isArray(content)
    ? content
    : "parts" in content && Array.isArray((content as { parts: unknown }).parts)
      ? (content as { parts: unknown[] }).parts
      : [];
  return parts
    .map((p) =>
      typeof p === "object" && p && "text" in p ? String((p as { text: unknown }).text) : "",
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
    (start > 0 ? "..." : "") + text.slice(start, end).trim() + (end < text.length ? "..." : "")
  );
}

export type ThreadSearchResult = {
  id: string;
  title: string | null;
  preview: string | null;
};

export async function searchThreads(query: string): Promise<ThreadSearchResult[]> {
  const store = await readStore();
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
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((t) => ({ id: t.id, title: t.title, preview: snippets.get(t.id) ?? null }));
}

// -- Context loaders --

export async function loadSystemPrompt(): Promise<string> {
  const loc = getEnv("SYSTEM_PROMPT_LOCATION");
  return fs.readFile(loc, "utf-8");
}

const ALL_TIMESPANS = [
  "all_available",
  "past_1_month",
  "past_3_months",
  "past_6_months",
  "past_1_year",
  "past_2_years",
] as const;

export async function listAvailableTimespans(): Promise<string[]> {
  const dir = getEnv("PATIENT_DATA_LOCATION");
  const pid = getEnv("PATIENT_ID");
  const available: string[] = [];
  for (const ts of ALL_TIMESPANS) {
    try {
      await fs.access(path.join(dir, `${pid}_data_${ts}.csv`));
      available.push(ts);
    } catch {
      // file not found
    }
  }
  return available;
}

export async function loadPatientDataByTimespan(timespan: string): Promise<string> {
  const dir = getEnv("PATIENT_DATA_LOCATION");
  const pid = getEnv("PATIENT_ID");
  return fs.readFile(path.join(dir, `${pid}_data_${timespan}.csv`), "utf-8");
}
