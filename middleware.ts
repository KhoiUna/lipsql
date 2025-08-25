import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function middleware(request: NextRequest) {
	const authCookie = request.cookies.get('plainsql-auth');
	const isLoginPage = request.nextUrl.pathname === '/login';

	// Check if user is authenticated by validating JWT token
	let isAuthenticated = false;

	if (authCookie?.value) {
		try {
			// Use jose for Edge Runtime compatibility
			const secret = new TextEncoder().encode(JWT_SECRET);
			const { payload } = await jwtVerify(authCookie.value, secret);

			isAuthenticated = !!payload.authenticated && !!payload.username;
		} catch (error) {
			// JWT verification failed - token is invalid, expired, or tampered with
			isAuthenticated = false;
		}
	}

	if (!isAuthenticated && !isLoginPage)
		return NextResponse.redirect('/login');

	if (isAuthenticated && isLoginPage) return NextResponse.redirect('/');

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|.*\\.png$|manifest\\.json).*)',
	],
};
