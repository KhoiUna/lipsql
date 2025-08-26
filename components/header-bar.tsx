'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthCheck, useLogout } from '@/lib/hooks/use-api';

export default function HeaderBar() {
	const router = useRouter();
	const authCheck = useAuthCheck();
	const logoutMutation = useLogout();

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
		<header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo and Title */}
					<Link href="/" className="flex items-center space-x-3">
						<Image
							src="/images/android-chrome-192x192.png"
							alt="PlainSQL Logo"
							width={32}
							height={32}
							className="rounded-lg"
						/>
						<span className="text-xl font-bold text-black">
							PlainSQL
						</span>
					</Link>

					{/* Navigation and Auth */}
					<div className="flex items-center space-x-4">
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
						) : isAuthenticated ? (
							<button
								type="button"
								onClick={handleLogout}
								disabled={logoutMutation.isPending}
								className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
							>
								{logoutMutation.isPending
									? 'Signing out...'
									: 'Sign Out'}
							</button>
						) : (
							<button
								type="button"
								onClick={handleLogin}
								className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
							>
								Sign In
							</button>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
