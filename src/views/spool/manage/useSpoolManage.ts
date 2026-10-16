import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    deleteSpool,
    getOptions,
    listSpools,
} from '@/api/spool'

import {
    useRemoteColorConfig,
    useRemoteSpoolConfig,
    useRemoteFilamentsConfig,
} from '@/hooks/useRemoteConfig'
import { useSpoolCalibration } from '@/hooks/useSpoolCalibration'
import { showRequestError } from '@/request'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { normalizeTablePageSize } from '@/utils/tablePageSize'
import { DEFAULT_SPOOL_STATUS, normalizeSpoolStatus } from '@/utils/userPreferences'
export interface SearchForm {
    status: string
    keyword: string
    materialType: string[]
    brand: string
    appearance: string[]
    minPrice?: number
    maxPrice?: number
}

export interface SortInfo {
    field: string
    order: 'asc' | 'desc' | ''
}

export interface Pagination {
    current: number
    pageSize: number
    total: number
}

export interface SpoolFormData {
    id?: number
    name: string
    materialType: string
    color: string
    brand: string
    num: number
    price?: number
    netWeight: number
    spoolWeight?: number
    usedWeight?: number
    totalWeightWithSpool?: number
    isBrandNew: boolean
    appearance?: number
    remark: string
}

const defaultSearchForm: SearchForm = {
    status: DEFAULT_SPOOL_STATUS,
    keyword: '',
    materialType: [],
    brand: '',
    appearance: [],
    minPrice: undefined,
    maxPrice: undefined,
}



export const statusOptions = [
    { label: '所有', value: '-1' },
    { label: '未使用', value: '0' },
    { label: '使用中', value: '1' },
    { label: '消耗完', value: '2' },
    { label: '可使用', value: '3' },
]

function parseArrayParam(value: string | null) {
    if (!value) return []
    return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function parseNumberParam(value: string | null) {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

/* ── Hook ── */
export function useSpoolManage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const preferredStatus = useUserConfigStore((s) => normalizeSpoolStatus(s.userConfig.spoolDefaultStatus))
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const hasStatusQuery = searchParams.has('status')

    const initialSearchForm = useMemo<SearchForm>(() => ({
        status: normalizeSpoolStatus(searchParams.get('status') || preferredStatus),
        keyword: searchParams.get('keyword') || defaultSearchForm.keyword,
        materialType: parseArrayParam(searchParams.get('materialType')),
        brand: searchParams.get('brand') || defaultSearchForm.brand,
        appearance: parseArrayParam(searchParams.get('appearance')),
        minPrice: parseNumberParam(searchParams.get('minPrice')),
        maxPrice: parseNumberParam(searchParams.get('maxPrice')),
    }), [preferredStatus, searchParams])

    const initialPagination = useMemo<Pagination>(() => ({
        current: Math.max(1, parseNumberParam(searchParams.get('page')) ?? 1),
        pageSize: Math.max(1, parseNumberParam(searchParams.get('pageSize')) ?? preferredPageSize),
        total: 0,
    }), [preferredPageSize, searchParams])

    const initialSortInfo = useMemo<SortInfo>(() => {
        const order = searchParams.get('sortOrder')
        return {
            field: searchParams.get('sortField') || '',
            order: order === 'asc' || order === 'desc' ? order : '',
        }
    }, [searchParams])

    /* ── Core state ── */
    const [loading, setLoading] = useState(false)
    const [spoolList, setSpoolList] = useState<API.SpoolVO[]>([])
    const [pagination, setPagination] = useState<Pagination>(initialPagination)
    const [sortInfo, setSortInfo] = useState<SortInfo>(initialSortInfo)
    const pageSizeChangedRef = useRef(false)
    const listRequestIdRef = useRef(0)
    const [searchForm, setSearchForm] = useState<SearchForm>(initialSearchForm)
    const syncedPreferredStatusRef = useRef<string | null>(null)

    /* ── API options ── */
    const [apiOptions, setApiOptions] = useState<API.SpoolQueryOptionsVO | null>(null)

    /* ── Modal state ── */
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [cloneRecord, setCloneRecord] = useState<API.SpoolVO | null>(null)

    /* ── Calibrate modal ── */
    /* ── Remote Configs ── */
    const { ensureColorConfigLoaded } = useRemoteColorConfig()
    const { ensureSpoolConfigLoaded } = useRemoteSpoolConfig()
    const { ensureFilamentsConfigLoaded } = useRemoteFilamentsConfig()

    /* ── Derived options from API & configs ── */
    const materialTypeOptions = useMemo(() => {
        return (apiOptions?.materialTypes ?? []).map((t) => ({ label: t, value: t }))
    }, [apiOptions])

    const brandOptions = useMemo(() => {
        return (apiOptions?.brand ?? []).map((b) => ({ label: b, value: b }))
    }, [apiOptions])



    const appearanceOptions = useMemo(() => {
        return (apiOptions?.appearance ?? []).map((id) => ({
            label: String(id),
            value: id,
        }))
    }, [apiOptions])

    const syncSearchParams = useCallback(
        (search: SearchForm, pag: Pagination, sort: SortInfo) => {
            const params = new URLSearchParams()

            if (search.status && search.status !== preferredStatus) params.set('status', search.status)
            if (search.keyword.trim()) params.set('keyword', search.keyword.trim())
            if (search.materialType.length > 0) params.set('materialType', search.materialType.join(','))
            if (search.brand.trim()) params.set('brand', search.brand.trim())
            if (search.appearance.length > 0) params.set('appearance', search.appearance.join(','))
            if (search.minPrice != null) params.set('minPrice', String(search.minPrice))
            if (search.maxPrice != null) params.set('maxPrice', String(search.maxPrice))
            if (pag.current > 1) params.set('page', String(pag.current))
            if (pag.pageSize !== preferredPageSize) params.set('pageSize', String(pag.pageSize))
            if (sort.field) params.set('sortField', sort.field)
            if (sort.order) params.set('sortOrder', sort.order)

            setSearchParams(params, { replace: true })
        },
        [preferredPageSize, preferredStatus, setSearchParams],
    )

    /* ── Query builder ── */
    const buildQueryParams = useCallback(
        (pag: Pagination, sort: SortInfo, search: SearchForm): API.listSpoolsParams | null => {
            const params: API.listSpoolsParams = {
                current: pag.current,
                size: pag.pageSize,
            }
            if (search.status && search.status !== '-1') params.status = Number(search.status)
            if (search.keyword?.trim()) params.keyword = search.keyword.trim()
            if (search.materialType.length > 0) params.materialType = search.materialType
            if (search.brand?.trim()) params.brand = search.brand.trim()
            if (search.appearance.length > 0) {
                const mapped = search.appearance
                    .map((a) => {
                        const num = Number(a)
                        if (!isNaN(num)) return num
                        const found = appearanceOptions.find((o) => o.label === a)
                        return found ? Number(found.value) : NaN
                    })
                    .filter((n) => !isNaN(n))
                if (mapped.length > 0) params.appearance = mapped
            }
            if (search.minPrice != null && search.minPrice >= 0) params.minPrice = search.minPrice
            if (search.maxPrice != null && search.maxPrice >= 0) params.maxPrice = search.maxPrice

            if (params.minPrice != null && params.maxPrice != null && params.minPrice > params.maxPrice) {
                toast.warning('最低价格不能大于最高价格')
                return null
            }

            if (sort.field && sort.order) {
                params.sortField = sort.field
                params.sortOrder = sort.order
            }
            return params
        },
        [appearanceOptions],
    )

    /* ── Fetch list ── */
    const fetchSpoolList = useCallback(
        async (
            pag: Pagination = pagination,
            sort: SortInfo = sortInfo,
            search: SearchForm = searchForm,
        ) => {
            const requestId = ++listRequestIdRef.current
            setLoading(true)
            try {
                const params = buildQueryParams(pag, sort, search)
                if (!params) {
                    return
                }
                const res = await listSpools(params)
                if (requestId === listRequestIdRef.current && res.data?.data) {
                    setSpoolList(res.data.data.records ?? [])
                    setPagination((prev) => ({ ...prev, total: res.data.data!.total ?? 0 }))
                }
            } catch (error) {
                if (requestId === listRequestIdRef.current) {
                    showRequestError(error, '获取耗材列表失败')
                }
            } finally {
                if (requestId === listRequestIdRef.current) {
                    setLoading(false)
                }
            }
        },
        [buildQueryParams, pagination, sortInfo, searchForm],
    )

    useEffect(() => {
        if (!userConfigLoaded || hasStatusQuery) {
            return
        }

        if (syncedPreferredStatusRef.current === preferredStatus) {
            return
        }
        syncedPreferredStatusRef.current = preferredStatus

        if (searchForm.status === preferredStatus) {
            return
        }

        const nextSearch = { ...searchForm, status: preferredStatus }
        const nextPagination = { ...pagination, current: 1 }
        setSearchForm(nextSearch)
        setPagination(nextPagination)
        syncSearchParams(nextSearch, nextPagination, sortInfo)
        fetchSpoolList(nextPagination, sortInfo, nextSearch)
    }, [fetchSpoolList, hasStatusQuery, pagination, preferredStatus, searchForm, sortInfo, syncSearchParams, userConfigLoaded])

    /* ── Fetch API options ── */
    const fetchApiOptions = useCallback(async () => {
        try {
            const res = await getOptions()
            if (res.data?.data) setApiOptions(res.data.data)
        } catch {
            console.error('获取选项数据失败')
        }
    }, [])

    /* ── Init ── */
    useEffect(() => {
        // Fetch data
        fetchApiOptions()
        ensureColorConfigLoaded()
        ensureSpoolConfigLoaded()
        ensureFilamentsConfigLoaded()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Fetch list on initial load - use a separate effect that runs after state is set
    const initialFetchDone = useRef(false)
    useEffect(() => {
        if (!initialFetchDone.current) {
            initialFetchDone.current = true
            fetchSpoolList(pagination, sortInfo, searchForm)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchForm])

    useEffect(() => {
        if (!userConfigLoaded || pageSizeChangedRef.current || pagination.pageSize === preferredPageSize) {
            return
        }

        const newPag = { current: 1, pageSize: preferredPageSize, total: pagination.total }
        setPagination(newPag)

        if (initialFetchDone.current) {
            fetchSpoolList(newPag, sortInfo, searchForm)
        }
    }, [fetchSpoolList, pagination.pageSize, pagination.total, preferredPageSize, searchForm, sortInfo, userConfigLoaded])

    /* ── Handlers ── */
    const handleSearch = useCallback(() => {
        const newPag = { ...pagination, current: 1 }
        setPagination(newPag)
        syncSearchParams(searchForm, newPag, sortInfo)
        fetchSpoolList(newPag, sortInfo, searchForm)
    }, [fetchSpoolList, pagination, searchForm, sortInfo, syncSearchParams])

    const handleSearchWithPatch = useCallback(
        (patch: Partial<SearchForm>) => {
            const nextSearch = { ...searchForm, ...patch }
            const newPag = { ...pagination, current: 1 }
            setSearchForm(nextSearch)
            setPagination(newPag)
            syncSearchParams(nextSearch, newPag, sortInfo)
            fetchSpoolList(newPag, sortInfo, nextSearch)
        },
        [fetchSpoolList, pagination, searchForm, sortInfo, syncSearchParams],
    )

    const handleReset = useCallback(() => {
        const newSearch = { ...defaultSearchForm, status: preferredStatus }
        pageSizeChangedRef.current = false
        const newPag = { current: 1, pageSize: preferredPageSize, total: 0 }
        const newSort: SortInfo = { field: '', order: '' }
        setSearchForm(newSearch)
        setPagination(newPag)
        setSortInfo(newSort)
        setSearchParams({}, { replace: true })
        fetchSpoolList(newPag, newSort, newSearch)
    }, [fetchSpoolList, preferredPageSize, preferredStatus, setSearchParams])

    const handleStatusChange = useCallback(
        (value: string) => {
            const newSearch = { ...searchForm, status: value }
            const newPag = { ...pagination, current: 1 }
            setSearchForm(newSearch)
            setPagination(newPag)
            syncSearchParams(newSearch, newPag, sortInfo)
            fetchSpoolList(newPag, sortInfo, newSearch)
        },
        [fetchSpoolList, pagination, searchForm, sortInfo, syncSearchParams],
    )

    const handlePageChange = useCallback(
        (page: number, pageSize: number) => {
            pageSizeChangedRef.current = pageSizeChangedRef.current || pageSize !== pagination.pageSize
            const newPag = { ...pagination, current: page, pageSize }
            setPagination(newPag)
            syncSearchParams(searchForm, newPag, sortInfo)
            fetchSpoolList(newPag, sortInfo, searchForm)
        },
        [fetchSpoolList, pagination, searchForm, sortInfo, syncSearchParams],
    )

    const handleSortChange = useCallback(
        (field: string, order: 'asc' | 'desc' | '') => {
            const newSort: SortInfo = { field: order ? field : '', order }
            setSortInfo(newSort)
            syncSearchParams(searchForm, pagination, newSort)
            fetchSpoolList(pagination, newSort, searchForm)
        },
        [fetchSpoolList, pagination, searchForm, syncSearchParams],
    )

    /* ── CRUD ── */
    const handleDelete = useCallback(
        async (id: number) => {
            try {
                await deleteSpool({ id })
                toast.success('删除耗材成功')
                fetchSpoolList(pagination, sortInfo, searchForm)
            } catch (error) {
                showRequestError(error, '删除耗材失败')
            }
        },
        [fetchSpoolList, pagination, sortInfo, searchForm],
    )

    const showAddModal = useCallback(() => {
        setCloneRecord(null)
        setAddModalOpen(true)
    }, [])

    const handleClone = useCallback((record: API.SpoolVO) => {
        setCloneRecord(record)
        setAddModalOpen(true)
    }, [])

    const handleAddSuccess = useCallback(() => {
        fetchSpoolList(pagination, sortInfo, searchForm)
    }, [fetchSpoolList, pagination, sortInfo, searchForm])

    const {
        calibrateOpen,
        setCalibrateOpen,
        calibrateLoading,
        calibrateReadingWeight,
        calibrateScaleWeight,
        currentSpool,
        calibrateForm,
        openCalibrateModal,
        handleCalibrateTotalWeightChange,
        handleCalibrateSubmit,
        handleUseScaleWeightSubmit,
    } = useSpoolCalibration({
        onSuccess: () => fetchSpoolList(pagination, sortInfo, searchForm),
    })



    /* ── Navigation ── */
    const showDetail = useCallback(
        (record: API.SpoolVO) => {
            navigate(`/spool/detail/${record.id}`, {
                state: {
                    from: `${location.pathname}${location.search}`,
                },
            })
        },
        [location.pathname, location.search, navigate],
    )

    const showSummary = useCallback(() => {
        navigate('/spool/summary')
    }, [navigate])



    /* ── Color helpers ── */
    const getRemainingColor = useCallback((percentage: number) => {
        if (percentage > 70) return '#52c41a'
        if (percentage > 30) return '#faad14'
        return '#f5222d'
    }, [])

    const isLightHexColor = useCallback((hex: string) => {
        if (!/^#[0-9A-F]{6}$/i.test(hex)) return false
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return (r * 299 + g * 587 + b * 114) / 1000 > 128
    }, [])

    return {
        // State
        loading,
        spoolList,
        pagination,
        sortInfo,
        searchForm,
        setSearchForm,
        apiOptions,

        // Options
        materialTypeOptions,
        brandOptions,
        appearanceOptions,
        statusOptions,

        // Search handlers
        handleSearch,
        handleSearchWithPatch,
        handleReset,
        handleStatusChange,
        handlePageChange,
        handleSortChange,

        // CRUD
        handleDelete,
        showAddModal,
        handleClone,
        showDetail,
        showSummary,

        // Add/Clone modal
        addModalOpen,
        setAddModalOpen,
        cloneRecord,
        handleAddSuccess,

        // Calibrate modal
        calibrateOpen,
        setCalibrateOpen,
        calibrateLoading,
        calibrateReadingWeight,
        calibrateScaleWeight,
        currentSpool,
        calibrateForm,
        showCalibrateModal: openCalibrateModal,
        handleCalibrateTotalWeightChange,
        handleCalibrateSubmit,
        handleUseScaleWeightSubmit,

        // Helpers
        getRemainingColor,
        isLightHexColor,
    }
}
