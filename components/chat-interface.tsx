'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

interface ChatInterfaceProps {
	className?: string;
	onParameterDetected?: (parameters: any[]) => void;
}

export default function ChatInterface({
	className,
	onParameterDetected,
}: ChatInterfaceProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: 'user',
			content: input.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		setIsLoading(true);

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					messages: [...messages, userMessage],
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to get response');
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: '',
			};

			setMessages((prev) => [...prev, assistantMessage]);

			const decoder = new TextDecoder();
			let done = false;

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;

				if (value) {
					const chunk = decoder.decode(value);
					console.log('Received chunk:', chunk);

					// Simple approach: just append the chunk to the message
					if (chunk.trim()) {
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === assistantMessage.id
									? {
											...msg,
											content: msg.content + chunk,
									  }
									: msg
							)
						);
					}
				}
			}

			// Check if the final message contains SQL and try to identify parameters
			const finalMessage = messages[messages.length - 1];
			if (
				finalMessage?.content.includes('SELECT') ||
				finalMessage?.content.includes('FROM')
			) {
				// Extract SQL from the message content
				const sqlMatch = finalMessage.content.match(
					/```sql\n([\s\S]*?)\n```/
				);
				if (sqlMatch) {
					const sql = sqlMatch[1];
					// Trigger parameter identification
					if (onParameterDetected) {
						onParameterDetected([]);
					}
				}
			}
		} catch (error) {
			console.error('Chat error:', error);
			setMessages((prev) => [
				...prev,
				{
					id: (Date.now() + 1).toString(),
					role: 'assistant',
					content: 'Sorry, I encountered an error. Please try again.',
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
	};

	return (
		<div className={cn('flex flex-col h-full', className)}>
			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 && (
					<div className="text-center text-gray-500 py-8">
						<p className="text-lg font-medium">
							Start a conversation with AI
						</p>
						<p className="text-sm">
							Ask about SQL queries, database schema, or request
							help with queries
						</p>
					</div>
				)}

				{messages.map((message) => (
					<div
						key={message.id}
						className={cn(
							'flex gap-3 p-4 rounded-lg',
							message.role === 'user'
								? 'bg-blue-50 ml-8'
								: 'bg-gray-50 mr-8'
						)}
					>
						<div className="flex-shrink-0">
							{message.role === 'user' ? (
								<User className="w-5 h-5 text-blue-600" />
							) : (
								<Bot className="w-5 h-5 text-gray-600" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="prose prose-sm max-w-none">
								{message.content
									.split('\n')
									.map((line, index) => {
										// Check if line contains SQL code
										if (
											line.startsWith('```sql') ||
											line.startsWith('```')
										) {
											return null; // Skip code block markers
										}
										if (
											line.includes('SELECT') &&
											line.includes('FROM')
										) {
											return (
												<pre
													key={index}
													className="bg-gray-100 p-3 rounded-md overflow-x-auto"
												>
													<code className="text-sm">
														{line}
													</code>
												</pre>
											);
										}
										return (
											<p
												key={index}
												className="mb-2 last:mb-0"
											>
												{line}
											</p>
										);
									})}
							</div>
						</div>
					</div>
				))}

				{isLoading && (
					<div className="flex gap-3 p-4 rounded-lg bg-gray-50 mr-8">
						<Bot className="w-5 h-5 text-gray-600 flex-shrink-0" />
						<div className="flex-1">
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '0.1s' }}
								></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '0.2s' }}
								></div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Input */}
			<form onSubmit={handleSubmit} className="p-4 border-t">
				<div className="flex gap-2">
					<Textarea
						value={input}
						onChange={handleInputChange}
						placeholder="Ask about SQL queries or describe what you want to query..."
						className="flex-1"
						disabled={isLoading}
					/>
					<Button
						type="submit"
						disabled={isLoading || !input.trim()}
						className="self-end"
					>
						<Send className="w-4 h-4" />
					</Button>
				</div>
			</form>
		</div>
	);
}
