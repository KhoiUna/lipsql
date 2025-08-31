import { NextResponse } from 'next/server';
import {
	getDatabaseSchema,
	getDatabaseType,
	getTableRelationships,
} from '@/lib/db-utils';
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

		// Get database schema information
		const schema = await getDatabaseSchema();
		const dbType = getDatabaseType();
		const relationships = await getTableRelationships();

		return NextResponse.json({
			success: true,
			databaseType: dbType,
			schema: schema,
			relationships: relationships,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Schema API Error:', error);

		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';

		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch database schema information',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
