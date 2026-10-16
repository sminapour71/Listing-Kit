import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ListingKit — Your listings, beautifully presented', description: 'A considered workspace for exceptional real estate marketing.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
