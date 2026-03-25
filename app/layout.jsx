import { Inter } from 'next/font/google';
import './globals.css';

const geist = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FarmLink - Farm Equipment Marketplace',
  description: 'Rent and lend agricultural equipment easily',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-[#f7f5f0] text-[#1a1a1a] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
