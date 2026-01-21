import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Voice Agent - Sprachaufnahme & KI-Transkription',
  description: 'Desktop-Anwendung zur Sprachaufnahme, Transkription und KI-gestützten Anreicherung von Spracheingaben.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
