'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Folder {
	id: number;
	name: string;
	description?: string;
}

interface SaveAIReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: {
		name: string;
		description: string;
		folderId: number;
	}) => Promise<void>;
	folders: Folder[];
	isLoading: boolean;
}

export default function SaveAIReportDialog({
	isOpen,
	onClose,
	onSave,
	folders,
	isLoading,
}: SaveAIReportDialogProps) {
	const [reportName, setReportName] = useState('');
	const [reportDescription, setReportDescription] = useState('');
	const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
		null
	);
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderDescription, setNewFolderDescription] = useState('');
	const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);

	if (!isOpen) return null;

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) {
			toast.error('Please enter a folder name');
			return;
		}

		setIsCreatingNewFolder(true);
		try {
			const response = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newFolderName.trim(),
					description: newFolderDescription.trim() || undefined,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Folder created successfully');
				setSelectedFolderId(data.folderId);
				setIsCreatingFolder(false);
				setNewFolderName('');
				setNewFolderDescription('');
			} else {
				toast.error(data.error || 'Failed to create folder');
			}
		} catch (error) {
			console.error('Create folder error:', error);
			toast.error('Failed to create folder');
		} finally {
			setIsCreatingNewFolder(false);
		}
	};

	const handleSave = async () => {
		if (!reportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}

		if (!selectedFolderId) {
			toast.error('Please select a folder');
			return;
		}

		await onSave({
			name: reportName.trim(),
			description: reportDescription.trim(),
			folderId: selectedFolderId,
		});

		// Reset form
		setReportName('');
		setReportDescription('');
		setSelectedFolderId(null);
		setIsCreatingFolder(false);
	};

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">Save AI Report</h3>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Report Name *
						</label>
						<Input
							value={reportName}
							onChange={(e) => setReportName(e.target.value)}
							placeholder="Enter report name"
							autoFocus
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Description
						</label>
						<Textarea
							value={reportDescription}
							onChange={(e) =>
								setReportDescription(e.target.value)
							}
							placeholder="Optional description"
							rows={3}
						/>
					</div>

					<div>
						<div className="flex items-center justify-between mb-1">
							<label className="block text-sm font-medium text-gray-700">
								Folder *
							</label>
							<button
								onClick={() =>
									setIsCreatingFolder(!isCreatingFolder)
								}
								className="text-sm text-primary hover:underline flex items-center gap-1"
							>
								<Plus size={14} />
								New Folder
							</button>
						</div>

						{isCreatingFolder ? (
							<div className="space-y-2 p-3 border border-gray-200 rounded-md bg-gray-50">
								<Input
									value={newFolderName}
									onChange={(e) =>
										setNewFolderName(e.target.value)
									}
									placeholder="Folder name"
								/>
								<Input
									value={newFolderDescription}
									onChange={(e) =>
										setNewFolderDescription(e.target.value)
									}
									placeholder="Description (optional)"
								/>
								<div className="flex gap-2">
									<Button
										onClick={handleCreateFolder}
										disabled={
											isCreatingNewFolder ||
											!newFolderName.trim()
										}
										size="sm"
										className="flex-1 cursor-pointer"
									>
										{isCreatingNewFolder
											? 'Creating...'
											: 'Create'}
									</Button>
									<Button
										onClick={() => {
											setIsCreatingFolder(false);
											setNewFolderName('');
											setNewFolderDescription('');
										}}
										size="sm"
										variant="outline"
										className="flex-1 cursor-pointer"
									>
										Cancel
									</Button>
								</div>
							</div>
						) : (
							<select
								value={selectedFolderId || ''}
								onChange={(e) =>
									setSelectedFolderId(Number(e.target.value))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
							>
								<option value="">Select folder...</option>
								{folders.map((f) => (
									<option key={f.id} value={f.id}>
										{f.name}
									</option>
								))}
							</select>
						)}
					</div>

					<div className="flex gap-3">
						<Button
							onClick={handleSave}
							disabled={
								isLoading ||
								!reportName.trim() ||
								!selectedFolderId
							}
							className="flex-1 cursor-pointer"
						>
							{isLoading ? 'Saving...' : 'Save'}
						</Button>
						<Button
							onClick={onClose}
							variant="outline"
							className="flex-1 cursor-pointer"
						>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
