/**
 * Configuración del pago manual con Binance Pay.
 * TODO: reemplazar BINANCE_PAY_ID por el ID real de LoMaximoLeo cuando esté disponible.
 */
export const BINANCE_PAY_ID = "TU-BINANCE-ID";
export const BINANCE_PAY_NAME = "LoMaximoLeo";
export const BINANCE_PAY_CURRENCY = "USDT";

export const PAYMENT_STEPS: string[] = [
  "Abre Binance y ve a Pay / Pagar.",
  "Ingresa el Binance ID de LoMaximoLeo (o escanea su QR).",
  "Envía el monto exacto de tu orden en USDT.",
  "Toma una captura clara del comprobante.",
  "Sube la captura aquí para activar tu servicio.",
];

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/*,application/pdf";
