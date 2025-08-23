import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const authCookie = cookieStore.get('plainsql-auth');

		if (authCookie && authCookie.value === 'authenticated') {
			return NextResponse.json({ authenticated: true });
		}

		return NextResponse.json({ authenticated: false }, { status: 401 });
	} catch (error) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}
}
