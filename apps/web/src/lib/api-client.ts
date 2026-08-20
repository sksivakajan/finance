import { getAccessToken, setAccessToken } from "./token-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// /uploads returns a root-relative path (e.g. "/uploads/{userId}/{file}").
// Some endpoints (profile avatarUrl) validate that field as an absolute URL,
// so callers that persist an upload's path elsewhere need it qualified. API_URL
// itself may be relative too (NEXT_PUBLIC_API_URL="/api", proxied same-origin
// per next.config.ts) so it isn't enough on its own -- fall back to the
// browser's own origin to get something actually absolute.
export function toAbsoluteApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_URL.startsWith("http") ? API_URL : `${window.location.origin}${API_URL}`;
  return `${base}${path}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; issues?: { path: string; message: string }[] };
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    // non-JSON error body; fall through to generic message
  }
  return new ApiError(
    res.status,
    body.error?.code ?? "UNKNOWN_ERROR",
    body.error?.message ?? "Something went wrong. Please try again.",
    body.error?.issues,
  );
}

let refreshInFlight: Promise<boolean> | null = null;

// Single-flight: concurrent 401s from several requests only trigger one
// refresh call, and they all await the same promise.
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          return false;
        }
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => {
        setAccessToken(null);
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !isRetry && path !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, true);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// Separate from apiFetch: a multipart body must NOT get a manual
// Content-Type header (the browser has to set its own boundary=... value),
// where apiFetch always forces application/json whenever a body is present.
async function apiUpload<T>(path: string, formData: FormData, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiUpload<T>(path, formData, true);
  }

  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, { method: "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined }),
  uploadFile: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<{ url: string }>("/uploads", formData);
  },
};
