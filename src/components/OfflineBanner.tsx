import { useNetworkStatus } from "../hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline, isReady } = useNetworkStatus();

  if (!isReady || isOnline) return null; // ← wait for first check before rendering

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      <div style={s.banner}>
        <span style={s.icon}>⚠</span>
        No internet connection — You'll be unable to login and Some features may be unavailable. Check internet connecttion or Sign in again
      </div>
    </>
  );
}
const s: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#f59e0b',
    color: '#1a1a1a',
    textAlign: 'center',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 500,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    animation: 'slideUp 0.3s ease-out',
  },
  icon: {
    fontSize: '15px',
  },
};