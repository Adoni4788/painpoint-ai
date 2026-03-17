const API_BASE = "/api";

// ---------------------------------------------------------------------------
// Clerk JWT integration
// ClerkTokenSyncer (rendered inside layout.tsx) calls setAuthTokenGetter once
// on mount so every fetch automatically carries the signed-in user's JWT.
// ---------------------------------------------------------------------------
let _getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  workspace_id: string | null;
  query: string;
  status: string;
  sources: string[];
  total_posts_fetched: number;
  total_complaints_found: number;
  total_relevant_complaints: number;
  summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Cluster {
  id: string;
  search_id: string;
  label: string;
  summary: string | null;
  complaint_count: number;
  frequency_score: number;
  emotion_score: number;
  urgency_score: number;
  relevance_score: number;
  opportunity_score: number;
  avg_authenticity: number;
  source_breakdown: Record<string, number>;
  top_complaints: string[];
  who_has_problem: string | null;
  why_it_matters: string | null;
  suggested_solution: string | null;
  product_angle: string | null;
  created_at: string;
}

export interface RawPost {
  id: string;
  source: string;
  title: string | null;
  text: string;
  author: string | null;
  url: string | null;
  timestamp: string | null;
  is_complaint: boolean;
  complaint_score: number | null;
  relevance: string;
  relevance_score: number;
  content_type: string;
  authenticity_score: number;
}

export interface PRD {
  id: string;
  cluster_id: string;
  product_concept: string | null;
  target_user: string | null;
  problem_statement: string | null;
  core_features: string[];
  mvp_suggestion: string | null;
  full_text: string | null;
  created_at: string;
}

export interface ClusterWithQuery extends Cluster {
  search_query: string;
}

export interface OpportunityReport {
  cluster: Cluster;
  posts: RawPost[];
  prd: PRD | null;
}

function toUserFriendlyMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.startsWith("API error ")) {
      const match = err.message.match(/API error (\d+): (.+)/);
      if (match) {
        const [, status, body] = match;
        const statusNum = parseInt(status, 10);
        if (statusNum === 429) return "You've hit the rate limit. Please wait a moment before trying again.";
        if (statusNum === 500) return "Something went wrong on our end. Please try again.";
        if (statusNum === 502 || statusNum === 503) return "The service is starting up or temporarily unavailable. Please try again in a minute.";
        if (statusNum >= 400 && statusNum < 500) {
          try {
            const parsed = JSON.parse(body);
            if (parsed.detail) return typeof parsed.detail === "string" ? parsed.detail : "Invalid request.";
          } catch {
            return body.length < 80 ? body : "Invalid request.";
          }
        }
      }
    }
    if (err.name === "AbortError") return "The request timed out. The service may be starting—please try again.";
    if (err instanceof TypeError && err.message.includes("fetch")) return "Unable to connect. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const maxAttempts = 5;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    // First attempt allows 90s for cold starts; retries allow 30s each
    const timeout = attempt === 1 ? 90_000 : 30_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      // Attach Clerk JWT if available (set by ClerkTokenSyncer on mount)
      const token = _getToken ? await _getToken() : null;
      const authHeaders: Record<string, string> = token
        ? { "Authorization": `Bearer ${token}` }
        : {};
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Retry on 502/503 (backend cold start on Render free tier)
      if ((res.status === 502 || res.status === 503) && attempt < maxAttempts) {
        lastError = new Error(`API error ${res.status}: ${await res.text()}`);
        await new Promise((r) => setTimeout(r, attempt === 1 ? 8000 : 5000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`API error ${res.status}: ${text}`);
        // For 429 throw friendly message immediately — retrying would make it worse
        if (res.status === 429) throw new Error(toUserFriendlyMessage(err));
        throw err;
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      if (attempt < maxAttempts && err instanceof DOMException && err.name === "AbortError") {
        continue;
      }
      if (attempt < maxAttempts && err instanceof TypeError) {
        // Network error (fetch failed) — wait briefly then retry
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  throw new Error(toUserFriendlyMessage(lastError));
}

export async function createSearch(query: string, sources: string[], workspaceId?: string | null): Promise<SearchResult> {
  return fetchJSON<SearchResult>("/searches", {
    method: "POST",
    body: JSON.stringify({ query, sources, workspace_id: workspaceId ?? null }),
  });
}

export async function listSearches(workspaceId?: string | null): Promise<SearchResult[]> {
  const params = workspaceId ? `?workspace_id=${workspaceId}` : "";
  return fetchJSON<SearchResult[]>(`/searches${params}`);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return fetchJSON<Workspace[]>("/workspaces");
}

export async function createWorkspace(name: string): Promise<Workspace> {
  return fetchJSON<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateWorkspace(id: string, name: string): Promise<Workspace> {
  return fetchJSON<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  return fetchJSON(`/workspaces/${id}`, { method: "DELETE" });
}

export async function getSearch(id: string): Promise<SearchResult> {
  return fetchJSON<SearchResult>(`/searches/${id}`);
}

export async function getClusters(searchId: string): Promise<Cluster[]> {
  return fetchJSON<Cluster[]>(`/searches/${searchId}/clusters`);
}

export async function listAllClusters(workspaceId?: string | null): Promise<ClusterWithQuery[]> {
  const params = workspaceId ? `?workspace_id=${workspaceId}` : "";
  return fetchJSON<ClusterWithQuery[]>(`/clusters${params}`);
}

export async function getCluster(clusterId: string): Promise<Cluster> {
  return fetchJSON<Cluster>(`/clusters/${clusterId}`);
}

export async function getOpportunityReport(clusterId: string): Promise<OpportunityReport> {
  return fetchJSON<OpportunityReport>(`/clusters/${clusterId}/report`);
}

export async function generatePRD(clusterId: string): Promise<PRD> {
  return fetchJSON<PRD>(`/clusters/${clusterId}/prd`, { method: "POST" });
}

export async function deleteSearch(id: string): Promise<void> {
  await fetchJSON(`/searches/${id}`, { method: "DELETE" });
}

/** Minimal Validate flow: idea -> 3 keywords -> OR query -> pipeline. Returns SearchResult. */
export async function validateMinimal(idea: string): Promise<SearchResult> {
  return fetchJSON<SearchResult>("/validate-minimal", {
    method: "POST",
    body: JSON.stringify({ idea }),
  });
}
