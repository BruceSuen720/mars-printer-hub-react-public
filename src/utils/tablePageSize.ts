export const DEFAULT_TABLE_PAGE_SIZE = 10

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const normalizeTablePageSize = (pageSize?: number) => {
    if (!Number.isFinite(pageSize) || pageSize == null) {
        return DEFAULT_TABLE_PAGE_SIZE
    }

    const normalized = Math.floor(pageSize)
    return normalized > 0 ? normalized : DEFAULT_TABLE_PAGE_SIZE
}

export const getTablePageSizeOptions = (pageSize?: number) => {
    const normalized = normalizeTablePageSize(pageSize)
    return TABLE_PAGE_SIZE_OPTIONS.includes(normalized)
        ? TABLE_PAGE_SIZE_OPTIONS
        : [normalized, ...TABLE_PAGE_SIZE_OPTIONS].sort((a, b) => a - b)
}
