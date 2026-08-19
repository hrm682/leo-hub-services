import { daysRemaining } from "./format";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

export const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  gold: "bg-primary/15 text-primary border-primary/30",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  pago_pendiente: "Pago pendiente",
  activo: "Activo",
  en_renovacion: "En renovación",
  suspendido: "Suspendido",
  finalizado: "Finalizado",
};

/** Tono visual de un servicio según estado y días restantes. */
export function serviceTone(status: string, expirationDate: string | null): Tone {
  if (status === "en_renovacion" || status === "pago_pendiente") return "info";
  if (status === "suspendido" || status === "finalizado") return "danger";
  if (status === "activo") {
    const days = daysRemaining(expirationDate);
    if (days === null) return "success";
    if (days < 0) return "danger";
    if (days <= 7) return "warning";
    return "success";
  }
  return "neutral";
}

/** Etiqueta de estado visible, considerando vencimiento automático. */
export function serviceDisplayStatus(status: string, expirationDate: string | null): string {
  if (status === "activo") {
    const days = daysRemaining(expirationDate);
    if (days !== null && days < 0) return "Vencido";
    if (days !== null && days <= 7) return "Próximo a vencer";
  }
  return SERVICE_STATUS_LABELS[status] ?? status;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

export const ORDER_STATUS_TONES: Record<string, Tone> = {
  pendiente: "warning",
  pagada: "success",
  rechazada: "danger",
  cancelada: "neutral",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  reembolsado: "Reembolsado",
};

export const PAYMENT_STATUS_TONES: Record<string, Tone> = {
  pendiente: "warning",
  aprobado: "success",
  rechazado: "danger",
  reembolsado: "neutral",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  en_espera: "En espera del cliente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const TICKET_STATUS_TONES: Record<string, Tone> = {
  abierto: "info",
  en_revision: "warning",
  en_espera: "warning",
  en_proceso: "info",
  resuelto: "success",
  cerrado: "neutral",
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  acceso: "Acceso",
  facturacion: "Facturación",
  renovacion: "Renovación",
  cambio_dispositivo: "Cambio de dispositivo",
  consulta: "Consulta general",
  garantia: "Garantía",
  otro: "Otro",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const TICKET_PRIORITY_TONES: Record<string, Tone> = {
  baja: "neutral",
  media: "warning",
  alta: "danger",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  binance_manual: "Binance (pago manual)",
  payphone: "Payphone",
};
