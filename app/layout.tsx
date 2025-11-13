import './globals.css';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { generateStaticMetadata } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/components/query-provider';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

export const metadata: Metadata = generateStaticMetadata({});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} antialiased`}>
				<QueryProvider>
					<Toaster />
					<main>{children}</main>
				</QueryProvider>
			</body>
		</html>
	);
}
