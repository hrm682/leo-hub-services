import { queryOptions } from "@tanstack/react-query";

import { getProductBySlug, listCatalog } from "@/lib/catalog.functions";
import { getMyServices, getPortalSummary, getServiceDetail } from "@/lib/portal.functions";
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
