import { NextRequest, NextResponse } from 'next/server';
import {
	getDropdownById,
	updateDropdown,
	deleteDropdown,
	type CreateDropdownData,
} from '@/lib/dropdowns-db';
import { DropdownOption } from '@/lib/query-builder-types';
import { verifyAuthentication } from '../../api-utils';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const id = parseInt((await params).id);
		const dropdown = getDropdownById(id);

		if (!dropdown) {
			return NextResponse.json(
				{ error: 'Dropdown not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json({ dropdown });
	} catch (error) {
		console.error('Error fetching dropdown:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch dropdown' },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const id = parseInt((await params).id);
		const body = await request.json();
		const { name, description, options } = body;

		// Validate options if provided
		if (options && Array.isArray(options)) {
			for (const option of options) {
				if (!option.value || !option.label) {
					return NextResponse.json(
						{ error: 'Each option must have value and label' },
						{ status: 400 }
					);
				}
			}
		}

		const data: Partial<CreateDropdownData> = {};
		if (name !== undefined) data.name = name;
		if (description !== undefined) data.description = description;
		if (options !== undefined) data.options = options as DropdownOption[];

		updateDropdown(id, data);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error updating dropdown:', error);
		return NextResponse.json(
			{ error: 'Failed to update dropdown' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const id = parseInt((await params).id);
		deleteDropdown(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting dropdown:', error);
		return NextResponse.json(
			{ error: 'Failed to delete dropdown' },
			{ status: 500 }
		);
	}
}
