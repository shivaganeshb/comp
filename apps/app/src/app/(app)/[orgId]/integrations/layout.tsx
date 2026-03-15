<<<<<<< HEAD
export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
=======
import { requireRoutePermission } from '@/lib/permissions.server';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireRoutePermission('integrations', orgId);
  return <>{children}</>;
>>>>>>> upstream/main
}
