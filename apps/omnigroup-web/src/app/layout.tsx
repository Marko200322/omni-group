import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import { rootSiteMetadata } from '@/lib/site-metadata';
import { AtinaAssistantHost } from '@/components/platform/AtinaAssistantHost';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const syne = Syne({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Omni Group Tech',
    template: '%s · Omni Group Tech',
  },
  ...rootSiteMetadata,
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <AtinaAssistantHost />
      </body>
    </html>
  );
}

