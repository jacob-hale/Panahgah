function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;
  // Dev: same-origin `/api` is proxied by Vite to the backend (see vite.config.ts).
  if (import.meta.env.DEV) return '';
  return 'https://localhost:7270';
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
        'Could not reach the API. Start the backend (e.g. `dotnet run` in /backend), keep `npm run dev` for the frontend, ' +
          'and in dev use the Vite proxy (leave VITE_API_BASE_URL unset). If you use a full API URL instead, fix CORS and HTTPS (or set VITE_DEV_API_PROXY_TARGET to http://localhost:5238 and run the API HTTP profile).',
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
