import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';

export async function GET(request: NextRequest) {
	try {
		const auth = await verifyAuthentication();
		return NextResponse.json(
			{ authenticated: auth.success },
			{ status: auth.success ? 200 : 401 }
		);
	} catch (error) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}
}
