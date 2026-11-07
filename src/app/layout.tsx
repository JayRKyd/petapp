import type { Metadata, Viewport } from 'next';
import { Nunito, Outfit } from 'next/font/google';
import { BUSINESS } from '@/lib/business';
import './globals.css';

const body = Nunito({ variable: '--font-body', subsets: ['latin'], weight: ['400', '600', '700'] });
const display = Outfit({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600', '700'] });

export const metadata: Metadata = {
  title: BUSINESS.name,
  description: `Book a groom online with ${BUSINESS.name} in ${BUSINESS.town}.`,
};

export const viewport: Viewport = {
  themeColor: '#1E6E5A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
