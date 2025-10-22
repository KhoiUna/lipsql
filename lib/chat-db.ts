import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

		// Create chat_sessions table
		db.exec(`
			CREATE TABLE IF NOT EXISTS chat_sessions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				base_sql TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				user_id TEXT DEFAULT 'default'
			)
		`);

		// Create chat_parameters table
		db.exec(`
			CREATE TABLE IF NOT EXISTS chat_parameters (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id INTEGER NOT NULL,
				field TEXT NOT NULL,
				label TEXT NOT NULL,
				type TEXT NOT NULL,
				default_value TEXT,
				enabled INTEGER DEFAULT 1,
				dropdown_id INTEGER,
				FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
			)
		`);
	}
	return db;
}

// Chat session interfaces
export interface ChatSession {
	id: number;
	name: string;
	base_sql?: string;
	created_at: string;
	updated_at: string;
	user_id: string;
}

export interface CreateChatSessionData {
	name: string;
	base_sql?: string;
	user_id?: string;
}

export interface UpdateChatSessionData {
	name?: string;
	base_sql?: string;
}

// Chat parameter interfaces
export interface ChatParameter {
	id: number;
	session_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	default_value?: any;
	enabled: boolean;
	dropdown_id?: number;
}

export interface CreateChatParameterData {
	session_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	default_value?: any;
	enabled?: boolean;
	dropdown_id?: number;
}

// Chat session CRUD functions
export function createChatSession(data: CreateChatSessionData): number {
	const db = getDb();
	const result = db
		.prepare(
			'INSERT INTO chat_sessions (name, base_sql, user_id) VALUES (?, ?, ?)'
		)
		.run(data.name, data.base_sql || null, data.user_id || 'default');
	return result.lastInsertRowid as number;
}

export function getChatSession(id: number): ChatSession | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as
		| ChatSession
		| undefined;
}

export function getCurrentChatSession(
	userId: string = 'default'
): ChatSession | undefined {
	const db = getDb();
	return db
		.prepare(
			'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
		)
		.get(userId) as ChatSession | undefined;
}

export function updateChatSession(
	id: number,
	data: UpdateChatSessionData
): void {
	const db = getDb();
	const updates: string[] = [];
	const values: any[] = [];

	if (data.name !== undefined) {
		updates.push('name = ?');
		values.push(data.name);
	}
	if (data.base_sql !== undefined) {
		updates.push('base_sql = ?');
		values.push(data.base_sql);
	}

	if (updates.length > 0) {
		updates.push('updated_at = CURRENT_TIMESTAMP');
		values.push(id);
		db.prepare(
			`UPDATE chat_sessions SET ${updates.join(', ')} WHERE id = ?`
		).run(...values);
	}
}

export function deleteChatSession(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
}

// Chat parameter CRUD functions
export function getChatParameters(sessionId: number): ChatParameter[] {
	const db = getDb();
	const rows = db
		.prepare(
			'SELECT * FROM chat_parameters WHERE session_id = ? ORDER BY id ASC'
		)
		.all(sessionId) as any[];

	return rows.map((row) => ({
		...row,
		default_value: row.default_value
			? JSON.parse(row.default_value)
			: undefined,
		enabled: Boolean(row.enabled),
		dropdown_id: row.dropdown_id || undefined,
	}));
}

export function saveChatParameters(
	sessionId: number,
	parameters: CreateChatParameterData[]
): void {
	const db = getDb();

	// Start a transaction
	db.transaction(() => {
		// Delete all existing parameters for this session
		db.prepare('DELETE FROM chat_parameters WHERE session_id = ?').run(
			sessionId
		);

		// Insert new parameters
		const insertStmt = db.prepare(
			'INSERT INTO chat_parameters (session_id, field, label, type, default_value, enabled, dropdown_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
		);

		for (const param of parameters) {
			insertStmt.run(
				sessionId,
				param.field,
				param.label,
				param.type,
				param.default_value !== undefined
					? JSON.stringify(param.default_value)
					: null,
				param.enabled ? 1 : 0,
				param.dropdown_id || null
			);
		}
	})();
}

export function updateChatParameter(
	id: number,
	data: Partial<CreateChatParameterData>
): void {
	const db = getDb();
	const updates: string[] = [];
	const values: any[] = [];

	if (data.field !== undefined) {
		updates.push('field = ?');
		values.push(data.field);
	}
	if (data.label !== undefined) {
		updates.push('label = ?');
		values.push(data.label);
	}
	if (data.type !== undefined) {
		updates.push('type = ?');
		values.push(data.type);
	}
	if (data.default_value !== undefined) {
		updates.push('default_value = ?');
		values.push(JSON.stringify(data.default_value));
	}
	if (data.enabled !== undefined) {
		updates.push('enabled = ?');
		values.push(data.enabled ? 1 : 0);
	}
	if (data.dropdown_id !== undefined) {
		updates.push('dropdown_id = ?');
		values.push(data.dropdown_id);
	}

	if (updates.length > 0) {
		values.push(id);
		db.prepare(
			`UPDATE chat_parameters SET ${updates.join(', ')} WHERE id = ?`
		).run(...values);
	}
}

export function deleteChatParameter(id: number): void {
	const db = getDb();
	db.prepare('DELETE FROM chat_parameters WHERE id = ?').run(id);
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
