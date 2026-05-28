const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export interface BraveResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  hostname?: string;
}

export async function braveSearch(
  query: string,
  options?: {
    count?: number;
    freshness?: "pd" | "pw" | "pm" | "py"; // day, week, month, year
  },
): Promise<BraveResult[]> {
  const apiKey = process.env["BRAVE_API_KEY"];
  if (!apiKey) throw new Error("BRAVE_API_KEY não configurada");

  const params = new URLSearchParams({ q: query, count: String(options?.count ?? 5) });
  if (options?.freshness) params.set("freshness", options.freshness);

  const res = await fetch(`${BRAVE_API_URL}?${params}`, {
    headers: {
      "X-Subscription-Token": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`Brave Search falhou: ${res.status}`);

  const json = await res.json() as {
    web?: {
      results?: Array<{
        title: string;
        url: string;
        description: string;
        age?: string;
        meta_url?: { hostname: string };
      }>;
    };
  };

  return (json.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
    hostname: r.meta_url?.hostname,
  }));
}
