import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const authCookie = cookieStore.get('plainsql-auth');

		if (!authCookie) {
			return NextResponse.json({ authenticated: false }, { status: 401 });
		}

		// Verify the JWT token using jose
		try {
			const secret = new TextEncoder().encode(JWT_SECRET);
			const { payload } = await jwtVerify(authCookie.value, secret);

			// Check if token is expired or invalid
			if (!payload.authenticated || !payload.username) {
				return NextResponse.json(
					{ authenticated: false },
					{ status: 401 }
				);
			}

			return NextResponse.json({ authenticated: true });
		} catch (jwtError) {
			// JWT verification failed (invalid signature, expired, etc.)
			return NextResponse.json({ authenticated: false }, { status: 401 });
		}
	} catch (error) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}
}
