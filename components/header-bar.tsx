'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HeaderBar() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const router = useRouter();

	const checkAuthStatus = async () => {
		try {
			const response = await fetch('/api/auth/check');
			setIsAuthenticated(response.ok);
		} catch (error) {
			setIsAuthenticated(false);
		}
	};

	useEffect(() => {
		checkAuthStatus();
	}, []);

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			setIsAuthenticated(false);
			router.push('/login');
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const handleLogin = () => {
		router.push('/login');
	};

	return (
		<header className='bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between items-center h-16'>
					{/* Logo and Brand */}
					<Link href='/' className='flex items-center space-x-3'>
						<div className='w-8 h-8 flex items-center justify-center'>
							<Image
								src='/images/favicon-32x32.png'
								alt='PlainSQL Logo'
								width={32}
								height={32}
								className='w-8 h-8'
							/>
						</div>
						<span className='text-xl font-bold text-black'>
							PlainSQL
						</span>
					</Link>

					{/* Version and Auth */}
					<div className='flex items-center space-x-6'>
						<span className='text-sm text-gray-500'>
							v{process.env.NEXT_PUBLIC_VERSION || '1.0.0'}
						</span>
						{isAuthenticated ? (
							<button
								onClick={handleLogout}
								className='text-gray-700 hover:text-black transition-colors duration-200 font-medium cursor-pointer'
							>
								Logout
							</button>
						) : (
							<button
								onClick={handleLogin}
								className='text-gray-700 hover:text-black transition-colors duration-200 font-medium cursor-pointer'
							>
								Login
							</button>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
