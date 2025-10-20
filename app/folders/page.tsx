'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HeaderBar from '@/components/header-bar';
import {
	useFolders,
	useCreateFolder,
	useUpdateFolder,
	useDeleteFolder,
} from '@/lib/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Folder, Plus, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAdmin } from '@/lib/auth-utils';

export default function FoldersPage() {
	const router = useRouter();
	const foldersQuery = useFolders();
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderDescription, setNewFolderDescription] = useState('');

	const [editingFolder, setEditingFolder] = useState<any>(null);
	const [editFolderName, setEditFolderName] = useState('');
	const [editFolderDescription, setEditFolderDescription] = useState('');

	const [deletingFolder, setDeletingFolder] = useState<any>(null);
	const [openDropdown, setOpenDropdown] = useState<number | null>(null);

	const folders = foldersQuery.data?.folders || [];

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = () => {
			if (openDropdown !== null) {
				setOpenDropdown(null);
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [openDropdown]);

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) {
			toast.error('Please enter a folder name');
			return;
		}

		try {
			await createFolderMutation.mutateAsync({
				name: newFolderName.trim(),
				description: newFolderDescription.trim() || undefined,
			});

			toast.success('Folder created successfully');
			setShowCreateDialog(false);
			setNewFolderName('');
			setNewFolderDescription('');
		} catch (error) {
			console.error('Create folder error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to create folder'
			);
		}
	};

	const handleFolderClick = (folderId: number) => {
		router.push(`/folders/${folderId}`);
	};

	const handleEditFolder = (folder: any) => {
		setEditingFolder(folder);
		setEditFolderName(folder.name);
		setEditFolderDescription(folder.description || '');
		setOpenDropdown(null);
	};

	const handleUpdateFolder = async () => {
		if (!editFolderName.trim()) {
			toast.error('Please enter a folder name');
			return;
		}

		try {
			await updateFolderMutation.mutateAsync({
				id: editingFolder.id,
				data: {
					name: editFolderName.trim(),
					description: editFolderDescription.trim() || undefined,
				},
			});

			toast.success('Folder updated successfully');
			setEditingFolder(null);
			setEditFolderName('');
			setEditFolderDescription('');
		} catch (error) {
			console.error('Update folder error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to update folder'
			);
		}
	};

	const handleDeleteFolder = async () => {
		if (!deletingFolder) return;

		try {
			await deleteFolderMutation.mutateAsync(deletingFolder.id);

			toast.success('Folder deleted successfully');
			setDeletingFolder(null);
		} catch (error) {
			console.error('Delete folder error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to delete folder'
			);
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div>
					{/* Header */}
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-xl font-bold text-primary mb-2">
								Report Folders
							</h1>
							<p className="text-sm text-gray-600">
								Organize your preset reports into folders
							</p>
						</div>
						{isAdmin() && (
							<Button
								onClick={() => setShowCreateDialog(true)}
								className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
							>
								<Plus size={18} className="mr-2" />
								Create Folder
							</Button>
						)}
					</div>

					{/* Loading State */}
					{foldersQuery.isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						</div>
					)}

					{/* Error State */}
					{foldersQuery.error && (
						<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
							<p className="font-semibold">Error</p>
							<p>{foldersQuery.error.message}</p>
						</div>
					)}

					{/* Folders Grid */}
					{!foldersQuery.isLoading && !foldersQuery.error && (
						<>
							{folders.length === 0 ? (
								<div className="text-center py-12">
									<Folder
										size={64}
										className="mx-auto text-gray-400 mb-4"
									/>
									<h3 className="text-xl font-semibold text-gray-700 mb-2">
										No folders yet
									</h3>
									<p className="text-gray-600 mb-6">
										Create your first folder to organize
										reports
									</p>
									{isAdmin() && (
										<Button
											onClick={() =>
												setShowCreateDialog(true)
											}
											className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
										>
											<Plus size={18} className="mr-2" />
											Create Folder
										</Button>
									)}
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{folders.map((folder) => (
										<div
											key={folder.id}
											className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow relative"
										>
											<div className="flex items-start gap-4">
												<div
													onClick={() =>
														handleFolderClick(
															folder.id
														)
													}
													className="p-3 bg-blue-100 rounded-lg cursor-pointer"
												>
													<Folder
														size={24}
														className="text-blue-600"
													/>
												</div>
												<div
													onClick={() =>
														handleFolderClick(
															folder.id
														)
													}
													className="flex-1 cursor-pointer"
												>
													<h3 className="text-lg font-semibold text-primary mb-1">
														{folder.name}
													</h3>
													{folder.description && (
														<p className="text-sm text-gray-600 line-clamp-2">
															{folder.description}
														</p>
													)}
													<p className="text-xs text-gray-400 mt-2">
														Created{' '}
														{new Date(
															folder.created_at
														).toLocaleDateString()}
													</p>
												</div>
												{isAdmin() && (
													<div className="relative">
														<button
															onClick={(e) => {
																e.stopPropagation();
																setOpenDropdown(
																	openDropdown ===
																		folder.id
																		? null
																		: folder.id
																);
															}}
															className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
														>
															<MoreVertical
																size={20}
															/>
														</button>
														{openDropdown ===
															folder.id && (
															<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
																<button
																	onClick={(
																		e
																	) => {
																		e.stopPropagation();
																		handleEditFolder(
																			folder
																		);
																	}}
																	className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 rounded-t-lg"
																>
																	<Edit
																		size={
																			16
																		}
																	/>
																	Edit
																</button>
																<button
																	onClick={(
																		e
																	) => {
																		e.stopPropagation();
																		setDeletingFolder(
																			folder
																		);
																		setOpenDropdown(
																			null
																		);
																	}}
																	className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-700 rounded-b-lg"
																>
																	<Trash2
																		size={
																			16
																		}
																	/>
																	Delete
																</button>
															</div>
														)}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Create Folder Dialog */}
			{showCreateDialog && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								Create New Folder
							</h3>
							<button
								onClick={() => {
									setShowCreateDialog(false);
									setNewFolderName('');
									setNewFolderDescription('');
								}}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Folder Name *
								</label>
								<Input
									value={newFolderName}
									onChange={(e) =>
										setNewFolderName(e.target.value)
									}
									placeholder="Enter folder name"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<Textarea
									value={newFolderDescription}
									onChange={(e) =>
										setNewFolderDescription(e.target.value)
									}
									placeholder="Optional description"
									rows={3}
								/>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleCreateFolder}
									disabled={
										createFolderMutation.isPending ||
										!newFolderName.trim()
									}
									className="flex-1 cursor-pointer"
								>
									{createFolderMutation.isPending
										? 'Creating...'
										: 'Create'}
								</Button>
								<Button
									onClick={() => {
										setShowCreateDialog(false);
										setNewFolderName('');
										setNewFolderDescription('');
									}}
									variant="outline"
									className="flex-1 cursor-pointer"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Edit Folder Dialog */}
			{editingFolder && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								Edit Folder
							</h3>
							<button
								onClick={() => {
									setEditingFolder(null);
									setEditFolderName('');
									setEditFolderDescription('');
								}}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Folder Name *
								</label>
								<Input
									value={editFolderName}
									onChange={(e) =>
										setEditFolderName(e.target.value)
									}
									placeholder="Enter folder name"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<Textarea
									value={editFolderDescription}
									onChange={(e) =>
										setEditFolderDescription(e.target.value)
									}
									placeholder="Optional description"
									rows={3}
								/>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleUpdateFolder}
									disabled={
										updateFolderMutation.isPending ||
										!editFolderName.trim()
									}
									className="flex-1 cursor-pointer"
								>
									{updateFolderMutation.isPending
										? 'Saving...'
										: 'Save'}
								</Button>
								<Button
									onClick={() => {
										setEditingFolder(null);
										setEditFolderName('');
										setEditFolderDescription('');
									}}
									variant="outline"
									className="flex-1 cursor-pointer"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Folder Confirmation */}
			{deletingFolder && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-red-700">
								Delete Folder
							</h3>
							<button
								onClick={() => setDeletingFolder(null)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<p className="text-gray-700">
								Are you sure you want to delete{' '}
								<strong>{deletingFolder.name}</strong>?
							</p>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
								<p className="text-sm text-yellow-800">
									Warning: This will also delete all reports
									in this folder.
								</p>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleDeleteFolder}
									disabled={deleteFolderMutation.isPending}
									className="flex-1 bg-red-700 text-white hover:bg-red-700 cursor-pointer"
								>
									{deleteFolderMutation.isPending
										? 'Deleting...'
										: 'Delete'}
								</Button>
								<Button
									onClick={() => setDeletingFolder(null)}
									variant="outline"
									className="flex-1 cursor-pointer"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
