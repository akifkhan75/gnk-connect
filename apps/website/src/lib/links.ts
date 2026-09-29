// External app URLs. The agent portal is a separate app (apps/portal).
export const PORTAL_URL: string =
  (import.meta as any).env?.VITE_PORTAL_URL || 'http://localhost:3001';

export const portalLink = (path = '/') => `${PORTAL_URL.replace(/\/+$/, '')}${path}`;
