export const DEFAULT_SPOOL_STATUS = '-1'
export const DEFAULT_SPOOL_RECORD_STATUS = 'all'
export const DEFAULT_ORDER_STATUS = 'all'

export function normalizeSpoolStatus(value?: string | null) {
    return value && ['-1', '0', '1', '2', '3'].includes(value) ? value : DEFAULT_SPOOL_STATUS
}

export function normalizeSpoolRecordStatus(value?: string | null) {
    return value && ['all', '2', '3', '4'].includes(value) ? value : DEFAULT_SPOOL_RECORD_STATUS
}

export function normalizeOrderStatus(value?: string | null) {
    return value && ['all', '1', '2', '3', '4'].includes(value) ? value : DEFAULT_ORDER_STATUS
}
