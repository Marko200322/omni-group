import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const syne = Syne({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: {
    default: 'Omni Group',
    template: '%s · Omni Group',
  },
  description:
    'Omni Group — premium web, klijentski workspace i operator konzola. Moduli: Atina, Astra, Titan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${inter.variable} ${syne.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

