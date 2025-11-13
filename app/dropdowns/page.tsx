'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dropdown, DropdownOption } from '@/lib/query-builder-types';
import HeaderBar from '@/components/header-bar';

interface DropdownFormData {
	name: string;
	description: string;
	options: DropdownOption[];
}

export default function DropdownsPage() {
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<DropdownFormData>({
		name: '',
		description: '',
		options: [{ value: '', label: '' }],
	});

	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ['dropdowns'],
		queryFn: async () => {
			const res = await fetch('/api/dropdowns');
			const data = await res.json();
			return data.dropdowns as Dropdown[];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: DropdownFormData) => {
			const res = await fetch('/api/dropdowns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error('Failed to create dropdown');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dropdowns'] });
			toast.success('Dropdown created successfully');
			setIsCreating(false);
			resetForm();
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to create dropdown');
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: number;
			data: Partial<DropdownFormData>;
		}) => {
			const res = await fetch(`/api/dropdowns/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error('Failed to update dropdown');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dropdowns'] });
			toast.success('Dropdown updated successfully');
			setEditingId(null);
			resetForm();
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to update dropdown');
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			const res = await fetch(`/api/dropdowns/${id}`, {
				method: 'DELETE',
			});
			if (!res.ok) throw new Error('Failed to delete dropdown');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dropdowns'] });
			toast.success('Dropdown deleted successfully');
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to delete dropdown');
		},
	});

	const resetForm = () => {
		setFormData({
			name: '',
			description: '',
			options: [{ value: '', label: '' }],
		});
	};

	const addOption = () => {
		setFormData((prev) => ({
			...prev,
			options: [...prev.options, { value: '', label: '' }],
		}));
	};

	const removeOption = (index: number) => {
		setFormData((prev) => ({
			...prev,
			options: prev.options.filter((_, i) => i !== index),
		}));
	};

	const updateOption = (
		index: number,
		field: 'value' | 'label',
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			options: prev.options.map((opt, i) =>
				i === index ? { ...opt, [field]: value } : opt
			),
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate
		if (!formData.name.trim()) {
			toast.error('Name is required');
			return;
		}

		const validOptions = formData.options.filter(
			(opt) => opt.value && opt.label
		);
		if (validOptions.length === 0) {
			toast.error('At least one option is required');
			return;
		}

		if (editingId) {
			updateMutation.mutate({
				id: editingId,
				data: { ...formData, options: validOptions },
			});
		} else {
			createMutation.mutate({ ...formData, options: validOptions });
		}
	};

	const startEdit = (dropdown: Dropdown) => {
		setEditingId(dropdown.id);
		setFormData({
			name: dropdown.name,
			description: dropdown.description || '',
			options:
				dropdown.options.length > 0
					? dropdown.options
					: [{ value: '', label: '' }],
		});
		setIsCreating(false);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setIsCreating(false);
		resetForm();
	};

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex items-center justify-between pt-8 px-8">
				<h1 className="text-xl font-bold text-primary">Dropdowns</h1>
				<Button
					onClick={() => {
						setIsCreating(true);
						setEditingId(null);
						resetForm();
					}}
					className="bg-primary text-white hover:bg-gray-800"
				>
					<Plus size={16} className="mr-2" />
					Create Dropdown
				</Button>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			{/* Create/Edit Form */}
			{(isCreating || editingId !== null) && (
				<div className="border border-gray-300 rounded-lg p-6 m-8">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Name *
							</label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({
										...formData,
										name: e.target.value,
									})
								}
								placeholder="Dropdown Name"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Description
							</label>
							<Input
								value={formData.description}
								onChange={(e) =>
									setFormData({
										...formData,
										description: e.target.value,
									})
								}
								placeholder="Optional description"
							/>
						</div>

						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="block text-sm font-medium text-gray-700">
									Options *
								</label>
								<Button
									type="button"
									onClick={addOption}
									size="sm"
									variant="outline"
								>
									<Plus size={14} className="mr-1" />
									Add Option
								</Button>
							</div>

							<div className="space-y-2">
								{formData.options.map((option, index) => (
									<div
										key={index}
										className="flex items-center gap-2"
									>
										<Input
											value={option.value}
											onChange={(e) =>
												updateOption(
													index,
													'value',
													e.target.value
												)
											}
											placeholder="Value (e.g., 1)"
											className="flex-1"
										/>
										<Input
											value={option.label}
											onChange={(e) =>
												updateOption(
													index,
													'label',
													e.target.value
												)
											}
											placeholder="Label (e.g., Completed)"
											className="flex-1"
										/>
										<Button
											type="button"
											onClick={() => removeOption(index)}
											variant="ghost"
											className="text-red-700 hover:text-red-700"
										>
											<X size={18} />
										</Button>
									</div>
								))}
							</div>
						</div>

						<div className="flex gap-2">
							<Button
								type="submit"
								className="bg-primary text-white hover:bg-gray-800"
							>
								<Save size={16} className="mr-2" />
								{editingId ? 'Update' : 'Create'}
							</Button>
							<Button
								type="button"
								onClick={cancelEdit}
								variant="outline"
							>
								Cancel
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Dropdowns List */}
			<div className="space-y-4">
				{data && data.length === 0 && (
					<div className="text-center text-gray-600 py-8">
						No dropdowns yet. Create one to get started.
					</div>
				)}

				{data?.map((dropdown) => (
					<div
						key={dropdown.id}
						className="bg-white border border-gray-300 rounded-lg p-4 m-8"
					>
						<div className="flex items-start justify-between mb-3">
							<div>
								<h3 className="font-semibold text-primary">
									{dropdown.name}
								</h3>
								{dropdown.description && (
									<p className="text-sm text-gray-600 mt-1">
										{dropdown.description}
									</p>
								)}
							</div>
							<div className="flex gap-2">
								<Button
									onClick={() => startEdit(dropdown)}
									variant="ghost"
									size="sm"
								>
									<Edit size={16} />
								</Button>
								<Button
									onClick={() =>
										deleteMutation.mutate(dropdown.id)
									}
									variant="ghost"
									size="sm"
									className="text-red-700 hover:text-red-700"
								>
									<Trash2 size={16} />
								</Button>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{dropdown.options.map((opt, idx) => (
								<div
									key={idx}
									className="px-3 py-1 bg-gray-100 rounded-md text-sm"
								>
									<span className="font-mono text-gray-600">
										{opt.value}
									</span>
									<span className="mx-2 text-gray-400">
										→
									</span>
									<span className="text-gray-700">
										{opt.label}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
