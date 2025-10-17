import { NextRequest, NextResponse } from 'next/server';
import {
	getAllDropdowns,
	createDropdown,
	type CreateDropdownData,
} from '@/lib/dropdowns-db';
import { DropdownOption } from '@/lib/query-builder-types';
import { verifyAuthentication } from '../api-utils';

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

		const dropdowns = getAllDropdowns();
		return NextResponse.json({ dropdowns });
	} catch (error) {
		console.error('Error fetching dropdowns:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch dropdowns' },
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

		const body = await request.json();
		const { name, description, options } = body;

		if (!name || !options || !Array.isArray(options)) {
			return NextResponse.json(
				{ error: 'Name and options array are required' },
				{ status: 400 }
			);
		}

		// Validate options structure
		for (const option of options) {
			if (!option.value || !option.label) {
				return NextResponse.json(
					{ error: 'Each option must have value and label' },
					{ status: 400 }
				);
			}
		}

		const data: CreateDropdownData = {
			name,
			description,
			options: options as DropdownOption[],
		};

		const id = createDropdown(data);
		return NextResponse.json({ id, success: true }, { status: 201 });
	} catch (error) {
		console.error('Error creating dropdown:', error);
		return NextResponse.json(
			{ error: 'Failed to create dropdown' },
			{ status: 500 }
		);
	}
}
