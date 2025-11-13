import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Pool } from 'pg';
import * as sql from 'mssql';
import { GEMINI_MODEL } from './constants';
import { getGeminiAI } from './gemini-utils';

// Schema types
export interface SchemaColumn {
	column: string;
	type: string;
	nullable: boolean;
	default?: string;
}

export interface SchemaTable {
	name: string;
	columns: SchemaColumn[];
}

export interface DatabaseSchema {
	tables: SchemaTable[];
}

// Database driver abstraction
interface DatabaseDriver {
	databaseType: string;
	connect(): Promise<any>;
	query(sql: string): Promise<any>;
	getSchema(): Promise<DatabaseSchema>;
	getRelationships(): Promise<any[]>;
	getDatabaseName(): Promise<string>;
	close(): Promise<void>;
}

// PostgreSQL driver implementation
class PostgresDriver implements DatabaseDriver {
	private pool: Pool | null = null;
	databaseType: string = process.env.DATABASE_TYPE as string;

	async connect() {
		if (!this.pool) {
			this.pool = new Pool({
				host: process.env.POSTGRES_HOST,
				port: parseInt(process.env.POSTGRES_PORT as string),
				database: process.env.POSTGRES_DATABASE,
				user: process.env.POSTGRES_USER,
				password: process.env.POSTGRES_PASSWORD,
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

	async getSchema(): Promise<DatabaseSchema> {
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
			const tablesMap: Record<string, SchemaColumn[]> = {};
			result.rows.forEach((row) => {
				if (!tablesMap[row.table_name]) {
					tablesMap[row.table_name] = [];
				}
				tablesMap[row.table_name].push({
					column: row.column_name,
					type: row.data_type,
					nullable: row.is_nullable === 'YES',
					default: row.column_default,
				});
			});

			// Convert to array format
			const tables: SchemaTable[] = Object.entries(tablesMap).map(
				([name, columns]) => ({
					name,
					columns,
				})
			);

			return { tables };
		} finally {
			client.release();
		}
	}

	async getRelationships(): Promise<any[]> {
		const client = await this.connect();

		try {
			// Get foreign key relationships
			const relationshipsQuery = `
				SELECT
					tc.table_name,
					kcu.column_name,
					ccu.table_name AS foreign_table_name,
					ccu.column_name AS foreign_column_name
				FROM information_schema.table_constraints AS tc
				JOIN information_schema.key_column_usage AS kcu
					ON tc.constraint_name = kcu.constraint_name
					AND tc.table_schema = kcu.table_schema
				JOIN information_schema.constraint_column_usage AS ccu
					ON ccu.constraint_name = tc.constraint_name
					AND ccu.table_schema = tc.table_schema
				WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_schema = 'public'
				ORDER BY tc.table_name, kcu.column_name
			`;

			const result = await client.query(relationshipsQuery);
			return result.rows.map((row: any) => ({
				table: row.table_name,
				column: row.column_name,
				foreignTable: row.foreign_table_name,
				foreignColumn: row.foreign_column_name,
			}));
		} finally {
			client.release();
		}
	}

	async getDatabaseName(): Promise<string> {
		// For PostgreSQL, we can get the database name from environment variable
		// or query the current database
		const client = await this.connect();
		try {
			const result = await client.query('SELECT current_database()');
			return result.rows[0].current_database;
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
	databaseType: string = process.env.DATABASE_TYPE as string;

	async connect() {
		if (!this.connection) {
			const server = process.env.SQLSERVER_HOST;
			const database = process.env.SQLSERVER_DATABASE;
			const user = process.env.SQLSERVER_UID;
			const password = process.env.SQLSERVER_PASSWORD;

			if (!server || !database || !user || !password) {
				throw new Error(
					'SQL Server env vars required: SQLSERVER_HOST, SQLSERVER_DATABASE, SQLSERVER_USER, SQLSERVER_PASSWORD'
				);
			}

			const port = parseInt(process.env.SQLSERVER_PORT as string);

			this.connection = await sql.connect({
				server,
				port,
				database,
				user,
				password,
				requestTimeout: parseInt(
					process.env.SQLSERVER_TIMEOUT as string
				), // 10 minutes
			});
		}
		return this.connection;
	}

	async query(sql: string) {
		const connection = await this.connect();
		return await connection.request().query(sql);
	}

	async getSchema(): Promise<DatabaseSchema> {
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
			const tablesMap: Record<string, SchemaColumn[]> = {};
			result.recordset.forEach((row: any) => {
				if (!tablesMap[row.TABLE_NAME]) {
					tablesMap[row.TABLE_NAME] = [];
				}
				tablesMap[row.TABLE_NAME].push({
					column: row.COLUMN_NAME,
					type: row.DATA_TYPE,
					nullable: row.IS_NULLABLE === 'YES',
					default: row.COLUMN_DEFAULT,
				});
			});

			// Convert to array format
			const tables: SchemaTable[] = Object.entries(tablesMap).map(
				([name, columns]) => ({
					name,
					columns,
				})
			);

			return { tables };
		} catch (error) {
			console.error('SQL Server schema extraction error:', error);
			throw new Error(
				`Failed to extract database schema: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}

	async getRelationships(): Promise<any[]> {
		const connection = await this.connect();

		try {
			// Get foreign key relationships for SQL Server
			const relationshipsQuery = `
				SELECT
					fk.name AS constraint_name,
					OBJECT_NAME(fk.parent_object_id) AS table_name,
					COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
					OBJECT_NAME(fk.referenced_object_id) AS foreign_table_name,
					COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS foreign_column_name
				FROM sys.foreign_keys fk
				INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
				ORDER BY table_name, column_name
			`;

			const result = await connection.request().query(relationshipsQuery);
			return result.recordset.map((row: any) => ({
				table: row.table_name,
				column: row.column_name,
				foreignTable: row.foreign_table_name,
				foreignColumn: row.foreign_column_name,
			}));
		} catch (error) {
			console.error('SQL Server relationships extraction error:', error);
			return [];
		}
	}

	async getDatabaseName(): Promise<string> {
		const connection = await this.connect();
		try {
			const result = await connection
				.request()
				.query('SELECT DB_NAME() AS database_name');
			return result.recordset[0].database_name;
		} catch (error) {
			console.error('SQL Server database name extraction error:', error);
			// Fallback to parsing from connection string
			const connectionString =
				process.env.SQLSERVER_CONNECTION_STRING || '';
			const dbMatch = connectionString.match(/Database=([^;]+)/i);
			return dbMatch ? dbMatch[1] : 'Unknown';
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

// Updated functions using the driver abstraction
let dbDriver: DatabaseDriver | null = null;

export function getDriver(): DatabaseDriver {
	if (!dbDriver) {
		dbDriver = getDatabaseDriver();
	}
	return dbDriver;
}

// Get database schema information
export async function getDatabaseSchema(): Promise<DatabaseSchema> {
	return await getDriver().getSchema();
}

// Convert schema object to string format for AI prompts
export function schemaToString(schema: DatabaseSchema): string {
	let schemaString = 'Database Schema:\n\n';
	for (const table of schema.tables) {
		schemaString += `Table: ${table.name}\n`;
		table.columns.forEach((col) => {
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
}

// Get table relationships
export async function getTableRelationships(): Promise<any[]> {
	return await getDriver().getRelationships();
}

// Get database name
export async function getDatabaseName(): Promise<string> {
	return await getDriver().getDatabaseName();
}

// Call Gemini AI to convert natural language to SQL
export async function callGeminiApi(prompt: string): Promise<string> {
	const genAI = getGeminiAI();
	const model = genAI.getGenerativeModel({
		model: GEMINI_MODEL,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: {
				description: 'A string represents a SQL statement.',
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

function validateSqlSecurity(sql: string): void {
	const trimmedSql = sql.trim();

	// Check if SQL starts with dangerous keywords (case-insensitive)
	// Using word boundaries (\b) ensures we match whole words, not substrings like "updated_at"
	const dangerousKeywords =
		/^\s*(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i;

	// Check for multiple statements (could try to sneak in dangerous commands)
	const statements = trimmedSql
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	// Validate each statement
	for (const stmt of statements) {
		// Block dangerous commands
		if (dangerousKeywords.test(stmt)) {
			throw new Error(
				'Only SELECT queries are allowed for security reasons'
			);
		}
	}
}

// Execute SQL query safely
export async function executeSql(sqlStatement: string): Promise<any> {
	const driver = getDriver();

	try {
		validateSqlSecurity(sqlStatement);

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
