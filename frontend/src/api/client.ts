function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;
  // Default to same-origin so deployments can proxy `/api` from the web server (e.g., Nginx).
  // This keeps auth cookies first-party and works with a strict `connect-src 'self'` CSP.
  return '';
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
    const parsed = JSON.parse(text) as {
      error?: unknown;
      message?: unknown;
      title?: unknown;
      detail?: unknown;
      hint?: unknown;
    };
    const primary =
      (typeof parsed.error === 'string' && parsed.error.trim() ? parsed.error : null) ??
      (typeof parsed.detail === 'string' && parsed.detail.trim() ? parsed.detail : null) ??
      (typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message : null) ??
      (typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : null);
    if (primary) {
      const hint = typeof parsed.hint === 'string' && parsed.hint.trim() ? parsed.hint.trim() : '';
      return hint ? `${primary}\n${hint}` : primary;
    }
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
