// External app URLs. The agent portal is a separate app (apps/portal).
export const PORTAL_URL: string =
  (import.meta as any).env?.VITE_PORTAL_URL || 'http://localhost:3001';

export const portalLink = (path = '/') => `${PORTAL_URL.replace(/\/+$/, '')}${path}`;

/** Partner login, then the group so the agent can see the fare and book seats. */
export const portalLoginForGroup = (productId: string, departureId?: string) => {
  const dest = departureId
    ? `/groups/${encodeURIComponent(productId)}?departure=${encodeURIComponent(departureId)}`
    : `/groups/${encodeURIComponent(productId)}`;
  return portalLink(`/login?next=${encodeURIComponent(dest)}`);
};
