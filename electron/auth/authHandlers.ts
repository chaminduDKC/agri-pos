// electron/auth/authHandlers.ts
// ─────────────────────────────────────────────────────────────
// All auth IPC handlers in one place.
// Call registerAuthHandlers(ipcMain) from main.ts
// ─────────────────────────────────────────────────────────────

import { IpcMain, BrowserWindow } from 'electron'
import { saveTokens, clearTokens, getUser, loadTokens, getRefreshToken } from './tokenStore'
import { login, logout } from './httpClient'

export function registerAuthHandlers(ipcMain: IpcMain, getWin: () => BrowserWindow | null) {

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
    const user = getUser()
    return user
      ? { success: true, user }
      : { success: false }
  })

  // ── Session expired event ──────────────────────────────────
  // Called by syncEngine or any other main process code
  // when it gets an AuthExpiredError — tells React to show login
  ipcMain.handle('auth:isLoggedIn', () => {
    return !!loadTokens()
  })
}

// Called from syncEngine or httpClient when session expires
// Sends an event to the renderer so React shows the login screen
export function notifySessionExpired(getWin: () => BrowserWindow | null) {
  clearTokens()
  getWin()?.webContents.send('auth:sessionExpired')
}
