import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // SUPER_ADMIN has global view authority across campaigns
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Political agents belong in /agent workflow
  if (user.role === 'POLITICAL_AGENT') {
    redirect('/agent');
  }

  // Campaign Admin: verify membership for requested campaign
  const hasAccess = user.campaigns?.some((c) => c.campaignId === params.id);
  if (!hasAccess) {
    // If user has another campaign, redirect them there; else to new campaign
    if (user.campaignId) {
      redirect(`/campaigns/${user.campaignId}`);
    } else {
      redirect('/campaigns/new');
    }
  }

  return <>{children}</>;
}
