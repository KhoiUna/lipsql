'use client';
import { useState } from 'react';
import HeaderBar from '@/components/header-bar';
import { useLogin } from '@/lib/hooks/use-api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const loginMutation = useLogin();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		loginMutation.mutate(
			{ username, password },
			{
				onSuccess: () => {
					router.push('/');
				},
				onError: (error) => {
					toast.error(error.message);
				},
			}
		);
	};

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<HeaderBar />

			<div className="flex-1 flex items-center justify-center p-4">
				<div className="w-full max-w-md bg-secondary rounded-xl shadow-sm border border-gray-200 p-8">
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold text-primary mb-2">
							Log In
						</h1>
					</div>

					<form onSubmit={handleLogin} className="space-y-4">
						<div>
							<label
								htmlFor="username"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Username
							</label>
							<input
								type="text"
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="Enter your username"
								required
								disabled={loginMutation.isPending}
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Password
							</label>
							<input
								type="password"
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="Enter your password"
								required
								disabled={loginMutation.isPending}
							/>
						</div>

						<button
							type="submit"
							className={`w-full py-3 rounded-lg font-semibold text-secondary transition-all duration-200 ${
								loginMutation.isPending
									? 'bg-gray-300 cursor-not-allowed'
									: 'bg-primary hover:bg-gray-800 active:bg-gray-900 shadow-sm'
							}`}
							disabled={loginMutation.isPending}
						>
							{loginMutation.isPending ? (
								<div className="flex items-center justify-center space-x-2">
									<div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
									<span>Logging In...</span>
								</div>
							) : (
								'Log In'
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
