'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import HeaderBar from '@/components/header-bar';
import { useFolders, useFolderReports } from '@/lib/hooks/use-api';
import { Button } from '@/components/ui/button';
import { FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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

	const folder = foldersQuery.data?.folders.find((f) => f.id === folderId);
	const reports = reportsQuery.data?.reports || [];

	const handleReportClick = (reportId: number) => {
		router.push(`/folders/${folderId}/report/${reportId}`);
	};

	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div className="max-w-7xl mx-auto">
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
										Create a report using the Visual Query
										Builder and save it to this folder
									</p>
									<Button
										onClick={() => router.push('/')}
										className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
									>
										Go to Query Builder
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{reports.map((report) => (
										<div
											key={report.id}
											onClick={() =>
												handleReportClick(report.id)
											}
											className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
										>
											<div className="flex items-start gap-4">
												<div className="p-3 bg-green-100 rounded-lg">
													<FileText
														size={24}
														className="text-green-600"
													/>
												</div>
												<div className="flex-1">
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
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
