import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    Search,
    RotateCcw,
    Plus,
    Calculator,
    ChevronLeft,
    ChevronRight,
    Loader2,
    TrendingUp,
    DollarSign,
    Wallet,
    SlidersHorizontal,
} from 'lucide-react'
import { Button, iconTextUniformWidthClass } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetDescription,
} from '@/components/ui/sheet'
import { listOrders, addOrder, getOrderSummary } from '@/api/orderInfo'
import { FormattedTime } from '@/components/ui/formatted-time'
import OrderQuoteDialog from './OrderQuoteDialog'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { getTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePageSize'
import { showRequestError } from '@/request'
import { DEFAULT_ORDER_STATUS, normalizeOrderStatus } from '@/utils/userPreferences'
import { cn } from '@/lib/utils'

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

const statusOptions = [
    { label: '所有', value: 'all' },
    { label: '进行中', value: '1' },
    { label: '库存中', value: '4' },
    { label: '已完成', value: '2' },
    { label: '已取消', value: '3' },
]

const getStatusText = (status?: number) => {
    switch (status) { case 1: return '进行中'; case 4: return '库存中'; case 2: return '已完成'; case 3: return '已取消'; default: return '未知' }
}
const statusColorMap: Record<string, string> = {
    '进行中': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    '库存中': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    '已完成': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    '已取消': 'bg-muted text-muted-foreground',
}

const defaultSearchForm = { orderName: '', customerName: '', status: DEFAULT_ORDER_STATUS }

const parseNumberParam = (value: string | null, fallback: number) => {
    if (!value) return fallback
    const parsed = Number(value)
    return Number.isNaN(parsed) ? fallback : parsed
}

export default function OrderManageView() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const preferredStatus = useUserConfigStore((s) => normalizeOrderStatus(s.userConfig.orderDefaultStatus))
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const hasStatusQuery = searchParams.has('status')

    const initialSearchForm = useMemo(() => ({
        orderName: searchParams.get('orderName') || defaultSearchForm.orderName,
        customerName: searchParams.get('customerName') || defaultSearchForm.customerName,
        status: normalizeOrderStatus(searchParams.get('status') || preferredStatus),
    }), [preferredStatus, searchParams])

    const initialPagination = useMemo(() => ({
        current: Math.max(1, parseNumberParam(searchParams.get('page'), 1)),
        pageSize: Math.max(1, parseNumberParam(searchParams.get('pageSize'), preferredPageSize)),
        total: 0,
    }), [preferredPageSize, searchParams])

    /* ── State ── */
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState<API.OrderVO[]>([])
    const [pagination, setPagination] = useState(initialPagination)
    const [searchForm, setSearchForm] = useState(initialSearchForm)
    const [summary, setSummary] = useState<API.OrderSummaryDTO>({})
    const initialRef = useRef(false)
    const listRequestIdRef = useRef(0)
    const pageSizeChangedRef = useRef(false)
    const syncedPreferredStatusRef = useRef<string | null>(null)
    const pageSizeOptions = useMemo(() => getTablePageSizeOptions(preferredPageSize), [preferredPageSize])

    /* ── Add modal ── */
    const [addOpen, setAddOpen] = useState(false)
    const [addLoading, setAddLoading] = useState(false)
    const [addForm, setAddForm] = useState({ orderName: '', customerName: '', customerSource: '', totalIncome: undefined as number | undefined, remark: '' })
    const [quoteOpen, setQuoteOpen] = useState(false)

    const syncSearchParams = useCallback((search: typeof defaultSearchForm, pag: typeof pagination) => {
        const params = new URLSearchParams()
        if (search.orderName.trim()) params.set('orderName', search.orderName.trim())
        if (search.customerName.trim()) params.set('customerName', search.customerName.trim())
        if (search.status && search.status !== preferredStatus) params.set('status', search.status)
        if (pag.current > 1) params.set('page', String(pag.current))
        if (pag.pageSize !== preferredPageSize) params.set('pageSize', String(pag.pageSize))
        setSearchParams(params, { replace: true })
    }, [preferredPageSize, preferredStatus, setSearchParams])

    /* ── Fetchers ── */
    const fetchOrders = useCallback(
        async (pag = pagination, search = searchForm) => {
            const requestId = ++listRequestIdRef.current
            setLoading(true)
            try {
                const params: API.listOrdersParams = { current: pag.current, size: pag.pageSize }
                if (search.orderName.trim()) params.orderName = search.orderName.trim()
                if (search.customerName.trim()) params.customerName = search.customerName.trim()
                if (search.status !== 'all') params.status = Number(search.status)

                const res = await listOrders(params)
                if (requestId === listRequestIdRef.current && res.data?.data) {
                    setOrders(res.data.data.records ?? [])
                    setPagination((p) => ({ ...p, total: res.data.data!.total ?? 0 }))
                }
            } catch (error) {
                if (requestId === listRequestIdRef.current) showRequestError(error, '获取订单列表失败')
            } finally {
                if (requestId === listRequestIdRef.current) setLoading(false)
            }
        },
        [pagination, searchForm],
    )

    const fetchSummary = useCallback(async () => {
        try {
            const res = await getOrderSummary()
            if (res.data?.data) setSummary(res.data.data)
        } catch { /* silent */ }
    }, [])

    useEffect(() => {
        if (!initialRef.current) {
            initialRef.current = true
            fetchOrders()
            fetchSummary()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!userConfigLoaded || pageSizeChangedRef.current || pagination.pageSize === preferredPageSize) {
            return
        }

        const p = { current: 1, pageSize: preferredPageSize, total: pagination.total }
        setPagination(p)

        if (initialRef.current) {
            fetchOrders(p, searchForm)
        }
    }, [fetchOrders, pagination.pageSize, pagination.total, preferredPageSize, searchForm, userConfigLoaded])

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

        const s = { ...searchForm, status: preferredStatus }
        const p = { ...pagination, current: 1 }
        setSearchForm(s)
        setPagination(p)
        syncSearchParams(s, p)
        fetchOrders(p, s)
        fetchSummary()
    }, [fetchOrders, fetchSummary, hasStatusQuery, pagination, preferredStatus, searchForm, syncSearchParams, userConfigLoaded])

    /* ── Handlers ── */
    const handleSearch = useCallback(() => {
        const p = { ...pagination, current: 1 }; setPagination(p); syncSearchParams(searchForm, p); fetchOrders(p, searchForm); fetchSummary()
    }, [fetchOrders, fetchSummary, pagination, searchForm, syncSearchParams])

    const handleReset = useCallback(() => {
        pageSizeChangedRef.current = false
        const s = { ...defaultSearchForm, status: preferredStatus }; const p = { current: 1, pageSize: preferredPageSize, total: 0 }
        setSearchForm(s); setPagination(p); setSearchParams({}, { replace: true }); fetchOrders(p, s); fetchSummary()
    }, [fetchOrders, fetchSummary, preferredPageSize, preferredStatus, setSearchParams])

    const handleStatusChange = useCallback((value: string) => {
        const s = { ...searchForm, status: value }; const p = { ...pagination, current: 1 }
        setSearchForm(s); setPagination(p); syncSearchParams(s, p); fetchOrders(p, s); fetchSummary()
    }, [fetchOrders, fetchSummary, searchForm, pagination, syncSearchParams])

    const handlePageChange = useCallback((page: number) => {
        const p = { ...pagination, current: page }; setPagination(p); syncSearchParams(searchForm, p); fetchOrders(p, searchForm)
    }, [fetchOrders, pagination, searchForm, syncSearchParams])

    const handlePageSizeChange = useCallback((size: number) => {
        pageSizeChangedRef.current = true
        const p = { ...pagination, current: 1, pageSize: size }
        setPagination(p)
        syncSearchParams(searchForm, p)
        fetchOrders(p, searchForm)
    }, [fetchOrders, pagination, searchForm, syncSearchParams])

    const totalPages = useMemo(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)), [pagination])

    /* ── Add order ── */
    const handleAddSubmit = useCallback(async () => {
        if (!addForm.orderName || !addForm.customerName) { toast.warning('请填写必填字段'); return }
        setAddLoading(true)
        try {
            await addOrder({
                orderName: addForm.orderName,
                customerName: addForm.customerName,
                customerSource: addForm.customerSource || undefined,
                totalIncome: addForm.totalIncome ?? 0,
                remark: addForm.remark || undefined,
            } as API.OrderCreateDTO)
            toast.success('创建订单成功')
            setAddOpen(false)
            setAddForm({ orderName: '', customerName: '', customerSource: '', totalIncome: undefined, remark: '' })
            const p = { ...pagination, current: 1 }; setPagination(p); fetchOrders(p, searchForm); fetchSummary()
        } catch (error) { showRequestError(error, '创建订单失败') }
        finally { setAddLoading(false) }
    }, [addForm, fetchOrders, fetchSummary, pagination, searchForm])

    const goToDetail = useCallback((order: API.OrderVO) => {
        if (order.id) {
            navigate(`/order/detail/${order.id}`, {
                state: {
                    from: `${location.pathname}${location.search}`,
                },
            })
        }
    }, [location.pathname, location.search, navigate])

    const handleQuoteCreate = useCallback(async (data: {
        orderName: string
        customerName: string
        totalIncome?: number
        laborCost?: number
        finalQuote?: API.FinalQuote
        totalPrice: number
    }) => {
        try {
            await addOrder({
                orderName: data.orderName,
                customerName: data.customerName,
                totalIncome: data.totalIncome ?? 0,
                laborCost: data.laborCost,
                logisticsCost: data.finalQuote?.logistics,
                designCost: data.finalQuote?.design,
                otherCost: data.finalQuote?.other,
                remark: `预报价生成。总价: ${data.totalPrice.toFixed(2)}`,
            } as API.OrderCreateDTO)
            toast.success('创建订单成功')
            const p = { ...pagination, current: 1 }
            setPagination(p)
            fetchOrders(p, searchForm)
            fetchSummary()
            return true
        } catch (error) {
            showRequestError(error, '创建订单失败')
            return false
        }
    }, [fetchOrders, fetchSummary, pagination, searchForm])

    const updateAdd = (patch: Partial<typeof addForm>) => setAddForm((p) => ({ ...p, ...patch }))

    const isMobile = useDeviceStore((s) => s.isMobile)
    const [filterOpen, setFilterOpen] = useState(false)

    /* ── Mobile layout ── */
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Header + actions */}
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">订单管理</h1>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setAddOpen(true)} className="cursor-pointer">
                            <Plus size={14} className="mr-1" /> 添加
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setQuoteOpen(true)} className="cursor-pointer">
                            <Calculator size={14} className="mr-1" /> 报价
                        </Button>
                    </div>
                </div>

                {/* Status tabs + filter */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-0.5">
                        {statusOptions.map((opt) => (
                            <Button
                                type="button"
                                key={opt.value}
                                variant="ghost"
                                size="sm"
                                className={`h-7 cursor-pointer rounded-md px-2.5 text-xs transition-colors ${searchForm.status === opt.value
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => handleStatusChange(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 cursor-pointer px-2.5" onClick={() => setFilterOpen(true)}>
                        <SlidersHorizontal size={14} />
                    </Button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                    <div className={cn(cardBase, 'px-3 py-2')}>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <DollarSign size={11} className="text-muted-foreground" />
                            收入
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                            ¥{summary.totalIncome?.toFixed(0) ?? '0'}
                        </div>
                    </div>
                    <div className={cn(cardBase, 'px-3 py-2')}>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Wallet size={11} className="text-muted-foreground" />
                            成本
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                            ¥{summary.totalCost?.toFixed(0) ?? '0'}
                        </div>
                    </div>
                    <div className={cn(cardBase, 'px-3 py-2')}>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <TrendingUp size={11} className="text-muted-foreground" />
                            利润
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                            ¥{summary.totalProfit?.toFixed(0) ?? '0'}
                        </div>
                    </div>
                </div>

                {/* Filter Sheet */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetContent side="top" className="max-h-[80vh] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>筛选</SheetTitle>
                            <SheetDescription>输入订单名称或客户名称进行搜索</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 px-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">订单名称</Label>
                                <Input value={searchForm.orderName} onChange={(e) => setSearchForm((s) => ({ ...s, orderName: e.target.value }))} placeholder="订单名称" className="h-9" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">客户名称</Label>
                                <Input value={searchForm.customerName} onChange={(e) => setSearchForm((s) => ({ ...s, customerName: e.target.value }))} placeholder="客户名称" className="h-9" />
                            </div>
                        </div>
                        <SheetFooter className="flex-row gap-2">
                            <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => { handleReset(); setFilterOpen(false) }}>
                                <RotateCcw size={14} className="mr-1" /> 重置
                            </Button>
                            <Button className="flex-1 cursor-pointer" onClick={() => { handleSearch(); setFilterOpen(false) }}>
                                <Search size={14} className="mr-1" /> 搜索
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Card list */}
                <div className="space-y-3">
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`${cardBase} space-y-3 p-4`}>
                                <div className="flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-14 rounded" /></div>
                                <div className="flex gap-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-16" /></div>
                            </div>
                        ))
                        : orders.length === 0 ? (
                            <div className={`${cardBase} py-16 text-center text-muted-foreground`}>暂无订单</div>
                        ) : (
                            orders.map((order) => {
                                const statusText = getStatusText(order.status)
                                return (
                                    <div
                                        key={order.id}
                                        className={`${cardBase} cursor-pointer p-4 transition-colors active:bg-muted/40`}
                                        onClick={() => goToDetail(order)}
                                    >
                                        {/* Row 1: Name + Status */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-medium text-foreground">{order.orderName || '-'}</span>
                                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${statusColorMap[statusText] ?? 'bg-muted text-muted-foreground'}`}>
                                                {statusText}
                                            </span>
                                        </div>
                                        {/* Row 2: Customer */}
                                        <div className="mt-1 text-xs text-muted-foreground">{order.customerName || '-'}</div>
                                        {/* Row 3: Income + Profit */}
                                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>收入 <span className="text-foreground tabular-nums">¥{order.totalIncome ?? 0}</span></span>
                                            <span>利润 <span className="font-medium text-foreground tabular-nums">¥{order.profit ?? 0}</span></span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-muted-foreground">共 {pagination.total} 条</span>
                        <div className="flex items-center gap-2">
                            <Select value={String(pagination.pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                                <SelectTrigger className="h-7 w-[96px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} / 页
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" disabled={pagination.current <= 1}
                                onClick={() => handlePageChange(pagination.current - 1)}><ChevronLeft size={14} /></Button>
                            <span className="text-xs text-foreground">{pagination.current} / {totalPages}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1)}><ChevronRight size={14} /></Button>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>添加订单</DialogTitle>
                            <DialogDescription className="sr-only">创建新订单</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>订单名称 <span className="text-destructive">*</span></Label>
                                <Input value={addForm.orderName} onChange={(e) => updateAdd({ orderName: e.target.value })} placeholder="请输入订单名称" />
                            </div>
                            <div className="space-y-2">
                                <Label>客户名称 <span className="text-destructive">*</span></Label>
                                <Input value={addForm.customerName} onChange={(e) => updateAdd({ customerName: e.target.value })} placeholder="请输入客户名称" />
                            </div>
                            <div className="space-y-2">
                                <Label>总收入</Label>
                                <Input type="number" min={0} step={0.01} value={addForm.totalIncome ?? ''} onChange={(e) => updateAdd({ totalIncome: e.target.value ? Number(e.target.value) : undefined })} placeholder="请输入总收入" />
                            </div>
                            <div className="space-y-2">
                                <Label>备注</Label>
                                <Textarea className="min-h-[60px]" value={addForm.remark} onChange={(e) => updateAdd({ remark: e.target.value })} placeholder="可选" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddOpen(false)} className="cursor-pointer">取消</Button>
                            <Button onClick={handleAddSubmit} disabled={addLoading} className="cursor-pointer">
                                {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <OrderQuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} onCreate={handleQuoteCreate} />
            </div>
        )
    }

    /* ── Desktop layout ── */
    return (
        <div className="space-y-6 p-6">
            {/* ── Header ── */}
            <div className="border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">订单管理</h1>
            </div>

            {/* ── Action bar ── */}
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setAddOpen(true)} className={cn('cursor-pointer', iconTextUniformWidthClass)}>
                    <Plus size={16} className="mr-1" /> 添加订单
                </Button>
                <Button variant="outline" onClick={() => setQuoteOpen(true)} className="cursor-pointer">
                    <Calculator size={16} className="mr-1" /> 预报价
                </Button>
            </div>

            {/* ── Search / filter bar ── */}
            <div className={`${cardBase} space-y-4 p-5`}>
                {/* Status segmented */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">状态</span>
                    <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                        {statusOptions.map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-8 cursor-pointer rounded-md px-3 text-sm transition-colors ${searchForm.status === opt.value
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted/60'
                                    }`}
                                onClick={() => handleStatusChange(opt.value)}>
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Search inputs */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-[200px]">
                        <Label className="mb-1 block text-xs text-muted-foreground">订单名称</Label>
                        <Input value={searchForm.orderName} onChange={(e) => setSearchForm((s) => ({ ...s, orderName: e.target.value }))}
                            placeholder="订单名称" className="h-9" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                    </div>
                    <div className="w-[200px]">
                        <Label className="mb-1 block text-xs text-muted-foreground">客户名称</Label>
                        <Input value={searchForm.customerName} onChange={(e) => setSearchForm((s) => ({ ...s, customerName: e.target.value }))}
                            placeholder="客户名称" className="h-9" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSearch} className="h-9 cursor-pointer"><Search size={14} /> 搜索</Button>
                        <Button size="sm" variant="outline" onClick={handleReset} className="h-9 cursor-pointer"><RotateCcw size={14} /> 重置</Button>
                    </div>
                </div>

                {/* Summary */}
                <div className="flex flex-wrap gap-4 border-t border-border/40 pt-3">
                    <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-xs text-muted-foreground">总收入</span>
                        <span className="font-semibold tabular-nums text-emerald-500">¥{summary.totalIncome?.toFixed(2) ?? '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-amber-500" />
                        <span className="text-xs text-muted-foreground">总成本</span>
                        <span className="font-semibold tabular-nums text-amber-500">¥{summary.totalCost?.toFixed(2) ?? '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-blue-500" />
                        <span className="text-xs text-muted-foreground">总利润</span>
                        <span className="font-semibold tabular-nums text-blue-500">¥{summary.totalProfit?.toFixed(2) ?? '0.00'}</span>
                    </div>
                </div>
            </div>

            {/* ── Data table ── */}
            <div className={`${cardBase} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b hover:bg-transparent">
                                {['订单名称', '客户名称', '状态', '时间', '总收入', '利润'].map((h) => (
                                    <TableHead key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-b hover:bg-transparent">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : orders.length === 0 ? (
                                    <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-24 px-4 py-12 text-center text-sm text-muted-foreground">暂无订单</TableCell></TableRow>
                                ) : (
                                    orders.map((order) => {
                                        const statusText = getStatusText(order.status)
                                        return (
                                            <TableRow key={order.id}
                                                className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                                                onClick={() => goToDetail(order)}>
                                                <TableCell className="max-w-[220px] truncate px-4 py-3 font-medium text-foreground">{order.orderName || '-'}</TableCell>
                                                <TableCell className="max-w-[160px] truncate px-4 py-3 text-foreground">{order.customerName || '-'}</TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColorMap[statusText] ?? 'bg-muted text-muted-foreground'}`}>
                                                        {statusText}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-xs">
                                                    {(order.startTime || order.endTime) ? (
                                                        <div className="space-y-0.5">
                                                            {order.startTime && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                                    <span className="text-muted-foreground">开始</span>
                                                                    <span className="text-foreground"><FormattedTime time={order.startTime} /></span>
                                                                </div>
                                                            )}
                                                            {order.endTime && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                    <span className="text-muted-foreground">结束</span>
                                                                    <span className="text-foreground"><FormattedTime time={order.endTime} /></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 tabular-nums text-foreground">{order.totalIncome ?? '-'}</TableCell>
                                                <TableCell className="px-4 py-3 font-semibold tabular-nums text-foreground">{order.profit ?? '-'}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="flex items-center justify-between border-t px-5 py-3">
                        <span className="text-sm text-muted-foreground">共 <span className="tabular-nums text-foreground">{pagination.total}</span> 条订单</span>
                        <div className="flex items-center gap-2">
                            <Select value={String(pagination.pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                                <SelectTrigger className="h-8 w-[108px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} / 页
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer" disabled={pagination.current <= 1}
                                onClick={() => handlePageChange(pagination.current - 1)}><ChevronLeft size={14} /></Button>
                            <span className="text-sm tabular-nums text-foreground">{pagination.current} / {totalPages}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer" disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1)}><ChevronRight size={14} /></Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add order modal ── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>添加订单</DialogTitle>
                        <DialogDescription className="sr-only">创建新订单</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>订单名称 <span className="text-destructive">*</span></Label>
                            <Input value={addForm.orderName} onChange={(e) => updateAdd({ orderName: e.target.value })} placeholder="请输入订单名称" />
                        </div>
                        <div className="space-y-2">
                            <Label>客户名称 <span className="text-destructive">*</span></Label>
                            <Input value={addForm.customerName} onChange={(e) => updateAdd({ customerName: e.target.value })} placeholder="请输入客户名称" />
                        </div>
                        <div className="space-y-2">
                            <Label>客户来源</Label>
                            <Input value={addForm.customerSource} onChange={(e) => updateAdd({ customerSource: e.target.value })} placeholder="可选" />
                        </div>
                        <div className="space-y-2">
                            <Label>总收入</Label>
                            <Input type="number" min={0} step={0.01} value={addForm.totalIncome ?? ''} onChange={(e) => updateAdd({ totalIncome: e.target.value ? Number(e.target.value) : undefined })} placeholder="请输入总收入" />
                        </div>
                        <div className="space-y-2">
                            <Label>备注</Label>
                            <Textarea
                                className="min-h-[60px]"
                                value={addForm.remark}
                                onChange={(e) => updateAdd({ remark: e.target.value })}
                                placeholder="可选"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleAddSubmit} disabled={addLoading} className="cursor-pointer">
                            {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <OrderQuoteDialog
                open={quoteOpen}
                onOpenChange={setQuoteOpen}
                onCreate={handleQuoteCreate}
            />
        </div>
    )
}
