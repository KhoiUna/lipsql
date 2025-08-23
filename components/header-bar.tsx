'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function HeaderBar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
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

					{/* Desktop Navigation */}
					<nav className='hidden md:flex items-center space-x-8'>
						<Link
							href='/'
							className='text-gray-700 hover:text-black transition-colors duration-200 font-medium'
						>
							Query
						</Link>
						<Link
							href='/docs'
							className='text-gray-700 hover:text-black transition-colors duration-200 font-medium'
						>
							Documentation
						</Link>
						<Link
							href='/about'
							className='text-gray-700 hover:text-black transition-colors duration-200 font-medium'
						>
							About
						</Link>
						<Link
							href='/contact'
							className='text-gray-700 hover:text-black transition-colors duration-200 font-medium'
						>
							Contact
						</Link>
					</nav>

					{/* Mobile menu button */}
					<div className='md:hidden'>
						<button
							onClick={toggleMenu}
							className='text-gray-700 hover:text-black focus:outline-none focus:text-black transition-colors duration-200'
						>
							<svg
								className='h-6 w-6'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								{isMenuOpen ? (
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M6 18L18 6M6 6l12 12'
									/>
								) : (
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M4 6h16M4 12h16M4 18h16'
									/>
								)}
							</svg>
						</button>
					</div>
				</div>

				{/* Mobile Navigation */}
				{isMenuOpen && (
					<div className='md:hidden'>
						<div className='px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200'>
							<Link
								href='/'
								className='block px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-md font-medium transition-colors duration-200'
								onClick={() => setIsMenuOpen(false)}
							>
								Query
							</Link>
							<Link
								href='/docs'
								className='block px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-md font-medium transition-colors duration-200'
								onClick={() => setIsMenuOpen(false)}
							>
								Documentation
							</Link>
							<Link
								href='/about'
								className='block px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-md font-medium transition-colors duration-200'
								onClick={() => setIsMenuOpen(false)}
							>
								About
							</Link>
							<Link
								href='/contact'
								className='block px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-md font-medium transition-colors duration-200'
								onClick={() => setIsMenuOpen(false)}
							>
								Contact
							</Link>
						</div>
					</div>
				)}
			</div>
		</header>
	);
}
