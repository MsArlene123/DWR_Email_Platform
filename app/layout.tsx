import type { Metadata } from 'next';
import { Crimson_Text, Libre_Baskerville, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const crimsonText = Crimson_Text({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-body' });
const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'DocWriteReview — Email Marketing Dashboard',
  description: 'Professional email campaign management for DocWriteReview LLC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${inter.variable} ${crimsonText.variable} ${libreBaskerville.variable} ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
