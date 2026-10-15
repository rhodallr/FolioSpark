import { Fraunces, Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata = {
  title: 'FolioSpark — your AI design partner for portfolio case studies',
  description:
    'A conversational portfolio generator that interviews you like a senior design mentor and checks your story against the jobs you want.',
};

export const viewport = {
  themeColor: '#FBF8F3',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
