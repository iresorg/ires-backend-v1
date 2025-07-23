export interface PaginationResponse<T> {
    items: T[];
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
}

export interface PaginationQuery {
    limit?: number;
    page?: number;
}

export interface PaginationMeta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}


export function getPaginationMeta(
    total: number,
    currentPage: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    return {
      totalItems: total,
      totalPages,
      currentPage,
      nextPage: hasNext ? currentPage + 1 : null,
      prevPage: hasPrev ? currentPage - 1 : null,
    };
  }