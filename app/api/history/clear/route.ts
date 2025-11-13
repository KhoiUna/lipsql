import { NextRequest, NextResponse } from 'next/server';
import { clearQueryHistory } from '@/lib/history-db';

export async function DELETE(request: NextRequest) {
	try {
		clearQueryHistory(process.env.LIPSQL_USERNAME);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error clearing query history:', error);
		return NextResponse.json(
			{ error: 'Failed to clear query history' },
			{ status: 500 }
		);
	}
}
