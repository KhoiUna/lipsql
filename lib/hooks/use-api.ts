import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
interface QueryRequest {
	query: string;
}

interface QueryResponse {
	success: boolean;
	originalQuery: string;
	sql: string;
	result: {
		rows: any[];
		rowCount: number;
		fields: Array<{
			name: string;
			dataTypeID: number;
		}>;
	};
	timestamp: string;
}

interface LoginRequest {
	username: string;
	password: string;
}

interface LoginResponse {
	success: boolean;
	error?: string;
}

interface AuthCheckResponse {
	authenticated: boolean;
}

interface HistoryItem {
	id: number;
	natural_query: string;
	generated_sql: string;
	timestamp: string;
}

interface HistoryResponse {
	success: boolean;
	history: HistoryItem[];
}

interface SaveHistoryRequest {
	naturalQuery: string;
	generatedSql: string;
}

interface DirectSqlRequest {
	sql: string;
}

interface DirectSqlResponse {
	success: boolean;
	sql: string;
	result: {
		rows: any[];
		rowCount: number;
		fields: Array<{
			name: string;
			dataTypeID: number;
		}>;
	};
	timestamp: string;
}

interface SchemaResponse {
	success: boolean;
	databaseType: string;
	databaseName: string;
	schema: string;
	relationships: any[];
	timestamp: string;
}

interface SavedQueryItem {
	id: number;
	saved_name: string;
	natural_query: string | null;
	generated_sql: string;
	timestamp: string;
	user_id: string;
}

interface SavedQueriesResponse {
	success: boolean;
	savedQueries: SavedQueryItem[];
	timestamp: string;
}

interface SaveQueryRequest {
	savedName: string;
	naturalQuery?: string | null;
	generatedSql: string;
}

interface UpdateQueryNameRequest {
	savedName: string;
}

// API functions
const api = {
	async query(data: QueryRequest): Promise<QueryResponse> {
		const response = await fetch('/api/query', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Query failed');
		}

		return response.json();
	},

	async login(data: LoginRequest): Promise<LoginResponse> {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(data),
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Login failed');
		}

		return result;
	},

	async checkAuth(): Promise<AuthCheckResponse> {
		const response = await fetch('/api/auth/check');
		return response.json();
	},

	async logout(): Promise<void> {
		await fetch('/api/auth/logout', { method: 'POST' });
	},

	async getHistory(): Promise<HistoryResponse> {
		const response = await fetch('/api/history');

		if (!response.ok) {
			throw new Error('Failed to fetch history');
		}

		return response.json();
	},

	async saveHistory(data: SaveHistoryRequest): Promise<void> {
		const response = await fetch('/api/history', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error('Failed to save history');
		}
	},

	async executeDirectSql(data: DirectSqlRequest): Promise<DirectSqlResponse> {
		const response = await fetch('/api/query/direct', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Direct SQL execution failed');
		}

		return response.json();
	},

	async getSchema(): Promise<SchemaResponse> {
		const response = await fetch('/api/schema');

		if (!response.ok) {
			throw new Error('Failed to fetch schema information');
		}

		return response.json();
	},

	async getSavedQueries(): Promise<SavedQueriesResponse> {
		const response = await fetch('/api/saved-queries');

		if (!response.ok) {
			throw new Error('Failed to fetch saved queries');
		}

		return response.json();
	},

	async saveQuery(data: SaveQueryRequest): Promise<void> {
		const response = await fetch('/api/saved-queries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to save query');
		}
	},

	async updateSavedQueryName(
		id: number,
		data: UpdateQueryNameRequest
	): Promise<void> {
		const response = await fetch(`/api/saved-queries/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to update query name');
		}
	},

	async deleteSavedQuery(id: number): Promise<void> {
		const response = await fetch(`/api/saved-queries/${id}`, {
			method: 'DELETE',
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to delete query');
		}
	},
};

// Custom hooks
export function useQueryExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.query,
		onSuccess: (data) => {
			// Save to history on successful query
			api.saveHistory({
				naturalQuery: data.originalQuery.trim(),
				generatedSql: data.sql,
			}).catch(console.error);

			// Invalidate history to refresh it
			queryClient.invalidateQueries({ queryKey: ['history'] });
		},
	});
}

export function useLogin() {
	return useMutation({
		mutationFn: api.login,
	});
}

export function useAuthCheck() {
	return useQuery({
		queryKey: ['auth'],
		queryFn: api.checkAuth,
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.logout,
		onSuccess: () => {
			// Clear all queries on logout
			queryClient.clear();
		},
	});
}

export function useHistory() {
	return useQuery({
		queryKey: ['history'],
		queryFn: api.getHistory,
	});
}

export function useDirectSqlExecution() {
	return useMutation({
		mutationFn: api.executeDirectSql,
	});
}

export function useSchema() {
	return useQuery({
		queryKey: ['schema'],
		queryFn: api.getSchema,
	});
}

export function useSavedQueries() {
	return useQuery({
		queryKey: ['savedQueries'],
		queryFn: api.getSavedQueries,
	});
}

export function useSaveQuery() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.saveQuery,
		onSuccess: () => {
			// Invalidate saved queries to refresh the list
			queryClient.invalidateQueries({ queryKey: ['savedQueries'] });
		},
	});
}

export function useUpdateSavedQueryName() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number;
			data: UpdateQueryNameRequest;
		}) => api.updateSavedQueryName(id, data),
		onSuccess: () => {
			// Invalidate saved queries to refresh the list
			queryClient.invalidateQueries({ queryKey: ['savedQueries'] });
		},
	});
}

export function useDeleteSavedQuery() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteSavedQuery,
		onSuccess: () => {
			// Invalidate saved queries to refresh the list
			queryClient.invalidateQueries({ queryKey: ['savedQueries'] });
		},
	});
}
