/**
 * Utilities for AI Report parameter replacement
 */

/**
 * Replace parameters in SQL query with user-provided values
 * @param baseSql - The original SQL template
 * @param parameters - Map of parameter field names to values
 * @returns SQL with parameters replaced
 */
export function replaceSqlParameters(
	baseSql: string,
	parameters: Record<string, any>
): string {
	let sql = baseSql;

	// Replace each parameter in the SQL
	for (const [field, value] of Object.entries(parameters)) {
		if (value === undefined || value === null || value === '') {
			continue; // Skip empty values
		}

		// Handle different value types
		let replacementValue: string;

		if (Array.isArray(value)) {
			// Handle multiselect (IN clause)
			const sanitizedValues = value
				.map((v) => sanitizeValue(v))
				.filter((v) => v !== null);
			replacementValue = `(${sanitizedValues.join(', ')})`;
		} else if (
			typeof value === 'object' &&
			'from' in value &&
			'to' in value
		) {
			// Handle daterange (BETWEEN clause)
			const from = sanitizeValue(value.from);
			const to = sanitizeValue(value.to);
			replacementValue = `${from} AND ${to}`;
		} else {
			// Handle single values
			replacementValue = sanitizeValue(value);
		}

		// Replace the parameter placeholder in SQL
		// Look for patterns like: column = 'value' or column IN ('value1', 'value2')
		const regex = new RegExp(
			`${escapeRegex(field)}\\s*=\\s*'[^']*'|${escapeRegex(
				field
			)}\\s+IN\\s+\\([^)]*\\)|${escapeRegex(
				field
			)}\\s+BETWEEN\\s+[^\\s]+\\s+AND\\s+[^\\s]+`,
			'gi'
		);

		sql = sql.replace(regex, (match) => {
			// Determine the operator and replace accordingly
			if (match.includes(' IN ')) {
				return match.replace(/\([^)]*\)/, replacementValue);
			} else if (match.includes(' BETWEEN ')) {
				return match.replace(
					/BETWEEN\s+[^\s]+\s+AND\s+[^\s]+/i,
					`BETWEEN ${replacementValue}`
				);
			} else {
				// Simple equality
				return match.replace(/=\s*'[^']*'/, `= ${replacementValue}`);
			}
		});
	}

	return sql;
}

/**
 * Sanitize a value for SQL injection prevention
 * @param value - The value to sanitize
 * @returns Sanitized SQL value (quoted string or number)
 */
function sanitizeValue(value: any): string {
	if (value === null || value === undefined) {
		return 'NULL';
	}

	// If it's a number, return as-is
	if (typeof value === 'number') {
		return String(value);
	}

	// If it's a boolean, convert to 1/0 for SQL Server
	if (typeof value === 'boolean') {
		return value ? '1' : '0';
	}

	// For strings, escape single quotes and wrap in quotes
	const stringValue = String(value);
	const escaped = stringValue.replace(/'/g, "''");
	return `'${escaped}'`;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Simple parameter replacement using placeholder syntax
 * Alternative approach: Replace {paramName} placeholders
 * @param baseSql - SQL with {paramName} placeholders
 * @param parameters - Map of parameter names to values
 * @returns SQL with placeholders replaced
 */
export function replacePlaceholders(
	baseSql: string,
	parameters: Record<string, any>
): string {
	let sql = baseSql;

	for (const [key, value] of Object.entries(parameters)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}

		const placeholder = `{${key}}`;

		if (Array.isArray(value)) {
			const sanitizedValues = value
				.map((v) => sanitizeValue(v))
				.filter((v) => v !== null);
			sql = sql.replace(placeholder, `(${sanitizedValues.join(', ')})`);
		} else if (
			typeof value === 'object' &&
			'from' in value &&
			'to' in value
		) {
			const from = sanitizeValue(value.from);
			const to = sanitizeValue(value.to);
			sql = sql.replace(placeholder, `${from} AND ${to}`);
		} else {
			sql = sql.replace(placeholder, sanitizeValue(value));
		}
	}

	return sql;
}
