import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo")
    .max(100, "Máximo 100 caracteres"),
  email: z.string().trim().email("Correo inválido").max(255),
  phone: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .regex(/^[+0-9()\-\s]*$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(1, "Ingresa tu contraseña").max(72),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(20),
  couponCode: z.string().trim().max(50).optional(),
});

export const attachReceiptSchema = z.object({
  orderId: z.string().uuid(),
  receiptPath: z.string().trim().min(1).max(500),
  transactionReference: z.string().trim().max(120).optional(),
});

export const createRenewalSchema = z.object({
  serviceId: z.string().uuid(),
});

export const createTicketSchema = z.object({
  customerServiceId: z.string().uuid("Selecciona un servicio"),
  category: z.enum(["acceso", "facturacion", "renovacion", "cambio_dispositivo", "consulta", "otro"]),
  priority: z.enum(["baja", "media", "alta"]),
  subject: z.string().trim().min(5, "Describe brevemente el tema").max(140),
  description: z.string().trim().min(10, "Cuéntanos más detalles").max(2000),
  attachmentPath: z.string().trim().max(500).optional(),
});

export const ticketMessageSchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1, "Escribe un mensaje").max(2000),
  attachmentPath: z.string().trim().max(500).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9()\-\s]*$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  documentNumber: z.string().trim().max(30).optional().or(z.literal("")),
  notificationPrefs: z.object({
    email: z.boolean(),
    whatsapp: z.boolean(),
    push: z.boolean(),
    in_app: z.boolean(),
  }),
});

export const reviewPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  approve: z.boolean(),
  reason: z.string().trim().max(300).optional(),
});

export const productInputSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  shortDescription: z.string().trim().max(200),
  description: z.string().trim().max(3000),
  benefits: z.array(z.string().trim().min(1).max(120)).max(12),
  imageUrl: z.string().trim().max(500).nullable(),
  price: z.number().min(0).max(100000),
  durationDays: z.number().int().min(1).max(3650),
  billingLabel: z.string().trim().max(30),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});
