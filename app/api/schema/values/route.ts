import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/db-utils';
import { verifyAuthentication } from '../../api-utils';

export async function GET(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const table = searchParams.get('table');
		const column = searchParams.get('column');
		const limit = searchParams.get('limit') || '100';

		// Validate parameters
		if (!table || !column) {
			return NextResponse.json(
				{ error: 'Table and column parameters are required' },
				{ status: 400 }
			);
		}

		// Sanitize table and column names (basic validation)
		const tablePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
		const columnPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

		if (!tablePattern.test(table) || !columnPattern.test(column)) {
			return NextResponse.json(
				{ error: 'Invalid table or column name' },
				{ status: 400 }
			);
		}

		const limitNum = parseInt(limit, 10);
		if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
			return NextResponse.json(
				{ error: 'Limit must be between 1 and 1000' },
				{ status: 400 }
			);
		}

		// Build query to get distinct values
		const driver = getDriver();
		const databaseType = driver.databaseType.toLowerCase();

		let query: string;
		if (databaseType === 'sqlserver' || databaseType === 'mssql') {
			query = `SELECT DISTINCT TOP ${limitNum} "${column}" FROM "${table}" WHERE "${column}" IS NOT NULL ORDER BY "${column}"`;
		} else {
			// PostgreSQL and other databases
			query = `SELECT DISTINCT "${column}" FROM "${table}" WHERE "${column}" IS NOT NULL ORDER BY "${column}" LIMIT ${limitNum}`;
		}

		const result = await driver.query(query);

		// Extract values from result
		const rows = result.recordset || result.rows || [];
		const values = rows.map((row: any) => row[column]);

		return NextResponse.json({
			success: true,
			table,
			column,
			values,
			count: values.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Schema Values API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch column values',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
