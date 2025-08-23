import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Pool } from 'pg';

// Database connection pool
let pool: Pool | null = null;

// Initialize database connection
function getPool(): Pool {
	if (!pool) {
		pool = new Pool({
			host: process.env.POSTGRES_HOST || 'localhost',
			port: parseInt(process.env.POSTGRES_PORT || '5432'),
			database: process.env.POSTGRES_DATABASE || 'postgres',
			user: process.env.POSTGRES_USER || 'postgres',
			password: process.env.POSTGRES_PASSWORD || '',
			ssl:
				process.env.NODE_ENV === 'production'
					? { rejectUnauthorized: false }
					: false,
		});
	}
	return pool;
}

// Initialize Gemini AI
function getGeminiAI(): GoogleGenerativeAI {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'GOOGLE_GENERATIVE_AI_API_KEY environment variable is required'
		);
	}
	return new GoogleGenerativeAI(apiKey);
}

// Get database schema information
export async function getDatabaseSchema(): Promise<string> {
	const client = await getPool().connect();

	try {
		// Get all tables
		const tablesQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `;

		const result = await client.query(tablesQuery);

		// Group columns by table
		const schema: Record<string, any[]> = {};
		result.rows.forEach((row) => {
			if (!schema[row.table_name]) {
				schema[row.table_name] = [];
			}
			schema[row.table_name].push({
				column: row.column_name,
				type: row.data_type,
				nullable: row.is_nullable === 'YES',
				default: row.column_default,
			});
		});

		// Format schema as a readable string
		let schemaString = 'Database Schema:\n\n';
		for (const [tableName, columns] of Object.entries(schema)) {
			schemaString += `Table: ${tableName}\n`;
			columns.forEach((col) => {
				schemaString += `  - ${col.column} (${col.type})${
					col.nullable ? ' NULL' : ' NOT NULL'
				}`;
				if (col.default) {
					schemaString += ` DEFAULT ${col.default}`;
				}
				schemaString += '\n';
			});
			schemaString += '\n';
		}

		return schemaString;
	} finally {
		client.release();
	}
}

// Call Gemini AI to convert natural language to SQL
export async function callGeminiApi(prompt: string): Promise<string> {
	const genAI = getGeminiAI();
	const model = genAI.getGenerativeModel({
		model: 'gemini-1.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: {
				description: 'A string which is a PostgreSQL SELECT statement.',
				type: SchemaType.STRING,
			},
		},
	});

	try {
		const result = await model.generateContent(prompt);
		const sqlStatement = JSON.parse(result.response.text());

		// Basic validation to ensure we got SQL back
		if (
			!sqlStatement.toLowerCase().includes('select') &&
			!sqlStatement.toLowerCase().includes('insert') &&
			!sqlStatement.toLowerCase().includes('update') &&
			!sqlStatement.toLowerCase().includes('delete')
		) {
			throw new Error(
				'Generated response does not appear to be a valid SQL statement'
			);
		}

		return sqlStatement;
	} catch (error) {
		console.error('Gemini API error:', error);
		throw new Error(
			`Failed to generate SQL: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

// Execute SQL query safely
export async function executeSql(sqlStatement: string): Promise<any> {
	const client = await getPool().connect();

	try {
		// Basic security check - only allow SELECT queries for now
		const trimmedSql = sqlStatement.trim().toLowerCase();

		if (!trimmedSql.startsWith('select ')) {
			console.error(
				'SQL Security Violation - Non-SELECT query attempted:',
				sqlStatement
			);
			throw new Error(
				`Only SELECT queries are allowed for security reasons!`
			);
		}

		// Execute the query
		const result = await client.query(sqlStatement);

		return {
			rows: result.rows,
			rowCount: result.rowCount,
			fields: result.fields.map((field) => ({
				name: field.name,
				dataTypeID: field.dataTypeID,
			})),
		};
	} catch (error) {
		console.error('SQL execution error:', error);
		console.error('Failed SQL statement:', sqlStatement);
		throw new Error(
			`SQL execution failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	} finally {
		client.release();
	}
}

// Close database connection pool
export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
