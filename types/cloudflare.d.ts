declare module "cloudflare:workers" {
  export const env: Record<string, unknown> & { DB?: unknown };
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  readonly __careerHqD1Brand?: "D1Database";
}
