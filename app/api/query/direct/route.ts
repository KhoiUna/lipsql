import { NextRequest, NextResponse } from 'next/server';
import { executeSql } from '@/lib/db-utils';
import { verifyAuthentication } from '../../api-utils';
import { formatSql } from '@/lib/utils';

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

		let { sql } = await request.json();
		sql = sql.trim();

		// Validate input
		if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
			return NextResponse.json(
				{ error: 'SQL parameter is required and must be a string' },
				{ status: 400 }
			);
		}

		// Execute the SQL query directly
		console.log('Executing SQL query directly:', sql, '...');
		const startTime = Date.now();
		const result = await executeSql(sql);
		const executionTime = Date.now() - startTime;

		// Return results to frontend
		return NextResponse.json({
			success: true,
			sql: formatSql(sql),
			result,
			executionTime,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Direct SQL API Error:', error);

		// Determine error type and provide user-friendly messages
		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';

		let userFriendlyError: string = errorMessage;
		let statusCode: number;

		if (errorMessage.includes('Only SELECT queries')) {
			userFriendlyError =
				'Only SELECT queries are allowed for security reasons!';
			statusCode = 400;
		} else {
			statusCode = 500;
		}

		return NextResponse.json(
			{
				success: false,
				error: userFriendlyError,
				timestamp: new Date().toISOString(),
			},
			{ status: statusCode }
		);
	}
}

// Handle unsupported methods
export async function GET() {
	return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
