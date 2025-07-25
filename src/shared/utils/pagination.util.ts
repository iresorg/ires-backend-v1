import { PaginationResult } from "../types/pagination-result.type";

export function buildPaginationResult<T>(
	data: T[],
	total: number,
	pagination: { page: number; limit: number },
): PaginationResult<T> {
	const { limit = 10, page = 1 } = pagination;
	const totalPages = Math.ceil(total / limit);
	return {
		data,
		total,
		limit,
		page,
		totalPages,
		nextPage: page < totalPages ? page + 1 : null,
	};
}
