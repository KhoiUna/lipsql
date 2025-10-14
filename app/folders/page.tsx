'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HeaderBar from '@/components/header-bar';
import { useFolders, useCreateFolder } from '@/lib/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Folder, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FoldersPage() {
	const router = useRouter();
	const foldersQuery = useFolders();
	const createFolderMutation = useCreateFolder();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderDescription, setNewFolderDescription] = useState('');

	const folders = foldersQuery.data?.folders || [];

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
						<Button
							onClick={() => setShowCreateDialog(true)}
							className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
						>
							<Plus size={18} className="mr-2" />
							New Folder
						</Button>
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
									<Button
										onClick={() =>
											setShowCreateDialog(true)
										}
										className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
									>
										<Plus size={18} className="mr-2" />
										Create Folder
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{folders.map((folder) => (
										<div
											key={folder.id}
											onClick={() =>
												handleFolderClick(folder.id)
											}
											className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
										>
											<div className="flex items-start gap-4">
												<div className="p-3 bg-blue-100 rounded-lg">
													<Folder
														size={24}
														className="text-blue-600"
													/>
												</div>
												<div className="flex-1">
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
		</div>
	);
}
