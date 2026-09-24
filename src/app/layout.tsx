import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampaignOps AI — Political Campaign Management Platform',
  description: 'AI-assisted political campaign operations platform for voter data, field tracking, and election-day management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
