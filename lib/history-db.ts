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
		db.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        natural_query TEXT NOT NULL,
        generated_sql TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT DEFAULT 'default'
      )
    `);
		db.exec(`
      CREATE TABLE IF NOT EXISTS saved_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saved_name TEXT NOT NULL,
        natural_query TEXT,
        generated_sql TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT DEFAULT 'default'
      )
    `);
	}
	return db;
}

export interface QueryHistoryItem {
	id: number;
	natural_query: string;
	generated_sql: string;
	timestamp: string;
	user_id: string;
}

export interface SavedQueryItem {
	id: number;
	saved_name: string;
	natural_query: string | null;
	generated_sql: string;
	timestamp: string;
	user_id: string;
}

export function saveQuery(
	naturalQuery: string,
	generatedSql: string,
	userId: string = 'default'
): void {
	const db = getDb();
	db.prepare(
		`
    INSERT INTO query_history (natural_query, generated_sql, user_id)
    VALUES (?, ?, ?)
  `
	).run(naturalQuery, generatedSql, userId);
}

export function getQueryHistory(
	userId: string = 'default',
	limit: number = 100
): QueryHistoryItem[] {
	const db = getDb();
	return db
		.prepare(
			`
    SELECT * FROM query_history 
    WHERE user_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `
		)
		.all(userId, limit) as QueryHistoryItem[];
}

export function clearQueryHistory(userId: string = 'default'): void {
	const db = getDb();
	db.prepare(`DELETE FROM query_history WHERE user_id = ?`).run(userId);
}

// Saved queries functions
export function saveQueryToSaved(
	savedName: string,
	naturalQuery: string | null,
	generatedSql: string,
	userId: string = 'default'
): void {
	const db = getDb();
	db.prepare(
		`
    INSERT INTO saved_queries (saved_name, natural_query, generated_sql, user_id)
    VALUES (?, ?, ?, ?)
  `
	).run(savedName, naturalQuery, generatedSql, userId);
}

export function getSavedQueries(
	userId: string = 'default',
	limit: number = 100
): SavedQueryItem[] {
	const db = getDb();
	return db
		.prepare(
			`
    SELECT * FROM saved_queries 
    WHERE user_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `
		)
		.all(userId, limit) as SavedQueryItem[];
}

export function updateSavedQueryName(
	id: string,
	newName: string,
	userId: string = 'default'
): void {
	const db = getDb();
	db.prepare(
		`
    UPDATE saved_queries 
    SET saved_name = ? 
    WHERE id = ? AND user_id = ?
  `
	).run(newName, id, userId);
}

export function deleteSavedQuery(id: string, userId: string = 'default'): void {
	const db = getDb();
	db.prepare(`DELETE FROM saved_queries WHERE id = ? AND user_id = ?`).run(
		id,
		userId
	);
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
