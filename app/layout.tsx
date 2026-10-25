import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
export const metadata: Metadata = { title: 'who travel', description: 'Маршруты, места и документы ваших поездок' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body>{children}</body></html>; }
