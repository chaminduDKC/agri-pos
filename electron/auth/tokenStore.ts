import { safeStorage, app } from 'electron'
import path from 'path'
import fs from 'fs'

const TOKEN_FILE = path.join(app.getPath('userData'), 'auth.enc')

export interface StoredTokens {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function debugToken(): void {
  const token = getAccessToken()
  if (!token) { console.log('[Auth] No token stored bitch'); return }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf8')
    )
    const exp     = new Date(payload.exp * 1000)
    const now     = new Date()
    const expired = now > exp

    console.log('[Auth] Token payload:', payload)
    console.log('[Auth] Expires at:', exp.toLocaleString())
    console.log('[Auth] Current time:', now.toLocaleString())
    console.log('[Auth] Is expired:', expired)
  } catch (err) {
    console.log('[Auth] Failed to decode token:', err)
  }
}
export function saveTokens(tokens: StoredTokens): void {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[Auth] safeStorage unavailable — storing plain text')
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens), 'utf8')
    return
  }
  console.log("Saving token")
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens))
  fs.writeFileSync(TOKEN_FILE, encrypted)
}

export function loadTokens(): StoredTokens | null {
  if (!fs.existsSync(TOKEN_FILE)) return null
  try {
    const raw = fs.readFileSync(TOKEN_FILE)
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(raw.toString('utf8')) as StoredTokens
    }
    return JSON.parse(safeStorage.decryptString(raw)) as StoredTokens
  } catch {
    clearTokens()
    return null
  }
}

export function updateAccessToken(accessToken: string): void {
  const current = loadTokens()
  if (!current) return
  saveTokens({ ...current, accessToken })
}

export function clearTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE)
}

export function getAccessToken():  string | null { return loadTokens()?.accessToken  ?? null }
export function getRefreshToken(): string | null { return loadTokens()?.refreshToken ?? null }
export function getUser(): StoredTokens['user'] | null { return loadTokens()?.user ?? null }
