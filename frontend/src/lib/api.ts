const API_BASE = "/api";

export interface SearchResult {
  id: string;
  query: string;
  status: string;
  sources: string[];
  total_posts_fetched: number;
  total_complaints_found: number;
  total_relevant_complaints: number;
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
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createSearch(query: string, sources: string[]): Promise<SearchResult> {
  return fetchJSON<SearchResult>("/searches", {
    method: "POST",
    body: JSON.stringify({ query, sources }),
  });
}

export async function listSearches(): Promise<SearchResult[]> {
  return fetchJSON<SearchResult[]>("/searches");
}

export async function getSearch(id: string): Promise<SearchResult> {
  return fetchJSON<SearchResult>(`/searches/${id}`);
}

export async function getClusters(searchId: string): Promise<Cluster[]> {
  return fetchJSON<Cluster[]>(`/searches/${searchId}/clusters`);
}

export async function listAllClusters(): Promise<ClusterWithQuery[]> {
  return fetchJSON<ClusterWithQuery[]>("/clusters");
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
