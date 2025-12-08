import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function proxy(request: NextRequest) {
	const authCookie = request.cookies.get('lipsql-auth');
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

	if (!isAuthenticated && !isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = '/login';
		return NextResponse.redirect(url);
	}

	if (isAuthenticated && isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = '/';
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$|manifest\\.json).*)',
	],
};
