// electron/sync/netMonitor.ts
// ─────────────────────────────────────────────────────────────
// Monitors internet connectivity and triggers sync when
// the connection is restored after being offline.
//
// HOW IT WORKS:
//   Every N seconds, it tries to reach a reliable URL
//   (e.g. Cloudflare DNS). If it reaches it and we were
//   previously offline, it fires the onReconnect callback.
//
// WHY NOT use the OS network events?
//   Being "connected to WiFi" doesn't mean the internet is
//   actually reachable. Probing a real URL is more reliable.
// ─────────────────────────────────────────────────────────────

export class NetMonitor {
  private isOnline: boolean = true
  private intervalId: ReturnType<typeof setInterval> | null = null
  private onReconnect?: () => void
  private onDisconnect?: () => void
  private checkUrl: string
  private intervalMs: number

  constructor(options?: { checkUrl?: string; intervalMs?: number }) {
    // Cloudflare DNS — reliable, fast, globally available
    this.checkUrl    = options?.checkUrl    ?? 'http://localhost:3000/health'
    this.intervalMs  = options?.intervalMs  ?? 30_000 // check every 30s
  }

  // ── Start monitoring ──────────────────────────────────────
  start(callbacks: { onReconnect?: () => void; onDisconnect?: () => void }) {
    this.onReconnect   = callbacks.onReconnect
    this.onDisconnect  = callbacks.onDisconnect

    // Run immediately on start, then on interval
    this.check()
    this.intervalId = setInterval(() => this.check(), this.intervalMs)
    console.log('[NetMonitor] Started, checking every', this.intervalMs / 1000, 'seconds')
  }

  // ── Stop monitoring ───────────────────────────────────────
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[NetMonitor] Stopped')
  }

  // ── Check connectivity ────────────────────────────────────
  private async check() {
    try {
      // AbortController gives us a timeout — don't wait forever
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 5000)

      await fetch(this.checkUrl, {
        method:  'HEAD',    // HEAD is lightest — no body downloaded
        signal:  controller.signal,
        cache:   'no-cache',
      })

      clearTimeout(timeout)

      if (!this.isOnline) {
        // Was offline, now online
        console.log('[NetMonitor] Connection restored')
        this.isOnline = true
        this.onReconnect?.()
      }

    } catch {
      if (this.isOnline) {
        // Was online, now offline
        console.log('[NetMonitor] Connection lost')
        this.isOnline = false
        this.onDisconnect?.()
      }
    }
  }

  getIsOnline(): boolean { return this.isOnline }
}
