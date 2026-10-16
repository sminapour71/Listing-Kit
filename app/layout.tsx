import type { Metadata } from 'next';
import '@fontsource/bodoni-moda/latin-500.css';
import './globals.css';
export const metadata: Metadata = { title: 'Listory — Your listings, beautifully presented', description: 'Listory: a considered workspace for exceptional real estate marketing.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
