import type { Metadata } from 'next';
import {siteOrigin} from './lib/site-url';
import '@fontsource/bodoni-moda/latin-500.css';
import './globals.css';
import './public.css';
export const metadata: Metadata = { metadataBase: new URL(siteOrigin()), title: 'Listory — Every listing has a story.', description: 'Discover thoughtfully presented homes and the agents behind them on Listory.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
