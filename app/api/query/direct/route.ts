import { NextRequest, NextResponse } from 'next/server';
import { executeSql } from '@/lib/db-utils';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

// Reusable authentication function
async function verifyAuthentication(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const cookieStore = await cookies();
		const authCookie = cookieStore.get('plainsql-auth');

		if (!authCookie) {
			return { success: false, error: 'Authentication required' };
		}

		// Verify the JWT token
		const secret = new TextEncoder().encode(JWT_SECRET);
		const { payload } = await jwtVerify(authCookie.value, secret);

		// Check if token is valid and user is authenticated
		if (!payload.authenticated || !payload.username) {
			return { success: false, error: 'Invalid authentication token' };
		}

		return { success: true };
	} catch (jwtError) {
		// JWT verification failed (invalid signature, expired, etc.)
		return { success: false, error: 'Authentication failed' };
	}
}

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
		const result = await executeSql(sql);

		// Return results to frontend
		return NextResponse.json({
			success: true,
			sql: sql,
			result: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Direct SQL API Error:', error);

		// Determine error type and provide user-friendly messages
		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';

		let userFriendlyError: string;
		let statusCode: number;

		if (errorMessage.includes('Only SELECT queries')) {
			userFriendlyError =
				'Only SELECT queries are allowed for security reasons!';
			statusCode = 400;
		} else if (errorMessage.includes('SQL execution failed')) {
			userFriendlyError =
				'Database query failed. Please check your SQL and try again.';
			statusCode = 500;
		} else if (errorMessage.includes('SQL parameter is required')) {
			userFriendlyError =
				'SQL parameter is required and must be a string';
			statusCode = 400;
		} else {
			// Generic server error for unknown issues
			userFriendlyError =
				'An unexpected error occurred. Please try again.';
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
