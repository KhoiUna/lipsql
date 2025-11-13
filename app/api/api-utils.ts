import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;
// Reusable authentication function
export async function verifyAuthentication(): Promise<{
	success: boolean;
	username?: string;
	error?: string;
}> {
	try {
		const cookieStore = await cookies();
		const authCookie = cookieStore.get('lipsql-auth');

		if (!authCookie) {
			return { success: false, error: 'Authentication required' };
		}

		// Verify the JWT token
		const secret = new TextEncoder().encode(JWT_SECRET);
		const { payload } = await jwtVerify(authCookie.value, secret);

		// Check if token is valid and user is authenticated
		if (!payload.authenticated || !payload.username) {
			return { success: false, error: 'Invalid authentication token' };
		}

		return { success: true, username: payload.username as string };
	} catch (jwtError) {
		// JWT verification failed (invalid signature, expired, etc.)
		return { success: false, error: 'Authentication failed' };
	}
}
