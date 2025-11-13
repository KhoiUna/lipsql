import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisualQuery } from '../query-builder-types';

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
	executionTime: number;
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
	executionTime: number;
	timestamp: string;
}

interface SchemaResponse {
	success: boolean;
	databaseType: string;
	databaseName: string;
	schema: {
		tables: {
			name: string;
			columns: {
				column: string;
				type: string;
				nullable: boolean;
				default?: string;
			}[];
		}[];
	};
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

interface FoldersResponse {
	success: boolean;
	folders: any[];
	timestamp: string;
}

interface CreateFolderRequest {
	name: string;
	description?: string;
}

interface CreateFolderResponse {
	success: boolean;
	folderId: number;
	message: string;
	timestamp: string;
}

interface Report {
	id: number;
	folder_id: number;
	name: string;
	description?: string;
	type: 'visual' | 'ai';
	query_config: VisualQuery;
	default_visible_columns: string[];
	created_at: string;
	base_sql?: string;
}

interface FolderReportsResponse {
	success: boolean;
	reports: Report[];
	timestamp: string;
}

interface ReportResponse {
	success: boolean;
	report: Report;
	parameters: any[];
	timestamp: string;
}

interface CreateReportRequest {
	folder_id: number;
	name: string;
	description?: string;
	type: 'visual' | 'ai';
	query_config: any;
	base_sql?: string;
	default_visible_columns?: string[];
	parameters?: any[];
}

interface CreateReportResponse {
	success: boolean;
	reportId: number;
	message: string;
	timestamp: string;
}

interface UpdateFolderRequest {
	name?: string;
	description?: string;
}

interface UpdateReportRequest {
	name?: string;
	description?: string;
	query_config?: any;
	parameters?: any[];
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

	async getFolders(): Promise<FoldersResponse> {
		const response = await fetch('/api/folders');

		if (!response.ok) {
			throw new Error('Failed to fetch folders');
		}

		return response.json();
	},

	async createFolder(
		data: CreateFolderRequest
	): Promise<CreateFolderResponse> {
		const response = await fetch('/api/folders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to create folder');
		}

		return response.json();
	},

	async getFolderReports(folderId: number): Promise<FolderReportsResponse> {
		const response = await fetch(`/api/folders/${folderId}/reports`);

		if (!response.ok) {
			throw new Error('Failed to fetch folder reports');
		}

		return response.json();
	},

	async getReport(reportId: number): Promise<ReportResponse> {
		const response = await fetch(`/api/reports/${reportId}`);

		if (!response.ok) {
			throw new Error('Failed to fetch report');
		}

		return response.json();
	},

	async createReport(
		data: CreateReportRequest
	): Promise<CreateReportResponse> {
		const response = await fetch('/api/reports', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to create report');
		}

		return response.json();
	},

	async convertSqlToReport(sql: string): Promise<{
		success: boolean;
		query_config: any;
		parameters: any[];
	}> {
		const response = await fetch('/api/reports/convert', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sql }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				errorData.error || 'Failed to convert SQL to report'
			);
		}

		return response.json();
	},

	async updateFolder(id: number, data: UpdateFolderRequest): Promise<void> {
		const response = await fetch(`/api/folders/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to update folder');
		}
	},

	async deleteFolder(id: number): Promise<void> {
		const response = await fetch(`/api/folders/${id}`, {
			method: 'DELETE',
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to delete folder');
		}
	},

	async updateReport(id: number, data: UpdateReportRequest): Promise<void> {
		const response = await fetch(`/api/reports/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to update report');
		}
	},

	async deleteReport(id: number): Promise<void> {
		const response = await fetch(`/api/reports/${id}`, {
			method: 'DELETE',
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to delete report');
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
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.login,
		onSuccess: () => {
			// Invalidate auth check to refresh the login status
			queryClient.invalidateQueries({ queryKey: ['auth'] });
		},
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

			// Invalidate auth check to refresh the login status
			queryClient.invalidateQueries({ queryKey: ['auth'] });
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
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.executeDirectSql,
		onSuccess: (data) => {
			// Save to history on successful query
			api.saveHistory({
				naturalQuery: data.sql.trim(),
				generatedSql: data.sql.trim(),
			}).catch(console.error);

			// Invalidate history to refresh it
			queryClient.invalidateQueries({ queryKey: ['history'] });
		},
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

// Folder hooks
export function useFolders() {
	return useQuery({
		queryKey: ['folders'],
		queryFn: api.getFolders,
	});
}

export function useCreateFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createFolder,
		onSuccess: () => {
			// Invalidate folders to refresh the list
			queryClient.invalidateQueries({ queryKey: ['folders'] });
		},
	});
}

export function useFolderReports(folderId: number) {
	return useQuery({
		queryKey: ['folderReports', folderId],
		queryFn: () => api.getFolderReports(folderId),
		enabled: !!folderId,
	});
}

// Report hooks
export function useReport(reportId: number) {
	return useQuery({
		queryKey: ['report', reportId],
		queryFn: () => api.getReport(reportId),
		enabled: !!reportId,
	});
}

export function useCreateReport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createReport,
		onSuccess: () => {
			// Invalidate folders and reports to refresh
			queryClient.invalidateQueries({ queryKey: ['folders'] });
			queryClient.invalidateQueries({ queryKey: ['folderReports'] });
		},
	});
}

export function useConvertSqlToReport() {
	return useMutation({
		mutationFn: api.convertSqlToReport,
	});
}

export function useUpdateFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdateFolderRequest }) =>
			api.updateFolder(id, data),
		onSuccess: () => {
			// Invalidate folders to refresh the list
			queryClient.invalidateQueries({ queryKey: ['folders'] });
		},
	});
}

export function useDeleteFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteFolder,
		onSuccess: () => {
			// Invalidate folders to refresh the list
			queryClient.invalidateQueries({ queryKey: ['folders'] });
			queryClient.invalidateQueries({ queryKey: ['folderReports'] });
		},
	});
}

export function useUpdateReport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdateReportRequest }) =>
			api.updateReport(id, data),
		onSuccess: () => {
			// Invalidate reports to refresh the list
			queryClient.invalidateQueries({ queryKey: ['folderReports'] });
			queryClient.invalidateQueries({ queryKey: ['report'] });
		},
	});
}

export function useDeleteReport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteReport,
		onSuccess: () => {
			// Invalidate reports to refresh the list
			queryClient.invalidateQueries({ queryKey: ['folderReports'] });
		},
	});
}
