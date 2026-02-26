import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PTW TU Darmstadt - Audio Intelligence',
  description: 'Sprachaufnahme, Transkription und KI-gestützte Anreicherung – PTW TU Darmstadt.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
