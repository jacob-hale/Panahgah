function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;
  // Dev uses same-origin `/api` via Vite proxy.
  if (import.meta.env.DEV) return '';
  // Production fallback: call Railway backend directly.
  // This avoids relying on frontend `/api` reverse-proxy routing.
  return 'https://panahgah-backend-production.up.railway.app';
}

function getResolvedApiPath(path: string): string {
  const base = resolveApiBaseUrl();
  if (!base) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
}

type ApiFetchOptions = RequestInit & {
  jsonBody?: unknown;
};

function parseApiErrorMessage(text: string, status: number): string {
  const fallback = text || `Request failed with status ${status}`;
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown; title?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    if (typeof parsed.title === 'string' && parsed.title.trim()) return parsed.title;
  } catch {
    // Not JSON, return text as-is.
  }

  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { jsonBody, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(getResolvedApiPath(path), {
      ...rest,
      credentials: 'include',
      headers: {
        ...(jsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: jsonBody !== undefined ? JSON.stringify(jsonBody) : rest.body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Failed to fetch' || err instanceof TypeError) {
      throw new Error(
        'Could not reach the API. In dev: start backend (e.g. `dotnet run` in /backend), keep `npm run dev` for frontend, and use the Vite proxy (leave VITE_API_BASE_URL unset, or set VITE_DEV_API_PROXY_TARGET). In production: ensure VITE_API_BASE_URL points to the live backend URL and that CORS/HTTPS are configured.',
      );
    }
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiErrorMessage(text, response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type SupporterProfileDto = {
  supporter_id: number;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  supporter_type: string;
  email: string;
  phone: string;
  region: string;
  country: string;
  contribution_interests: string[] | null;
};

export type AuthMeResponse = {
  isAuthenticated: boolean;
  email: string | null;
  roles: string[];
  supporterId: number | null;
  supporterProfile: SupporterProfileDto | null;
};
