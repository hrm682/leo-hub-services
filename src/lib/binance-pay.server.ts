import { createHmac, randomBytes } from "node:crypto";

/**
 * Cliente firmado para la Binance Pay Merchant API. Solo servidor: nunca se
 * importa desde código que llegue al bundle del cliente. Las credenciales viven
 * en variables de entorno de servidor SIN prefijo `VITE_`.
 *
 * Docs: https://developers.binance.com/docs/binance-pay/api-order-create-v3
 */

const BASE = () => process.env["BINANCE_PAY_BASE_URL"] || "https://bpay.binanceapi.com";
const KEY = () => process.env["BINANCE_PAY_API_KEY"];
const SECRET = () => process.env["BINANCE_PAY_API_SECRET"];

/** ¿Hay credenciales de Binance Pay configuradas en el servidor? */
export function binancePayConfigured(): boolean {
  return Boolean(KEY() && SECRET());
}

/**
 * Firma canónica de Binance Pay: HMAC-SHA512 del payload
 * `timestamp\n nonce\n body\n`, en hexadecimal mayúsculas.
 */
export function buildSignature(
  timestamp: string,
  nonce: string,
  body: string,
  secret: string,
): string {
  return createHmac("sha512", secret)
    .update(`${timestamp}\n${nonce}\n${body}\n`)
    .digest("hex")
    .toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function signedPost(path: string, payload: unknown): Promise<any> {
  const key = KEY();
  const secret = SECRET();
  if (!key || !secret) throw new Error("Binance Pay no está configurado");

  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex"); // 32 chars
  const signature = buildSignature(timestamp, nonce, body, secret);

  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": timestamp,
      "BinancePay-Nonce": nonce,
      "BinancePay-Certificate-SN": key,
      "BinancePay-Signature": signature,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status !== "SUCCESS") {
    throw new Error(`Binance Pay: ${json.errorMessage || json.code || res.status}`);
  }
  return json.data;
}

export type BinanceCreateOrderInput = {
  merchantTradeNo: string;
  amount: number;
  goodsName: string;
  referenceGoodsId: string;
};

export type BinanceCreatedOrder = {
  prepayId: string;
  checkoutUrl: string;
  qrContent: string;
  deeplink: string;
  universalUrl: string;
  merchantTradeNo: string;
};

/** Crea una orden de cobro en Binance Pay (USDT) y devuelve los enlaces de pago. */
export async function createBinanceOrder(
  input: BinanceCreateOrderInput,
): Promise<BinanceCreatedOrder> {
  const data = await signedPost("/binancepay/openapi/v3/order", {
    env: { terminalType: "WEB" },
    merchantTradeNo: input.merchantTradeNo,
    orderAmount: Number(input.amount.toFixed(2)),
    currency: "USDT",
    goods: {
      goodsType: "02",
      goodsCategory: "Z000",
      referenceGoodsId: input.referenceGoodsId,
      goodsName: input.goodsName,
    },
  });
  return {
    prepayId: String(data.prepayId),
    checkoutUrl: String(data.checkoutUrl),
    qrContent: String(data.qrContent ?? ""),
    deeplink: String(data.deeplink ?? ""),
    universalUrl: String(data.universalUrl ?? ""),
    merchantTradeNo: input.merchantTradeNo,
  };
}

/**
 * Consulta el estado de una orden. `status` ∈
 * INITIAL | PENDING | PAID | CANCELED | ERROR | REFUNDING | REFUNDED | EXPIRED.
 */
export async function queryBinanceOrder(merchantTradeNo: string): Promise<{ status: string }> {
  const data = await signedPost("/binancepay/openapi/v2/order/query", { merchantTradeNo });
  return { status: String(data.status) };
}
