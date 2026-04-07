const envUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  typeof envUrl === 'string' && envUrl.trim().length > 0 ? envUrl.trim() : 'https://localhost:7270';

type ApiFetchOptions = RequestInit & {
  jsonBody?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { jsonBody, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(jsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : rest.body,
  });

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
