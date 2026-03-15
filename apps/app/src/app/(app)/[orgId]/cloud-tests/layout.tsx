<<<<<<< HEAD
export default function TestsDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div>{children}</div>
    </div>
  );
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
  await requireRoutePermission('cloud-tests', orgId);
  return <>{children}</>;
>>>>>>> upstream/main
}
