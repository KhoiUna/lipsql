'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
	useFolders,
	useCreateFolder,
	useCreateReport,
} from '@/lib/hooks/use-api';
import { ReportParameter } from '@/lib/query-builder-types';

interface SaveAIReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	sql: string;
	detectedParameters: Omit<ReportParameter, 'id' | 'report_id'>[];
	selectedParameters: Set<string>;
	parameterLabels: Record<string, string>;
	parameterTypes: Record<string, string>;
	parameterDropdowns: Record<string, number | null>;
	onSuccess: () => void;
}

export default function SaveAIReportDialog({
	isOpen,
	onClose,
	sql,
	detectedParameters,
	selectedParameters,
	parameterLabels,
	parameterTypes,
	parameterDropdowns,
	onSuccess,
}: SaveAIReportDialogProps) {
	const [folderSelection, setFolderSelection] = useState<'existing' | 'new'>(
		'existing'
	);
	const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
		null
	);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderDescription, setNewFolderDescription] = useState('');
	const [reportName, setReportName] = useState('');
	const [reportDescription, setReportDescription] = useState('');

	const foldersQuery = useFolders();
	const createFolderMutation = useCreateFolder();
	const createReportMutation = useCreateReport();

	const folders = foldersQuery.data?.folders || [];

	// Set default folder selection
	useEffect(() => {
		if (folders.length > 0 && !selectedFolderId) {
			setSelectedFolderId(folders[0].id);
		}
	}, [folders, selectedFolderId]);

	if (!isOpen) return null;

	const handleSave = async () => {
		// Validate inputs
		if (!reportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}

		if (folderSelection === 'existing' && !selectedFolderId) {
			toast.error('Please select a folder');
			return;
		}

		if (folderSelection === 'new' && !newFolderName.trim()) {
			toast.error('Please enter a folder name');
			return;
		}

		if (selectedParameters.size === 0) {
			toast.error('Please select at least one parameter');
			return;
		}

		try {
			let folderId = selectedFolderId;

			// Create new folder if needed
			if (folderSelection === 'new') {
				const folderResult = await createFolderMutation.mutateAsync({
					name: newFolderName.trim(),
					description: newFolderDescription.trim() || undefined,
				});
				folderId = folderResult.folderId;
			}

			if (!folderId) {
				toast.error('Failed to determine folder');
				return;
			}

			// Prepare parameters for the selected ones
			const parameters = detectedParameters
				.filter((p) => selectedParameters.has(p.field))
				.map((p) => ({
					field: p.field,
					label: parameterLabels[p.field] || p.label,
					type: parameterTypes[p.field] || p.type,
					default_value: p.default_value,
					required: false,
					dropdown_id: parameterDropdowns[p.field] || undefined,
				}));

			// Create a minimal query_config for AI reports
			const queryConfig = {
				distinct: false,
				tables: [],
				joins: [],
				conditions: [],
				groupBy: [],
				orderBy: [],
			};

			// Create the report
			await createReportMutation.mutateAsync({
				folder_id: folderId,
				name: reportName.trim(),
				description: reportDescription.trim() || undefined,
				type: 'ai',
				query_config: queryConfig,
				base_sql: sql,
				parameters,
			});

			toast.success('AI Report created successfully');
			handleClose();
			onSuccess();
		} catch (error) {
			console.error('Save report error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to save report'
			);
		}
	};

	const handleClose = () => {
		setFolderSelection('existing');
		setSelectedFolderId(null);
		setNewFolderName('');
		setNewFolderDescription('');
		setReportName('');
		setReportDescription('');
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-2xl font-bold text-primary">
						Save as Report
					</h2>
					<button
						onClick={handleClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Folder Selection */}
					<div>
						<h3 className="text-lg font-semibold text-primary mb-3">
							Folder
						</h3>
						<div className="space-y-3">
							{folders.length > 0 && (
								<label className="flex items-center gap-2">
									<input
										type="radio"
										value="existing"
										checked={folderSelection === 'existing'}
										onChange={() =>
											setFolderSelection('existing')
										}
										className="w-4 h-4"
									/>
									<span className="font-medium">
										Select existing folder
									</span>
								</label>
							)}

							{folderSelection === 'existing' &&
								folders.length > 0 && (
									<select
										value={selectedFolderId || ''}
										onChange={(e) =>
											setSelectedFolderId(
												Number(e.target.value)
											)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2"
									>
										{folders.map((folder) => (
											<option
												key={folder.id}
												value={folder.id}
											>
												{folder.name}
											</option>
										))}
									</select>
								)}

							<label className="flex items-center gap-2">
								<input
									type="radio"
									value="new"
									checked={folderSelection === 'new'}
									onChange={() => setFolderSelection('new')}
									className="w-4 h-4"
								/>
								<span className="font-medium">
									Create new folder
								</span>
							</label>

							{folderSelection === 'new' && (
								<div className="ml-6 space-y-3">
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
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Folder Description
										</label>
										<Textarea
											value={newFolderDescription}
											onChange={(e) =>
												setNewFolderDescription(
													e.target.value
												)
											}
											placeholder="Optional description"
											rows={2}
										/>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Report Details */}
					<div>
						<h3 className="text-lg font-semibold text-primary mb-3">
							Report Details
						</h3>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Report Name *
								</label>
								<Input
									value={reportName}
									onChange={(e) =>
										setReportName(e.target.value)
									}
									placeholder="Enter report name"
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
						</div>
					</div>

					{/* Parameters Preview */}
					{detectedParameters.length > 0 && (
						<div>
							<h3 className="text-lg font-semibold text-primary mb-3">
								Selected Parameters
							</h3>
							<div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-2">
								{detectedParameters
									.filter((p) =>
										selectedParameters.has(p.field)
									)
									.map((param, index) => (
										<div
											key={index}
											className="flex items-center justify-between text-sm p-2 rounded"
										>
											<div className="flex items-center gap-3">
												<span className="font-mono text-gray-600">
													{param.field}
												</span>
												<span className="text-gray-400">
													→
												</span>
												<span className="font-medium">
													{parameterLabels[
														param.field
													] || param.label}
												</span>
											</div>
											<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
												{parameterTypes[param.field] ||
													param.type}
											</span>
										</div>
									))}
							</div>
							<p className="text-sm text-gray-600 mt-2">
								These parameters will be editable by users when
								running the report.
							</p>
						</div>
					)}

					{detectedParameters.length === 0 && (
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<p className="text-sm text-yellow-800">
								No parameters detected. This report will have no
								editable parameters.
							</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
					<Button
						onClick={handleClose}
						variant="outline"
						className="cursor-pointer"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={
							createFolderMutation.isPending ||
							createReportMutation.isPending ||
							!reportName.trim()
						}
						className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
					>
						{createFolderMutation.isPending ||
						createReportMutation.isPending
							? 'Saving...'
							: 'Save Report'}
					</Button>
				</div>
			</div>
		</div>
	);
}
