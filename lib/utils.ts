import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Metadata } from 'next';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatSql(sql: string) {
	// FIX
	return sql;
}

export function formatExecutionTime(executionTime: number) {
	if (executionTime && executionTime >= 1000) {
		return `${(executionTime / 1000).toFixed(1)}s`;
	}
	return `${executionTime}ms`;
}

export function formatTimestamp(timestamp: string) {
	return new Date(timestamp).toLocaleString();
}

export const truncateMetadataTitle = (title: string): string => {
	if (title.length <= 30) return title;
	return title.slice(0, 27) + '...';
};

export const generateStaticMetadata = ({
	title,
	description,
}: {
	title?: string;
	description?: string;
}): Metadata => {
	return {
		title:
			title || 'LipSQL | Speak to your database using natural language',
		description:
			description ||
			'LipSQL | Speak to your database using natural language',
		manifest: `${process.env.NEXT_PUBLIC_APP_URL}/manifest.json`,
		openGraph: {
			title,
			description,
			siteName: 'LipSQL',
			images: [
				{
					url: 'https://lipsql.platopunk.com/images/og.png',
					width: 1200,
					height: 800,
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			title,
			card: 'summary_large_image',
			description,
			images: ['https://lipsql.platopunk.com/images/og.png'],
		},
		icons: {
			apple: '/images/apple-touch-icon.png',
		},
	};
};
