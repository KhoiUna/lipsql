'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthCheck, useLogout, useSchema } from '@/lib/hooks/use-api';
import Image from 'next/image';
import { useState } from 'react';
import { Info, FolderOpen, List } from 'lucide-react';
import SchemaInfoModal from './ui/schema-info-modal';

export default function HeaderBar() {
	const router = useRouter();
	const authCheck = useAuthCheck();
	const logoutMutation = useLogout();
	const schemaQuery = useSchema();
	const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

	const handleLogout = () => {
		logoutMutation.mutate(undefined, {
			onSuccess: () => {
				router.push('/login');
			},
			onError: (error) => {
				console.error('Logout failed:', error);
			},
		});
	};

	const handleLogin = () => {
		router.push('/login');
	};

	const isAuthenticated = authCheck.data?.authenticated || false;
	const isLoading = authCheck.isLoading;

	return (
		<>
			<header className="bg-secondary shadow-sm border-b border-gray-200 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* Logo and Title */}
						<Link href="/" className="flex items-center">
							<Image
								src="/images/android-chrome-192x192.png"
								alt="LipSQL Logo"
								width={40}
								height={40}
								className="rounded-lg"
							/>
							<span className="text-xs text-gray-500">
								{process.env.NEXT_PUBLIC_VERSION || '0.0.0'}
							</span>
						</Link>

						{/* Navigation and Auth */}
						<div className="flex items-center gap-2 sm:gap-4">
							{isAuthenticated && (
								<>
									<Link
										href="/folders"
										className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
										title="View Reports"
									>
										<FolderOpen size={18} />
										<span className="hidden sm:inline">
											Reports
										</span>
									</Link>
									<Link
										href="/dropdowns"
										className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
										title="Manage Dropdowns"
									>
										<List size={18} />
										<span className="hidden sm:inline">
											Dropdowns
										</span>
									</Link>
									<button
										type="button"
										onClick={() =>
											setIsSchemaModalOpen(true)
										}
										disabled={schemaQuery.isLoading}
										className="cursor-pointer flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
										title="View Database Schema"
									>
										{schemaQuery.isLoading ? (
											<div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
										) : (
											<Info size={18} />
										)}
										<span className="hidden sm:inline">
											Schema Info
										</span>
									</button>
								</>
							)}
							{isLoading ? (
								<div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
							) : isAuthenticated ? (
								<button
									type="button"
									onClick={handleLogout}
									disabled={logoutMutation.isPending}
									className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
								>
									{logoutMutation.isPending
										? 'Logging out'
										: 'Log Out'}
								</button>
							) : (
								<button
									type="button"
									onClick={handleLogin}
									className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
								>
									Log In
								</button>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Schema Info Modal */}
			{schemaQuery.data && (
				<SchemaInfoModal
					isOpen={isSchemaModalOpen}
					onClose={() => setIsSchemaModalOpen(false)}
					databaseType={schemaQuery.data.databaseType}
					databaseName={schemaQuery.data.databaseName}
					schema={schemaQuery.data.schema}
					relationships={schemaQuery.data.relationships}
				/>
			)}
		</>
	);
}
