import sqlite3 from 'sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = path.join(DB_DIR, 'plainsql.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
	fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
	if (!db) {
		db = new sqlite3.Database(DB_PATH, (err) => {
			if (err) {
				console.error('Error opening database:', err);
			} else {
				console.log('Connected to SQLite database');
				// Create table if it doesn't exist
				db!.run(`
          CREATE TABLE IF NOT EXISTS query_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            natural_query TEXT NOT NULL,
            generated_sql TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT DEFAULT 'default'
          )
        `);
			}
		});
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

export function saveQuery(
	naturalQuery: string,
	generatedSql: string,
	userId: string = 'default'
): Promise<void> {
	return new Promise((resolve, reject) => {
		const db = getDb();
		db.run(
			`INSERT INTO query_history (natural_query, generated_sql, user_id) VALUES (?, ?, ?)`,
			[naturalQuery, generatedSql, userId],
			function (err) {
				if (err) {
					console.error('Error saving query:', err);
					reject(err);
				} else {
					resolve();
				}
			}
		);
	});
}

export function getQueryHistory(
	userId: string = 'default',
	limit: number = 100
): Promise<QueryHistoryItem[]> {
	return new Promise((resolve, reject) => {
		const db = getDb();
		db.all(
			`SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`,
			[userId, limit],
			(err, rows) => {
				if (err) {
					console.error('Error fetching history:', err);
					reject(err);
				} else {
					resolve(rows as QueryHistoryItem[]);
				}
			}
		);
	});
}

export function closeDb(): void {
	if (db) {
		db.close((err) => {
			if (err) {
				console.error('Error closing database:', err);
			} else {
				console.log('Database connection closed');
			}
		});
		db = null;
	}
}
