import { queryOptions } from "@tanstack/react-query";

import { getProductBySlug, listCatalog } from "@/lib/catalog.functions";
import {
  getMyProfile,
  getMyServices,
  getMyTickets,
  getNotifications,
  getPortalSummary,
  getPrivateProfiles,
  getServiceDetail,
  getTicketDetail,
} from "@/lib/portal.functions";
import { getOrderDetail } from "@/lib/shop.functions";

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalogo"],
  queryFn: () => listCatalog(),
  staleTime: 60_000,
});

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["catalogo", "producto", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

export const portalSummaryQueryOptions = queryOptions({
  queryKey: ["portal", "resumen"],
  queryFn: () => getPortalSummary(),
});

export const myServicesQueryOptions = queryOptions({
  queryKey: ["portal", "servicios"],
  queryFn: () => getMyServices(),
});

export const serviceDetailQueryOptions = (serviceId: string) =>
  queryOptions({
    queryKey: ["portal", "servicio", serviceId],
    queryFn: () => getServiceDetail({ data: { serviceId } }),
  });

export const orderDetailQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: ["orden", orderId],
    queryFn: () => getOrderDetail({ data: { orderId } }),
  });

export const myProfileQueryOptions = queryOptions({
  queryKey: ["portal", "perfil"],
  queryFn: () => getMyProfile(),
});

export const myTicketsQueryOptions = queryOptions({
  queryKey: ["portal", "tickets"],
  queryFn: () => getMyTickets(),
});

export const ticketDetailQueryOptions = (ticketId: string) =>
  queryOptions({
    queryKey: ["portal", "ticket", ticketId],
    queryFn: () => getTicketDetail({ data: { ticketId } }),
  });

export const notificationsQueryOptions = queryOptions({
  queryKey: ["portal", "notificaciones"],
  queryFn: () => getNotifications(),
  refetchInterval: 60_000,
});
