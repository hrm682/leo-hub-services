/**
 * Conserva "a dónde quería ir" el usuario cuando el gate de auth lo envía a /auth
 * (p. ej. al abrir /checkout sin sesión). Se guarda en sessionStorage para
 * sobrevivir al flujo OAuth de página completa.
 */
export const PENDING_AUTH_REDIRECT_KEY = "leohub_pending_redirect";

/** Solo permite rutas internas (empiezan con "/" y no son "//"). */
export function sanitizeAuthRedirect(target: unknown): string | null {
  if (typeof target !== "string" || target.length === 0 || target.length > 200) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  return target;
}

export function savePendingAuthRedirect(target: unknown): void {
  try {
    const safe = sanitizeAuthRedirect(target);
    if (safe) window.sessionStorage.setItem(PENDING_AUTH_REDIRECT_KEY, safe);
  } catch {
    // sessionStorage no disponible — se pierde el destino, no la sesión
  }
}

export function consumePendingAuthRedirect(): string | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_AUTH_REDIRECT_KEY);
    if (raw) window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
    return sanitizeAuthRedirect(raw);
  } catch {
    return null;
  }
}
