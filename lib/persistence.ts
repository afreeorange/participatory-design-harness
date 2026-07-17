import fs from "fs/promises";
import path from "path";

// -- Types --

export type ThreadRecord = {
  id: string;
  title: string | null;
  status: "regular" | "archived";
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
  patch: { title?: string; status?: "regular" | "archived" },
): Promise<void> {
  const store = await readStore();
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) return;
  if (patch.title !== undefined) thread.title = patch.title;
  if (patch.status !== undefined) thread.status = patch.status;
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
  msg: { id: string; parentId: string | null; format: string; content: unknown },
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

// -- Context loaders --

export async function loadSystemPrompt(): Promise<string> {
  const loc = getEnv("SYSTEM_PROMPT_LOCATION");
  return fs.readFile(loc, "utf-8");
}

export async function loadPatientData(): Promise<string> {
  const loc = getEnv("PATIENT_DATA_LOCATION");
  return fs.readFile(loc, "utf-8");
}
