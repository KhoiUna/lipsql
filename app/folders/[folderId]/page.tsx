'use client';
import { useRouter } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import HeaderBar from '@/components/header-bar';
import {
	useFolders,
	useFolderReports,
	useUpdateReport,
	useDeleteReport,
} from '@/lib/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	FileText,
	ChevronRight,
	MoreVertical,
	Edit,
	Trash2,
	X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function FolderPage({
	params,
}: {
	params: Promise<{ folderId: string }>;
}) {
	const resolvedParams = use(params);
	const router = useRouter();
	const folderId = parseInt(resolvedParams.folderId);

	const foldersQuery = useFolders();
	const reportsQuery = useFolderReports(folderId);
	const updateReportMutation = useUpdateReport();
	const deleteReportMutation = useDeleteReport();

	const [editingReport, setEditingReport] = useState<any>(null);
	const [editReportName, setEditReportName] = useState('');
	const [editReportDescription, setEditReportDescription] = useState('');

	const [deletingReport, setDeletingReport] = useState<any>(null);
	const [openDropdown, setOpenDropdown] = useState<number | null>(null);

	const folder = foldersQuery.data?.folders.find((f) => f.id === folderId);
	const reports = reportsQuery.data?.reports || [];

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

	const handleReportClick = (reportId: number) => {
		router.push(`/folders/${folderId}/report/${reportId}`);
	};

	const handleEditReport = (report: any) => {
		setEditingReport(report);
		setEditReportName(report.name);
		setEditReportDescription(report.description || '');
		setOpenDropdown(null);
	};

	const handleUpdateReport = async () => {
		if (!editReportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}

		try {
			await updateReportMutation.mutateAsync({
				id: editingReport.id,
				data: {
					name: editReportName.trim(),
					description: editReportDescription.trim() || undefined,
				},
			});

			toast.success('Report updated successfully');
			setEditingReport(null);
			setEditReportName('');
			setEditReportDescription('');
		} catch (error) {
			console.error('Update report error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to update report'
			);
		}
	};

	const handleDeleteReport = async () => {
		if (!deletingReport) return;

		try {
			await deleteReportMutation.mutateAsync(deletingReport.id);

			toast.success('Report deleted successfully');
			setDeletingReport(null);
		} catch (error) {
			console.error('Delete report error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to delete report'
			);
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div>
					{/* Breadcrumb */}
					<div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
						<Link href="/folders" className="hover:text-primary">
							Folders
						</Link>
						<ChevronRight size={16} />
						<span className="text-primary font-medium">
							{folder?.name || 'Loading...'}
						</span>
					</div>

					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-primary mb-2">
							{folder?.name || 'Loading...'}
						</h1>
						{folder?.description && (
							<p className="text-gray-600">
								{folder.description}
							</p>
						)}
					</div>

					{/* Loading State */}
					{reportsQuery.isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
						</div>
					)}

					{/* Error State */}
					{reportsQuery.error && (
						<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
							<p className="font-semibold">Error</p>
							<p>{reportsQuery.error.message}</p>
						</div>
					)}

					{/* Reports List */}
					{!reportsQuery.isLoading && !reportsQuery.error && (
						<>
							{reports.length === 0 ? (
								<div className="text-center py-12">
									<FileText
										size={64}
										className="mx-auto text-gray-400 mb-4"
									/>
									<h3 className="text-xl font-semibold text-gray-700 mb-2">
										No reports in this folder
									</h3>
									<p className="text-gray-600 mb-6">
										Please create a report and save it to
										this folder
									</p>
									<Button
										onClick={() => router.push('/')}
										className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
									>
										Build Report
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{reports.map((report) => (
										<div
											key={report.id}
											className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow relative"
										>
											<div className="flex items-start gap-4">
												<div
													onClick={() =>
														handleReportClick(
															report.id
														)
													}
													className="p-3 bg-green-100 rounded-lg cursor-pointer"
												>
													<FileText
														size={24}
														className="text-green-600"
													/>
												</div>
												<div
													onClick={() =>
														handleReportClick(
															report.id
														)
													}
													className="flex-1 cursor-pointer"
												>
													<h3 className="text-lg font-semibold text-primary mb-1">
														{report.name}
													</h3>
													{report.description && (
														<p className="text-sm text-gray-600 line-clamp-2">
															{report.description}
														</p>
													)}
													<p className="text-xs text-gray-400 mt-2">
														Created{' '}
														{new Date(
															report.created_at
														).toLocaleDateString()}
													</p>
												</div>
												<div className="relative">
													<button
														onClick={(e) => {
															e.stopPropagation();
															setOpenDropdown(
																openDropdown ===
																	report.id
																	? null
																	: report.id
															);
														}}
														className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
													>
														<MoreVertical
															size={20}
														/>
													</button>
													{openDropdown ===
														report.id && (
														<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
															<button
																onClick={(
																	e
																) => {
																	e.stopPropagation();
																	handleEditReport(
																		report
																	);
																}}
																className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 rounded-t-lg"
															>
																<Edit
																	size={16}
																/>
																Edit
															</button>
															<button
																onClick={(
																	e
																) => {
																	e.stopPropagation();
																	setDeletingReport(
																		report
																	);
																	setOpenDropdown(
																		null
																	);
																}}
																className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-700 rounded-b-lg"
															>
																<Trash2
																	size={16}
																/>
																Delete
															</button>
														</div>
													)}
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

			{/* Edit Report Dialog */}
			{editingReport && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								Edit Report
							</h3>
							<button
								onClick={() => {
									setEditingReport(null);
									setEditReportName('');
									setEditReportDescription('');
								}}
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
									value={editReportName}
									onChange={(e) =>
										setEditReportName(e.target.value)
									}
									placeholder="Enter report name"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<Textarea
									value={editReportDescription}
									onChange={(e) =>
										setEditReportDescription(e.target.value)
									}
									placeholder="Optional description"
									rows={3}
								/>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleUpdateReport}
									disabled={
										updateReportMutation.isPending ||
										!editReportName.trim()
									}
									className="flex-1 cursor-pointer"
								>
									{updateReportMutation.isPending
										? 'Saving...'
										: 'Save'}
								</Button>
								<Button
									onClick={() => {
										setEditingReport(null);
										setEditReportName('');
										setEditReportDescription('');
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

			{/* Delete Report Confirmation */}
			{deletingReport && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-red-700">
								Delete Report
							</h3>
							<button
								onClick={() => setDeletingReport(null)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<p className="text-gray-700">
								Are you sure you want to delete{' '}
								<strong>{deletingReport.name}</strong>?
							</p>

							<div className="flex gap-3">
								<Button
									onClick={handleDeleteReport}
									disabled={deleteReportMutation.isPending}
									className="flex-1 bg-red-700 text-white hover:bg-red-700 cursor-pointer"
								>
									{deleteReportMutation.isPending
										? 'Deleting...'
										: 'Delete'}
								</Button>
								<Button
									onClick={() => setDeletingReport(null)}
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
