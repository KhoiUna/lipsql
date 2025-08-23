import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Metadata } from 'next';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
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
			title || 'PlainSQL | Speak to your database using natural language',
		description:
			description ||
			'PlainSQL | Speak to your database using natural language',
		manifest: 'https://plainsql.platopunk.com/manifest.json',
		openGraph: {
			title,
			description,
			siteName: 'PlainSQL',
			images: [
				{
					url: 'https://plainsql.platopunk.com/images/og.png',
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
			images: ['https://plainsql.platopunk.com/images/og.png'],
		},
	};
};
