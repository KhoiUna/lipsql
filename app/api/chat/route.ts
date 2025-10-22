import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { verifyAuthentication } from '../api-utils';
import { getDatabaseSchema } from '@/lib/db-utils';
import { schemaToString } from '@/lib/db-utils';
import { GEMINI_MODEL } from '@/lib/constants';

export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return new Response('Unauthorized', { status: 401 });
		}

		const { messages } = await request.json();

		// Get database schema for context
		const dbSchema = await getDatabaseSchema();
		const schemaInfo = schemaToString(dbSchema);
		const databaseType = process.env.DATABASE_TYPE || 'postgres';

		const result = streamText({
			model: google(GEMINI_MODEL),
			messages,
			system: `You are a SQL expert assistant helping users with database queries. 

Database Schema:
${schemaInfo}
Database Type: ${databaseType}

CRITICAL SECURITY RULES - YOU MUST FOLLOW THESE:
1. ONLY generate SELECT statements - NEVER INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, or any other data modification commands
2. NEVER include any system tables, information_schema, or metadata queries that could expose database structure
3. NEVER include queries that could reveal sensitive information like passwords, API keys, personal data, or system information
4. NEVER include queries that could cause performance issues (e.g., CROSS JOINs without limits, recursive CTEs)
5. NEVER include queries that access files, network resources, or execute system commands
6. NEVER include queries with potential for SQL injection or malicious code execution
7. ONLY query the tables and columns provided in the schema - do not assume other tables exist
8. If the user query requests data modification, data deletion, or system information, respond with "SELECT 1 as message WHERE 1=0" (empty result)

Your role:
- Help users write SQL queries for the provided database schema
- Identify parameters in SQL queries that could be made dynamic
- Suggest improvements to queries
- Explain SQL concepts and best practices
- When you see SQL with literal values in WHERE clauses, suggest making them parameters

Format SQL code blocks with proper syntax highlighting. Be helpful and educational while maintaining security.`,
		});

		return result.toTextStreamResponse();
	} catch (error) {
		console.error('Chat API Error:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}
