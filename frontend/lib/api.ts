const BASE = "/api";

// --- Utils ---

export function fuzzyMatch(submitted: string, expected: string | string[]): boolean {
  const sub = submitted.trim().toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  if (!sub) return false;
  const targets = Array.isArray(expected) ? expected : [expected];
  return targets.some((t) => {
    const exp = t.trim().toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
    return sub === exp || sub.includes(exp) || exp.includes(sub);
  });
}

// --- Types ---

export interface NodeOut {
  id: string;
  session_id: string;
  title: string;
  content: string;
  notation: string | null;
  protected_identifiers: string[] | null;
  confidence_score: number;
}

export interface EdgeOut {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: "prerequisite" | "sub_concept";
}

export interface GraphOut {
  session_id: string;
  nodes: NodeOut[];
  edges: EdgeOut[];
}

export interface QuizQuestion {
  id: string;
  type: "fill_in_blank" | "keyword_match" | "multiple_choice";
  prompt: string;
  options?: string[];
  correct_answer?: string | string[];
  pairs?: { left: string; right: string }[];
}

export interface QuizResponse {
  node_id: string;
  quiz_type: "pre" | "post";
  questions: QuizQuestion[];
}

export interface QuizResult {
  node_id: string;
  score: number;
  total: number;
  correct: number;
  confidence_score: number;
  details: Record<string, unknown>[];
}

export interface EslData {
  content_ko: string;
  identifier_translations: Record<string, string>;
}

// --- API calls ---

export async function uploadFile(file: File): Promise<{ session_id: string }> {
  const form = new FormData();
  form.append("file", file);
  // Call backend directly (bypass Next.js proxy timeout since Gemini extraction takes long)
  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getGraph(sessionId: string): Promise<GraphOut> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/graph`);
  if (!res.ok) throw new Error("Failed to fetch graph");
  return res.json();
}

export async function getQuiz(
  nodeId: string,
  type: "pre" | "post"
): Promise<QuizResponse> {
  const res = await fetch(`${BASE}/nodes/${nodeId}/quiz?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch quiz");
  return res.json();
}

export async function submitQuiz(
  nodeId: string,
  answers: { question_id: string; answer: string }[],
  type: "pre" | "post" = "post"
): Promise<QuizResult> {
  const res = await fetch(`${BASE}/nodes/${nodeId}/quiz?type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return res.json();
}

export function getAudioUrl(nodeId: string): string {
  return `${BASE}/nodes/${nodeId}/audio`;
}

export interface AudioScript {
  title: string;
  explanation: string;
  question: string;
  answer: string;
}

export async function getAudioScript(nodeId: string): Promise<AudioScript> {
  const res = await fetch(`${BASE}/nodes/${nodeId}/audio-script`);
  if (!res.ok) throw new Error("Failed to fetch audio script");
  return res.json();
}

export async function getEsl(nodeId: string): Promise<EslData> {
  const res = await fetch(`${BASE}/nodes/${nodeId}/esl`);
  if (!res.ok) throw new Error("Failed to fetch ESL data");
  return res.json();
}

export interface ImageInfo {
  index: number;
  page: number;
  width: number;
  height: number;
}

export async function getSessionImages(sessionId: string): Promise<ImageInfo[]> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/images`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.images || [];
}

export function getImageUrl(sessionId: string, index: number): string {
  return `${BASE}/sessions/${sessionId}/images/${index}`;
}
