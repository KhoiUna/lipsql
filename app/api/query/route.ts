import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseSchema, callGeminiApi, executeSql } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
	try {
		const { query } = await request.json();

		// Validate input
		if (!query || typeof query !== 'string') {
			return NextResponse.json(
				{ error: 'Query parameter is required and must be a string' },
				{ status: 400 }
			);
		}

		// Step 1: Get database schema for context
		console.log('Fetching database schema...');
		const dbSchema = await getDatabaseSchema();

		// Step 2: Create prompt with schema context and user query
		const prompt = `You are a SQL expert. Given the following database schema:	${dbSchema}
		
		Convert the following natural language query into a valid SQL SELECT statement. 
		Only return the SQL statement, nothing else. Do not include explanations, quotes, or markdown formatting.
		
		User query: "${query}"`;

		// Step 3: Call Gemini AI to generate SQL
		console.log('Generating SQL with Gemini AI...');
		const sqlStatement = await callGeminiApi(prompt);

		// Step 4: Execute the generated SQL query
		console.log('Executing SQL query...');
		const result = await executeSql(sqlStatement);

		// Step 5: Return results to frontend
		return NextResponse.json({
			success: true,
			originalQuery: query,
			sql: sqlStatement,
			result: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('API Error:', error);

		// Return appropriate error response
		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';
		const statusCode = errorMessage.includes('GOOGLE_GENERATIVE_AI_API_KEY')
			? 500
			: errorMessage.includes('Only SELECT queries')
			? 400
			: 500;

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				timestamp: new Date().toISOString(),
			},
			{ status: statusCode }
		);
	}
}

// Handle unsupported methods
export async function GET() {
	return NextResponse.json(
		{
			error: 'Method not allowed. Use POST with a JSON body containing a "query" field.',
		},
		{ status: 405 }
	);
}
