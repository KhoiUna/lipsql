import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Dropdown, DropdownOption } from './query-builder-types';

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = path.join(DB_DIR, 'lipsql-sqlite.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
	fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!db) {
		db = new Database(DB_PATH);

		// Create dropdowns table
		db.exec(`
      CREATE TABLE IF NOT EXISTS dropdowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        options TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
	}
	return db;
}

export interface CreateDropdownData {
	name: string;
	description?: string;
	options: DropdownOption[];
}

export function getAllDropdowns(): Dropdown[] {
	const db = getDb();
	const rows = db
		.prepare('SELECT * FROM dropdowns ORDER BY name')
		.all() as any[];

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description || undefined,
		options: JSON.parse(row.options),
		created_at: row.created_at,
		updated_at: row.updated_at,
	}));
}

export function getDropdownById(id: number): Dropdown | undefined {
	const db = getDb();
	const row = db
		.prepare('SELECT * FROM dropdowns WHERE id = ?')
		.get(id) as any;

	if (!row) return undefined;

	return {
		id: row.id,
		name: row.name,
		description: row.description || undefined,
		options: JSON.parse(row.options),
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export function createDropdown(data: CreateDropdownData): number {
	const db = getDb();
	const result = db
		.prepare(
			'INSERT INTO dropdowns (name, description, options) VALUES (?, ?, ?)'
		)
		.run(data.name, data.description || null, JSON.stringify(data.options));

	return result.lastInsertRowid as number;
}

export function updateDropdown(
	id: number,
	data: Partial<CreateDropdownData>
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
	if (data.options !== undefined) {
		updates.push('options = ?');
		values.push(JSON.stringify(data.options));
	}

	if (updates.length === 0) return;

	updates.push('updated_at = CURRENT_TIMESTAMP');
	values.push(id);

	db.prepare(`UPDATE dropdowns SET ${updates.join(', ')} WHERE id = ?`).run(
		...values
	);
}

export function deleteDropdown(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM dropdowns WHERE id = ?').run(id);
}
