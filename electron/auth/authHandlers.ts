// electron/auth/authHandlers.ts
// ─────────────────────────────────────────────────────────────
// All auth IPC handlers in one place.
// Call registerAuthHandlers(ipcMain) from main.ts
// ─────────────────────────────────────────────────────────────

import { IpcMain, BrowserWindow } from 'electron'
import { saveTokens, clearTokens, getUser, loadTokens, getRefreshToken } from './tokenStore'
import { login, logout } from './httpClient'

export function registerAuthHandlers(ipcMain: IpcMain) {

  // ── Login ──────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_e, email: string, password: string) => {
    try {
      const data = await login(email, password)


      saveTokens({
        accessToken:  data.access_token,
        refreshToken: data.refresh_token,
        user:         data.admin,
      })
      console.log('Login result:', data)

      return { success: true, user: data.admin }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Logout ─────────────────────────────────────────────────
  ipcMain.handle('auth:logout', async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await logout(refreshToken)
    } catch {}
    clearTokens()
    return { success: true }
  })

  // ── Get current user ───────────────────────────────────────
  // Called on app startup to check if already logged in
ipcMain.handle('auth:getUser', () => {
  const tokens = loadTokens()
  if (!tokens) return { success: false }

  try {
    const payload = JSON.parse(
      Buffer.from(tokens.refreshToken.split('.')[1], 'base64').toString('utf8')
    )
    const refreshExpired = Date.now() >= payload.exp * 1000
  console.log(refreshExpired)

    if (refreshExpired) {
      console.log('[Auth] Refresh token expired — logging out')
      clearTokens()
      return { success: false }
    }
  } catch {}

  return { success: true, user: tokens.user }
})

  // ── Session expired event ──────────────────────────────────
  // Called by syncEngine or any other main process code
  // when it gets an AuthExpiredError — tells React to show login
  ipcMain.handle('auth:isLoggedIn', () => {
    console.log(!!loadTokens() ? '[Auth] User is logged in' : '[Auth] No user logged in')
    return !!loadTokens()
  })
}

// Called from syncEngine or httpClient when session expires
// Sends an event to the renderer so React shows the login screen
export function notifySessionExpired(getWin: () => BrowserWindow | null) {
  clearTokens()
  getWin()?.webContents.send('auth:sessionExpired')
}
