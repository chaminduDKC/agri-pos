

import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearTokens,
} from './tokenStore'

export const API_BASE = process.env.CLOUD_API_URL ?? 'http://localhost:3000/api/v1'

export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired. Please log in again.')
    this.name = 'AuthExpiredError'
  }
}

export async function request<T = any>(
  method: string,
  path: string,
  body?: object,
  responseType: 'json' | 'blob' | 'arraybuffer' = 'json'
): Promise<T> {

  const accessToken = getAccessToken()

  const response = await fetchWithToken(method, path, body, accessToken)

  if (response.ok) {
   return parseResponse(response, responseType) as Promise<T>
  }

  if (response.status === 401) {
    const newToken = await tryRefresh()

    const retried = await fetchWithToken(method, path, body, newToken)

    if (retried.ok) {
       return parseResponse(retried, responseType) as Promise<T>
    }

    clearTokens()
    console.log("FDsdsad")
    throw new AuthExpiredError()
  }

  const errorBody = await response.json().catch(() => ({})) as any
  throw new Error(errorBody?.message ?? `Request failed: ${response.status}`)
}


async function parseResponse(response: Response, type: 'json' | 'blob' | 'arraybuffer') {
  if (type === 'blob')        return response.blob()
  if (type === 'arraybuffer') return response.arrayBuffer()
  return response.json()
}

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
    
    clearTokens()
    throw new AuthExpiredError()
  }

  const data = await response.json() as { access_token: string }
  
  updateAccessToken(data.access_token)

  return data.access_token
}

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

  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {})
}
