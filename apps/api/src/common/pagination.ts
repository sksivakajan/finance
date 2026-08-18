// Shared cursor-pagination parsing for list endpoints, per docs/BLUEPRINT.md
// §50 ("never load thousands at once"). Cursor is the id of the last row seen.
export interface PaginationQuery {
  cursor?: string;
  limit: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parsePagination(query: {
  cursor?: string;
  limit?: string;
}): PaginationQuery {
  const parsedLimit = query.limit
    ? Number.parseInt(query.limit, 10)
    : DEFAULT_LIMIT;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;
  return { cursor: query.cursor, limit };
}
