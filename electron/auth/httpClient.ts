// electron/auth/httpClient.ts
// ─────────────────────────────────────────────────────────────
// WHY THIS EXISTS:
//   Every sync request needs an Authorization header.
//   If the server returns 401, it means the access token expired.
//   We refresh automatically, then retry the original request.
//   The caller never needs to know this happened.
//
// FLOW:
//   request()
//     → attach access token
//     → if 401 → tryRefresh()
//         → if refresh ok  → retry original request with new token
//         → if refresh fail → clearTokens() → throw AuthExpiredError
//     → caller catches AuthExpiredError → shows login screen
// ─────────────────────────────────────────────────────────────

import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearTokens,
} from './tokenStore'

export const API_BASE = process.env.CLOUD_API_URL ?? 'http://localhost:3000/api/v1'

// Custom error so the app knows to show the login screen
export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired. Please log in again.')
    this.name = 'AuthExpiredError'
  }
}

// ── Main request function ─────────────────────────────────────
export async function request<T = any>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {

  const accessToken = getAccessToken()

  const response = await fetchWithToken(method, path, body, accessToken)

  // ── Happy path ────────────────────────────────────────────
  if (response.ok) {
    return response.json() as Promise<T>
  }

  // ── 401 → try refresh ─────────────────────────────────────
  if (response.status === 401) {
    const newToken = await tryRefresh()

    // Retry original request with new access token
    const retried = await fetchWithToken(method, path, body, newToken)

    if (retried.ok) {
      return retried.json() as Promise<T>
    }

    // Retry also failed — clear tokens and force login
    clearTokens()
    throw new AuthExpiredError()
  }

  // ── Other errors ──────────────────────────────────────────
  const errorBody = await response.json().catch(() => ({})) as any
  throw new Error(errorBody?.message ?? `Request failed: ${response.status}`)
}

// ── Fetch with Authorization header ──────────────────────────
async function fetchWithToken(
  method: string,
  path: string,
  body: object | undefined,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── Try to refresh the access token ──────────────────────────
async function tryRefresh(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    clearTokens()
    throw new AuthExpiredError()
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    // Refresh token also expired or invalid
    clearTokens()
    throw new AuthExpiredError()
  }

  const data = await response.json() as { access_token: string }

  // Save new access token
  updateAccessToken(data.access_token)

  console.log('[Auth] Access token refreshed')
  return data.access_token
}

// ── Auth specific requests (no token needed) ──────────────────
export async function login(email: string, password: string) {

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any
    throw new Error(err?.message ?? 'Invalid email or password')
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    admin: { id: string; name: string; email: string; role: string }
  }>
}

export async function logout(refreshToken: string): Promise<void> {
  // Best effort — don't throw if this fails
  console.log("Logout from fe")
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {})
}
