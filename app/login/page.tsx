'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HeaderBar from '@/components/header-bar';

export default function LoginPage() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});

			if (response.ok) {
				router.push('/');
			} else {
				setError('Invalid credentials');
			}
		} catch (err) {
			setError('Login failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='min-h-screen bg-gray-50 flex flex-col'>
			<HeaderBar />
			<div className='flex-1 flex items-center justify-center p-4'>
				<div className='w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
					<h1 className='text-2xl font-bold text-black mb-6 text-center'>
						Login
					</h1>

					{error && (
						<div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4'>
							{error}
						</div>
					)}

					<form onSubmit={handleLogin} className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-2'>
								Username
							</label>
							<input
								type='text'
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className='w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all'
								required
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700 mb-2'>
								Password
							</label>
							<input
								type='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className='w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all'
								required
							/>
						</div>

						<button
							type='submit'
							disabled={isLoading}
							className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
								isLoading
									? 'bg-gray-300 cursor-not-allowed'
									: 'bg-black hover:bg-gray-800'
							}`}
						>
							{isLoading ? 'Logging in...' : 'Login'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
