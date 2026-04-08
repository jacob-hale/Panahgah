function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;
  // Default to same-origin `/api` in both dev and production.
  // - Dev: Vite proxy forwards `/api` to the backend target.
  // - Prod: keeps requests on the deployed origin unless an explicit API base is configured.
  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

type ApiFetchOptions = RequestInit & {
  jsonBody?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { jsonBody, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
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
        'Could not reach the API. In dev: start backend (e.g. `dotnet run` in /backend), keep `npm run dev` for frontend, and use the Vite proxy (leave VITE_API_BASE_URL unset, or set VITE_DEV_API_PROXY_TARGET). In production: ensure /api is routed to the live backend, or set VITE_API_BASE_URL to the backend URL with correct CORS/HTTPS.',
      );
    }
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type SupporterProfileDto = {
  supporter_id: number;
  display_name: string;
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
