import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json();

		const expectedUsername = process.env.LIPSQL_USERNAME;
		const expectedPassword = process.env.LIPSQL_PASSWORD;

		if (username === expectedUsername && password === expectedPassword) {
			// Generate a secure JWT token using jose
			const secret = new TextEncoder().encode(JWT_SECRET);
			const token = await new SignJWT({
				username,
				authenticated: true,
			})
				.setProtectedHeader({ alg: 'HS256' })
				.setIssuedAt()
				.setExpirationTime('7d')
				.sign(secret);

			// Set secure session cookie with JWT token
			(await cookies()).set('lipsql-auth', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			return NextResponse.json({ success: true });
		}

		return NextResponse.json(
			{ error: 'Invalid credentials' },
			{ status: 401 }
		);
	} catch (error) {
		return NextResponse.json({ error: 'Login failed' }, { status: 500 });
	}
}
