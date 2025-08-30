import { NextRequest, NextResponse } from 'next/server';
import { getQueryHistory, saveQuery } from '@/lib/history-db';
import { verifyAuthentication } from '../api-utils';

export async function GET() {
	try {
		const auth = await verifyAuthentication();
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
		const auth = await verifyAuthentication();
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
