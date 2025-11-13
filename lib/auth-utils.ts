/**
 * Simple role-based access control utilities
 */

/**
 * Check if the current user is an admin
 * Uses NEXT_PUBLIC_ADMIN_MODE environment variable
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(): boolean {
	return process.env.NEXT_PUBLIC_ADMIN_MODE === 'true';
}

/**
 * Get admin mode status
 * @returns 'admin' or 'user'
 */
export function getUserRole(): 'admin' | 'user' {
	return isAdmin() ? 'admin' : 'user';
}
