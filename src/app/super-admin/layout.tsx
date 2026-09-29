import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'SUPER_ADMIN') {
    // Non-Super Admins are redirected to their allowed context
    if (user.role === 'POLITICAL_AGENT') {
      redirect('/agent');
    } else if (user.campaignId) {
      redirect(`/campaigns/${user.campaignId}`);
    } else {
      redirect('/campaigns/new');
    }
  }

  return <>{children}</>;
}
