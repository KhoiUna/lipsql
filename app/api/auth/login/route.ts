import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json();

		const expectedUsername = process.env.PLAINSQL_USERNAME;
		const expectedPassword = process.env.PLAINSQL_PASSWORD;

		if (username === expectedUsername && password === expectedPassword) {
			// Set session cookie
			(await cookies()).set('plainsql-auth', 'authenticated', {
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
