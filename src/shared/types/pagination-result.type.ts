export interface PaginationResult<T> {
	data: T[];
	total: number;
	limit: number;
	page: number;
	totalPages: number;
	nextPage: number | null;
}
