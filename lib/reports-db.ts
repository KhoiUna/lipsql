import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { VisualQuery } from './query-builder-types';
import { getDb as getDropdownDb } from './dropdowns-db';

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = path.join(DB_DIR, 'lipsql-sqlite.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
	fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
	if (!db) {
		db = new Database(DB_PATH);

		getDropdownDb();

		// Create folders table
		db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create reports table
		db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        query_config TEXT NOT NULL,
        default_visible_columns TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      )
    `);

		// Create report_parameters table
		db.exec(`
      CREATE TABLE IF NOT EXISTS report_parameters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        field TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        options_source TEXT,
        default_value TEXT,
        required INTEGER DEFAULT 0,
        dropdown_id INTEGER,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
        FOREIGN KEY (dropdown_id) REFERENCES dropdowns(id) ON DELETE SET NULL
      )
    `);

		// Add dropdown_id column if it doesn't exist (migration)
		try {
			db.exec(
				`ALTER TABLE report_parameters ADD COLUMN dropdown_id INTEGER REFERENCES dropdowns(id) ON DELETE SET NULL`
			);
		} catch (error) {
			// Column already exists, ignore
		}

		// Add type column if it doesn't exist (migration)
		try {
			db.exec(
				`ALTER TABLE reports ADD COLUMN type TEXT DEFAULT 'visual'`
			);
		} catch (error) {
			// Column already exists, ignore
		}

		// Add base_sql column if it doesn't exist (migration)
		try {
			db.exec(`ALTER TABLE reports ADD COLUMN base_sql TEXT`);
		} catch (error) {
			// Column already exists, ignore
		}
	}
	return db;
}

// Folder interfaces
export interface Folder {
	id: number;
	name: string;
	description?: string;
	created_at: string;
}

export interface CreateFolderData {
	name: string;
	description?: string;
}

// Report interfaces
export interface Report {
	id: number;
	folder_id: number;
	name: string;
	description?: string;
	type: 'visual' | 'ai';
	query_config: VisualQuery;
	base_sql?: string;
	default_visible_columns: string[];
	created_at: string;
}

export interface CreateReportData {
	folder_id: number;
	name: string;
	description?: string;
	type: 'visual' | 'ai';
	query_config: VisualQuery;
	base_sql?: string;
	default_visible_columns?: string[];
}

// Report parameter interfaces
export interface ReportParameter {
	id: number;
	report_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	options_source?: string;
	default_value?: any;
	required: boolean;
	dropdown_id?: number;
}

export interface CreateReportParameterData {
	report_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	options_source?: string;
	default_value?: any;
	required?: boolean;
	dropdown_id?: number;
}

// Folder CRUD functions
export function getFolders(): Folder[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM folders ORDER BY created_at DESC')
		.all() as Folder[];
}

export function getFolderById(id: number): Folder | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as
		| Folder
		| undefined;
}

export function createFolder(data: CreateFolderData): number {
	const db = getDb();
	const result = db
		.prepare('INSERT INTO folders (name, description) VALUES (?, ?)')
		.run(data.name, data.description || null);
	return result.lastInsertRowid as number;
}

export function updateFolder(
	id: number,
	data: Partial<CreateFolderData>
): void {
	const db = getDb();
	const updates: string[] = [];
	const values: any[] = [];

	if (data.name !== undefined) {
		updates.push('name = ?');
		values.push(data.name);
	}
	if (data.description !== undefined) {
		updates.push('description = ?');
		values.push(data.description);
	}

	if (updates.length > 0) {
		values.push(id);
		db.prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`).run(
			...values
		);
	}
}

export function deleteFolder(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

// Report CRUD functions
export function getReportsByFolder(folderId: number): Report[] {
	const db = getDb();
	const rows = db
		.prepare(
			'SELECT * FROM reports WHERE folder_id = ? ORDER BY created_at DESC'
		)
		.all(folderId) as any[];

	return rows.map((row) => ({
		...row,
		type: row.type || 'visual',
		query_config: JSON.parse(row.query_config),
		base_sql: row.base_sql || undefined,
		default_visible_columns: row.default_visible_columns
			? JSON.parse(row.default_visible_columns)
			: [],
	}));
}

export function getReportById(id: number): Report | undefined {
	const db = getDb();
	const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;

	if (!row) return undefined;

	return {
		...row,
		type: row.type || 'visual',
		query_config: JSON.parse(row.query_config),
		base_sql: row.base_sql || undefined,
		default_visible_columns: row.default_visible_columns
			? JSON.parse(row.default_visible_columns)
			: [],
	};
}

export function createReport(data: CreateReportData): number {
	const db = getDb();
	const result = db
		.prepare(
			'INSERT INTO reports (folder_id, name, description, type, query_config, base_sql, default_visible_columns) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			data.folder_id,
			data.name,
			data.description || null,
			data.type,
			JSON.stringify(data.query_config),
			data.base_sql || null,
			JSON.stringify(data.default_visible_columns || [])
		);
	return result.lastInsertRowid as number;
}

export function updateReport(
	id: number,
	data: Partial<
		Omit<
			CreateReportData,
			'folder_id' | 'query_config' | 'default_visible_columns'
		>
	>
): void {
	const db = getDb();
	const updates: string[] = [];
	const values: any[] = [];

	if (data.name !== undefined) {
		updates.push('name = ?');
		values.push(data.name);
	}
	if (data.description !== undefined) {
		updates.push('description = ?');
		values.push(data.description);
	}

	if (updates.length > 0) {
		values.push(id);
		db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`).run(
			...values
		);
	}
}

export function updateReportQuery(
	id: number,
	query_config: VisualQuery,
	parameters: CreateReportParameterData[]
): void {
	const db = getDb();

	// Start a transaction
	db.transaction(() => {
		// Update the report's query_config
		db.prepare('UPDATE reports SET query_config = ? WHERE id = ?').run(
			JSON.stringify(query_config),
			id
		);

		// Delete all existing parameters for this report
		db.prepare('DELETE FROM report_parameters WHERE report_id = ?').run(id);

		// Insert new parameters
		const insertStmt = db.prepare(
			'INSERT INTO report_parameters (report_id, field, label, type, options_source, default_value, required, dropdown_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		);

		for (const param of parameters) {
			insertStmt.run(
				param.report_id,
				param.field,
				param.label,
				param.type,
				param.options_source || null,
				param.default_value !== undefined
					? JSON.stringify(param.default_value)
					: null,
				param.required ? 1 : 0,
				param.dropdown_id || null
			);
		}
	})();
}

export function deleteReport(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM reports WHERE id = ?').run(id);
}

// Report parameter CRUD functions
export function getReportParameters(reportId: number): ReportParameter[] {
	const db = getDb();
	const rows = db
		.prepare(
			'SELECT * FROM report_parameters WHERE report_id = ? ORDER BY id ASC'
		)
		.all(reportId) as any[];

	return rows.map((row) => ({
		...row,
		default_value: row.default_value
			? JSON.parse(row.default_value)
			: undefined,
		required: Boolean(row.required),
		dropdown_id: row.dropdown_id || undefined,
	}));
}

export function createReportParameter(data: CreateReportParameterData): number {
	const db = getDb();
	const result = db
		.prepare(
			'INSERT INTO report_parameters (report_id, field, label, type, options_source, default_value, required, dropdown_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			data.report_id,
			data.field,
			data.label,
			data.type,
			data.options_source || null,
			data.default_value !== undefined
				? JSON.stringify(data.default_value)
				: null,
			data.required ? 1 : 0,
			data.dropdown_id || null
		);
	return result.lastInsertRowid as number;
}

export function deleteReportParameter(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM report_parameters WHERE id = ?').run(id);
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
