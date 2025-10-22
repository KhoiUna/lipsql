import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import {
	createChatSession,
	getCurrentChatSession,
	updateChatSession,
	deleteChatSession,
	getChatParameters,
	ChatSession,
	CreateChatSessionData,
	UpdateChatSessionData,
} from '@/lib/chat-db';

export async function GET() {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		// Get current session
		const session = getCurrentChatSession();
		if (!session) {
			return NextResponse.json({
				success: true,
				session: null,
				parameters: [],
				timestamp: new Date().toISOString(),
			});
		}

		// Get parameters for the session
		const parameters = getChatParameters(session.id);

		return NextResponse.json({
			success: true,
			session,
			parameters,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Get Chat Session API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get chat session',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const { name, base_sql } = await request.json();

		// Validate input
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Session name is required' },
				{ status: 400 }
			);
		}

		// Create new session
		const sessionId = createChatSession({
			name: name.trim(),
			base_sql: base_sql || undefined,
		});

		const session = getCurrentChatSession();
		const parameters = session ? getChatParameters(session.id) : [];

		return NextResponse.json({
			success: true,
			session,
			parameters,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Create Chat Session API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to create chat session',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const { id, name, base_sql } = await request.json();

		// Validate input
		if (!id || typeof id !== 'number') {
			return NextResponse.json(
				{ error: 'Session ID is required' },
				{ status: 400 }
			);
		}

		// Update session
		const updateData: UpdateChatSessionData = {};
		if (name !== undefined) updateData.name = name;
		if (base_sql !== undefined) updateData.base_sql = base_sql;

		updateChatSession(id, updateData);

		const session = getCurrentChatSession();
		const parameters = session ? getChatParameters(session.id) : [];

		return NextResponse.json({
			success: true,
			session,
			parameters,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Update Chat Session API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to update chat session',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (id) {
			// Delete specific session
			deleteChatSession(parseInt(id));
		} else {
			// Clear current session (delete all for user)
			const session = getCurrentChatSession();
			if (session) {
				deleteChatSession(session.id);
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Session deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Delete Chat Session API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to delete chat session',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
