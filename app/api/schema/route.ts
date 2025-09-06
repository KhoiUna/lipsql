import { NextResponse } from 'next/server';
import {
	getDatabaseSchema,
	getDriver,
	getTableRelationships,
	getDatabaseName,
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
		const databaseType = getDriver().databaseType;
		const databaseName = await getDatabaseName();
		const relationships = await getTableRelationships();

		return NextResponse.json({
			success: true,
			databaseType,
			databaseName,
			schema,
			relationships,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Schema API Error:', error);
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
