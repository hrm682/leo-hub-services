import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/**
 * Cabeceras de seguridad aplicadas a TODAS las respuestas del servidor.
 * El CSP se arma con el origen real de Supabase (REST + realtime wss) y Google
 * Fonts. Anti-clickjacking (frame-ancestors), anti-sniffing, HSTS y una política
 * de permisos restrictiva.
 */
let cachedHeaders: Record<string, string> | undefined;
function securityHeaders(): Record<string, string> {
  if (cachedHeaders) return cachedHeaders;

  const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
  let supabaseOrigin = "";
  let supabaseWs = "";
  try {
    const u = new URL(supabaseUrl);
    supabaseOrigin = u.origin;
    supabaseWs = `wss://${u.host}`;
  } catch {
    /* sin URL válida: el CSP queda sin el origen de Supabase */
  }

  const connect = ["'self'", supabaseOrigin, supabaseWs, "https://fonts.googleapis.com"]
    .filter(Boolean)
    .join(" ");
  const img = ["'self'", "data:", "blob:", supabaseOrigin].filter(Boolean).join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src ${img}`,
    `connect-src ${connect}`,
  ].join("; ");

  cachedHeaders = {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
  return cachedHeaders;
}

function withSecurityHeaders(response: Response): Response {
  try {
    for (const [k, v] of Object.entries(securityHeaders())) response.headers.set(k, v);
  } catch {
    /* respuesta con headers inmutables: se devuelve tal cual */
  }
  return response;
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
