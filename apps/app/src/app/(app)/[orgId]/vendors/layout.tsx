<<<<<<< HEAD
export default async function Layout({ children }: { children: React.ReactNode }) {
  return <div className="m-auto max-w-[1200px] py-8">{children}</div>;
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
  await requireRoutePermission('vendors', orgId);
  return <>{children}</>;
>>>>>>> upstream/main
}
