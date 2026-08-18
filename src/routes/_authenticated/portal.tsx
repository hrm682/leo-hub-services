import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PortalShell } from "@/components/portal/PortalShell";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}
