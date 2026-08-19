import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal/cuenta")({
  component: AccountLayout,
});

function AccountLayout() {
  return <Outlet />;
}
