const API_BASE = "/api";

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

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    // First attempt allows 90s for cold starts; retries allow 30s each
    const timeout = attempt === 1 ? 90_000 : 30_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Retry on 502/503 (backend cold start on Render free tier)
      if ((res.status === 502 || res.status === 503) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 8000 : 5000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);

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

  throw new Error("Request failed after retries");
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
