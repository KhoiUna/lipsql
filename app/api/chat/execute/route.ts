import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import { executeSql } from '@/lib/db-utils';

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

		const { sql, parameters } = await request.json();

		// Validate input
		if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
			return NextResponse.json(
				{ error: 'SQL parameter is required and must be a string' },
				{ status: 400 }
			);
		}

		// Substitute parameters in SQL
		let finalSql = sql;
		if (parameters && typeof parameters === 'object') {
			for (const [field, value] of Object.entries(parameters)) {
				if (value === null || value === undefined || value === '') {
					continue; // Skip empty values
				}

				let sqlValue: string;
				if (Array.isArray(value)) {
					// For multiselect/IN operator
					sqlValue = value.map((v) => `'${v}'`).join(', ');
				} else if (
					typeof value === 'object' &&
					'from' in value &&
					'to' in value
				) {
					// For daterange
					sqlValue = `'${value.from}' AND '${value.to}'`;
				} else {
					// For single values
					sqlValue = `'${value}'`;
				}

				// Replace parameter placeholders in SQL
				finalSql = finalSql.replace(
					new RegExp(`:${field}`, 'g'),
					sqlValue
				);
			}
		}

		// Execute the SQL query
		console.log('Executing SQL query:', finalSql, '...');
		const result = await executeSql(finalSql);

		return NextResponse.json({
			success: true,
			sql: finalSql,
			result: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Execute Chat Query API Error:', error);

		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
