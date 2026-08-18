// Access tokens live in memory only (never localStorage — see docs/BLUEPRINT.md
// §8), so this is a plain module-scoped store outside the React tree. The
// refresh token is an httpOnly cookie the browser manages on its own.
type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const listener of listeners) listener(token);
}

export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
