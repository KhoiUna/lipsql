import { NextRequest, NextResponse } from 'next/server';
import { getSavedQueries, saveQueryToSaved } from '@/lib/history-db';
import { verifyAuthentication } from '../api-utils';

export async function GET() {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const savedQueries = getSavedQueries();

		return NextResponse.json({
			success: true,
			savedQueries,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Get saved queries API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch saved queries',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// POST - Save a new query
export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const { savedName, naturalQuery, generatedSql } = await request.json();

		// Validate input
		if (
			!savedName ||
			typeof savedName !== 'string' ||
			savedName.trim().length === 0
		) {
			return NextResponse.json(
				{
					error: 'Saved name is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		if (
			!generatedSql ||
			typeof generatedSql !== 'string' ||
			generatedSql.trim().length === 0
		) {
			return NextResponse.json(
				{
					error: 'Generated SQL is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		// Save the query
		saveQueryToSaved(
			savedName.trim(),
			naturalQuery?.trim() || null,
			generatedSql.trim()
		);

		return NextResponse.json({
			success: true,
			message: 'Query saved successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Save query API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to save query',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
