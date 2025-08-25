import { NextRequest, NextResponse } from 'next/server';
import { getQueryHistory, saveQuery } from '@/lib/history-db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyAuth(): Promise<{
	success: boolean;
	username?: string;
	error?: string;
}> {
	try {
		const cookieStore = await cookies();
		const authCookie = cookieStore.get('plainsql-auth');

		if (!authCookie) {
			return { success: false, error: 'Authentication required' };
		}

		const secret = new TextEncoder().encode(JWT_SECRET);
		const { payload } = await jwtVerify(authCookie.value, secret);

		if (!payload.authenticated || !payload.username) {
			return { success: false, error: 'Invalid authentication token' };
		}

		return { success: true, username: payload.username as string };
	} catch {
		return { success: false, error: 'Authentication failed' };
	}
}

export async function GET() {
	try {
		const auth = await verifyAuth();
		if (!auth.success) {
			return NextResponse.json({ error: auth.error }, { status: 401 });
		}

		const history = getQueryHistory(auth.username);
		return NextResponse.json({ success: true, history });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to fetch history' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await verifyAuth();
		if (!auth.success) {
			return NextResponse.json({ error: auth.error }, { status: 401 });
		}

		const { naturalQuery, generatedSql } = await request.json();

		if (!naturalQuery || !generatedSql) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		saveQuery(naturalQuery, generatedSql, auth.username);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(error);

		return NextResponse.json(
			{ error: 'Failed to save query' },
			{ status: 500 }
		);
	}
}
