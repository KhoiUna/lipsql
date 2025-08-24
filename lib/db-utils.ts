import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Pool } from 'pg';
import * as sql from 'mssql';

// Database driver abstraction
interface DatabaseDriver {
	connect(): Promise<any>;
	query(sql: string): Promise<any>;
	getSchema(): Promise<string>;
	close(): Promise<void>;
}

// PostgreSQL driver implementation
class PostgresDriver implements DatabaseDriver {
	private pool: Pool | null = null;

	async connect() {
		if (!this.pool) {
			this.pool = new Pool({
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
		return this.pool.connect();
	}

	async query(sql: string) {
		const client = await this.connect();
		try {
			return await client.query(sql);
		} finally {
			client.release();
		}
	}

	async getSchema(): Promise<string> {
		const client = await this.connect();

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

	async close() {
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
		}
	}
}

// SQL Server driver implementation
class SqlServerDriver implements DatabaseDriver {
	private connection: sql.ConnectionPool | null = null;

	async connect() {
		if (!this.connection) {
			const connectionString = process.env.SQLSERVER_CONNECTION_STRING;
			if (!connectionString) {
				throw new Error(
					'SQLSERVER_CONNECTION_STRING environment variable is required for SQL Server'
				);
			}

			this.connection = await sql.connect(connectionString);
		}
		return this.connection;
	}

	async query(sql: string) {
		const connection = await this.connect();
		return await connection.request().query(sql);
	}

	async getSchema(): Promise<string> {
		const connection = await this.connect();

		try {
			// SQL Server schema query using INFORMATION_SCHEMA
			const tablesQuery = `
        SELECT 
          t.TABLE_NAME,
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.TABLES t
        JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
      `;

			const result = await connection.request().query(tablesQuery);

			// Group columns by table
			const schema: Record<string, any[]> = {};
			result.recordset.forEach((row: any) => {
				if (!schema[row.TABLE_NAME]) {
					schema[row.TABLE_NAME] = [];
				}
				schema[row.TABLE_NAME].push({
					column: row.COLUMN_NAME,
					type: row.DATA_TYPE,
					nullable: row.IS_NULLABLE === 'YES',
					default: row.COLUMN_DEFAULT,
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
		} catch (error) {
			console.error('SQL Server schema extraction error:', error);
			throw new Error(
				`Failed to extract database schema: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}

	async close() {
		if (this.connection) {
			await this.connection.close();
			this.connection = null;
		}
	}
}

// Database factory
function getDatabaseDriver(): DatabaseDriver {
	const dbType = process.env.DATABASE_TYPE;
	if (!dbType)
		throw new Error('DATABASE_TYPE environment variabe is required');

	switch (dbType.toLowerCase()) {
		case 'sqlserver':
		case 'mssql':
			return new SqlServerDriver();
		case 'postgres':
		case 'postgresql':
		default:
			return new PostgresDriver();
	}
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

// Updated functions using the driver abstraction
let dbDriver: DatabaseDriver | null = null;

function getDriver(): DatabaseDriver {
	if (!dbDriver) {
		dbDriver = getDatabaseDriver();
	}
	return dbDriver;
}

// Get database schema information
export async function getDatabaseSchema(): Promise<string> {
	return await getDriver().getSchema();
}

// Call Gemini AI to convert natural language to SQL
export async function callGeminiApi(prompt: string): Promise<string> {
	const genAI = getGeminiAI();
	const model = genAI.getGenerativeModel({
		model: 'gemini-1.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: {
				description: 'A string which is a SQL SELECT statement.',
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
	const driver = getDriver();

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

		const result = await driver.query(sqlStatement);

		// Handle different result formats from different drivers
		const rows = result.recordset || result.rows;
		const rowCount = result.rowsAffected?.[0] || result.rowCount;
		const fields =
			result.recordset?.columns ||
			result.fields?.map((field: any) => ({
				name: field.name,
				dataTypeID: field.dataTypeID,
			}));

		return {
			rows,
			rowCount,
			fields,
		};
	} catch (error) {
		console.error('SQL execution error:', error);
		console.error('Failed SQL statement:', sqlStatement);
		throw new Error(
			`SQL execution failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

// Close database connection pool
export async function closePool(): Promise<void> {
	if (dbDriver) {
		await dbDriver.close();
		dbDriver = null;
	}
}
