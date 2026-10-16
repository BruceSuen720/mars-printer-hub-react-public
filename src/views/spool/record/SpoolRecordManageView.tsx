import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
    Search,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Trash2,
    Link2,
    History,
    ExternalLink,
    SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    DialogTrigger,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { listSpoolUsedRecordPage, deleteSpoolUsedRecord, transferSpoolUsedRecord } from '@/api/record'
import { getAllProcessingOrders, bindRecords } from '@/api/orderInfo'
import { getAllAvailableSpools } from '@/api/spool'
import { listPrinters } from '@/api/device'
import { FormattedTime } from '@/components/ui/formatted-time'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import PrintHistoryModal from '@/components/spool/PrintHistoryModal'
import { isDepreciationEnabled } from '@/config/featureFlags'
import { showRequestError } from '@/request'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { getTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePageSize'
import { normalizeSpoolRecordStatus } from '@/utils/userPreferences'

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

const statusOptions = [
    { label: '所有', value: 'all' },
    { label: '成功', value: '2' },
    { label: '已取消', value: '3' },
    { label: '正在打印', value: '4' },
]

const statusColorMap: Record<string, string> = {
    '成功': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    '已取消': 'bg-muted text-muted-foreground',
    '正在打印': 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    '打印中': 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
}
export default function SpoolRecordManageView() {
    const navigate = useNavigate()
    const { loginUser } = useLoginUserStore()
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const preferredStatus = useUserConfigStore((s) => normalizeSpoolRecordStatus(s.userConfig.spoolRecordDefaultStatus))
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const isIntranet = loginUser?.isIntranet === true
    const isVip = loginUser?.isVip === true

    /* ── State ── */
    const [loading, setLoading] = useState(false)
    const [records, setRecords] = useState<API.SpoolUsedRecordVO[]>([])
    const [pagination, setPagination] = useState({ current: 1, pageSize: preferredPageSize, total: 0 })
    const [searchForm, setSearchForm] = useState({ title: '', status: preferredStatus, deviceId: 'all' })
    const [devices, setDevices] = useState<API.DeviceSimpleVO[]>([])
    const initialFetchDone = useRef(false)
    const listRequestIdRef = useRef(0)
    const pageSizeChangedRef = useRef(false)
    const syncedPreferredStatusRef = useRef<string | null>(null)
    const pageSizeOptions = useMemo(() => getTablePageSizeOptions(preferredPageSize), [preferredPageSize])

    /* ── Bind order modal ── */
    const [bindOpen, setBindOpen] = useState(false)
    const [bindLoading, setBindLoading] = useState(false)
    const [bindRecord, setBindRecord] = useState<API.SpoolUsedRecordVO | null>(null)
    const [processingOrders, setProcessingOrders] = useState<API.OrderVO[]>([])
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()

    /* ── Transfer modal ── */
    const [transferOpen, setTransferOpen] = useState(false)
    const [transferLoading, setTransferLoading] = useState(false)
    const [transferRecord, setTransferRecord] = useState<API.SpoolUsedRecordVO | null>(null)
    const [availableSpools, setAvailableSpools] = useState<API.SpoolVO[]>([])
    const [selectedTransferSpoolId, setSelectedTransferSpoolId] = useState<number | undefined>()

    /* ── Record detail modal ── */
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailRecord, setDetailRecord] = useState<API.SpoolUsedRecordVO | null>(null)

    /* ── Print history modal ── */
    const [historyOpen, setHistoryOpen] = useState(false)

    /* ── Fetch ── */
    const fetchRecords = useCallback(
        async (pag = pagination, search = searchForm) => {
            const requestId = ++listRequestIdRef.current
            setLoading(true)
            try {
                const params: API.listSpoolUsedRecordPageParams = { current: pag.current, size: pag.pageSize }
                if (search.title.trim()) params.title = search.title.trim()
                if (search.status !== 'all') params.status = Number(search.status)
                if (search.deviceId !== 'all') params.deviceId = search.deviceId

                const res = await listSpoolUsedRecordPage(params)
                if (requestId === listRequestIdRef.current && res.data?.data) {
                    setRecords(res.data.data.records ?? [])
                    setPagination((p) => ({ ...p, total: res.data.data!.total ?? 0 }))
                }
            } catch (error) {
                if (requestId === listRequestIdRef.current) {
                    showRequestError(error, '获取耗材使用记录失败')
                }
            } finally {
                if (requestId === listRequestIdRef.current) {
                    setLoading(false)
                }
            }
        },
        [pagination, searchForm],
    )

    useEffect(() => {
        if (!initialFetchDone.current) {
            initialFetchDone.current = true
            fetchRecords()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        listPrinters()
            .then((res) => setDevices(res.data?.data ?? []))
            .catch(() => setDevices([]))
    }, [])

    useEffect(() => {
        if (!userConfigLoaded || pageSizeChangedRef.current || pagination.pageSize === preferredPageSize) {
            return
        }

        const p = { current: 1, pageSize: preferredPageSize, total: pagination.total }
        setPagination(p)

        if (initialFetchDone.current) {
            fetchRecords(p, searchForm)
        }
    }, [fetchRecords, pagination.pageSize, pagination.total, preferredPageSize, searchForm, userConfigLoaded])

    useEffect(() => {
        if (!userConfigLoaded) {
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
        if (initialFetchDone.current) {
            fetchRecords(p, s)
        }
    }, [fetchRecords, pagination, preferredStatus, searchForm, userConfigLoaded])

    /* ── Handlers ── */
    const handleSearch = useCallback(() => {
        const p = { ...pagination, current: 1 }
        setPagination(p)
        fetchRecords(p, searchForm)
    }, [fetchRecords, pagination, searchForm])

    const handleReset = useCallback(() => {
        const s = { title: '', status: preferredStatus, deviceId: 'all' }
        pageSizeChangedRef.current = false
        const p = { current: 1, pageSize: preferredPageSize, total: 0 }
        setSearchForm(s)
        setPagination(p)
        fetchRecords(p, s)
    }, [fetchRecords, preferredPageSize, preferredStatus])

    const handleStatusChange = useCallback(
        (value: string) => {
            const s = { ...searchForm, status: value }
            const p = { ...pagination, current: 1 }
            setSearchForm(s)
            setPagination(p)
            fetchRecords(p, s)
        },
        [fetchRecords, searchForm, pagination],
    )

    const handlePageChange = useCallback(
        (page: number) => {
            const p = { ...pagination, current: page }
            setPagination(p)
            fetchRecords(p, searchForm)
        },
        [fetchRecords, pagination, searchForm],
    )

    const handlePageSizeChange = useCallback(
        (size: number) => {
            pageSizeChangedRef.current = true
            const p = { ...pagination, current: 1, pageSize: size }
            setPagination(p)
            fetchRecords(p, searchForm)
        },
        [fetchRecords, pagination, searchForm],
    )

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
        [pagination.total, pagination.pageSize],
    )
    const formatMoney = useCallback((value?: number) => (value == null ? '-' : `¥${Number(value).toFixed(2)}`), [])

    /* ── Delete ── */
    const handleDelete = useCallback(
        async (record: API.SpoolUsedRecordVO) => {
            if (!record.id) return
            try {
                await deleteSpoolUsedRecord({ id: record.id })
                toast.success('删除成功')
                // If last record on page, go to previous page
                if (records.length === 1 && pagination.current > 1) {
                    const p = { ...pagination, current: pagination.current - 1 }
                    setPagination(p)
                    fetchRecords(p, searchForm)
                } else {
                    fetchRecords()
                }
            } catch (error) {
                showRequestError(error, '删除记录失败')
            }
        },
        [records.length, pagination, searchForm, fetchRecords],
    )

    /* ── Navigate to spool ── */
    const goToSpool = useCallback(
        (record: API.SpoolUsedRecordVO) => {
            if (!record.spoolId) {
                // No spool bound → open transfer modal
                setTransferRecord(record)
                setSelectedTransferSpoolId(undefined)
                setTransferOpen(true)
                getAllAvailableSpools().then((res) => setAvailableSpools(res.data?.data ?? [])).catch(() => { })
                return
            }
            navigate(`/spool/detail/${record.spoolId}`)
        },
        [navigate],
    )

    /* ── Record detail ── */
    const showDetail = useCallback((record: API.SpoolUsedRecordVO) => {
        setDetailRecord(record)
        setDetailOpen(true)
    }, [])

    /* ── Bind order ── */
    const openBind = useCallback(async (record: API.SpoolUsedRecordVO) => {
        setBindRecord(record)
        setSelectedOrderId(undefined)
        try {
            const res = await getAllProcessingOrders()
            if (Array.isArray(res.data)) {
                setProcessingOrders(res.data)
            } else if (res.data?.data && Array.isArray(res.data.data)) {
                setProcessingOrders(res.data.data)
            }
        } catch (error) {
            showRequestError(error, '获取订单列表失败')
        }
        setBindOpen(true)
    }, [])

    const handleBind = useCallback(async () => {
        if (!bindRecord?.id || !selectedOrderId) { toast.warning('请选择订单'); return }
        setBindLoading(true)
        try {
            await bindRecords({ orderId: selectedOrderId, recordIds: [bindRecord.id] })
            toast.success('绑定订单成功')
            setBindOpen(false)
            fetchRecords()
        } catch (error) {
            showRequestError(error, '绑定订单失败')
        } finally {
            setBindLoading(false)
        }
    }, [bindRecord, selectedOrderId, fetchRecords])

    /* ── Transfer ── */
    const handleTransfer = useCallback(async () => {
        if (!selectedTransferSpoolId || !transferRecord?.id) { toast.warning('请选择耗材'); return }
        setTransferLoading(true)
        try {
            await transferSpoolUsedRecord({ id: transferRecord.id, newSpoolId: selectedTransferSpoolId })
            toast.success('绑定耗材成功')
            setTransferOpen(false)
            fetchRecords()
        } catch (error) {
            showRequestError(error, '绑定耗材失败')
        } finally {
            setTransferLoading(false)
        }
    }, [selectedTransferSpoolId, transferRecord, fetchRecords])

    const isMobile = useDeviceStore((s) => s.isMobile)
    const [filterOpen, setFilterOpen] = useState(false)

    /* ── Mobile layout ── */
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-foreground">使用记录</h1>
                    {(isIntranet || isVip) && (
                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setHistoryOpen(true)}>
                            <History size={14} className="mr-1" />
                            打印历史
                        </Button>
                    )}
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

                {/* Filter Sheet */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetContent side="top" className="max-h-[80vh] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>搜索</SheetTitle>
                            <SheetDescription>按设备或任务标题筛选使用记录</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 px-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">使用设备</Label>
                                <Select
                                    value={searchForm.deviceId}
                                    onValueChange={(value) => setSearchForm((s) => ({ ...s, deviceId: value }))}
                                >
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="全部设备" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">全部设备</SelectItem>
                                        {devices.map((device) => device.deviceId && (
                                            <SelectItem key={device.deviceId} value={device.deviceId}>
                                                {device.name || device.deviceId}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">任务标题</Label>
                                <Input
                                    value={searchForm.title}
                                    onChange={(e) => setSearchForm((s) => ({ ...s, title: e.target.value }))}
                                    placeholder="请输入任务标题"
                                    className="h-9"
                                />
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
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-5 w-14 rounded" />
                                </div>
                                <div className="flex gap-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-16" /></div>
                            </div>
                        ))
                        : records.length === 0 ? (
                            <div className={`${cardBase} py-16 text-center text-muted-foreground`}>暂无使用记录</div>
                        ) : (
                            records.map((record) => (
                                <div
                                    key={record.id}
                                    className={`${cardBase} cursor-pointer p-4 transition-colors active:bg-muted/40`}
                                    onClick={() => showDetail(record)}
                                >
                                    {/* Row 1: Title + Status */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-medium text-foreground">{record.title || '未知任务'}</span>
                                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${statusColorMap[record.statusText ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                                            {record.statusText || '未知'}
                                        </span>
                                    </div>

                                    {/* Row 2: Weights */}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>设备 <span className="text-foreground">{record.deviceName || '-'}</span></span>
                                        <span>任务 <span className="text-foreground tabular-nums">{record.taskWeight != null ? `${record.taskWeight}g` : '-'}</span></span>
                                        <span>实际 <span className="font-medium text-foreground tabular-nums">{record.actualWeight != null ? `${record.actualWeight}g` : '-'}</span></span>
                                    </div>

                                    {/* Row 3: Bindings */}
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${record.orderId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                            订单{record.orderId ? '已绑' : '未绑'}
                                        </span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${record.spoolId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                            耗材{record.spoolId ? '已绑' : '未绑'}
                                        </span>
                                    </div>

                                    {/* Row 4: Actions */}
                                    <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-primary" onClick={() => goToSpool(record)}>
                                            <ExternalLink size={12} className="mr-1" /> 耗材
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-primary" onClick={() => openBind(record)}>
                                            <Link2 size={12} className="mr-1" /> {record.orderId ? '订单' : '绑定'}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-destructive hover:text-destructive">
                                                    <Trash2 size={12} className="mr-1" /> 删除
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>确定要删除这条记录吗？</AlertDialogTitle>
                                                    <AlertDialogDescription>删除该记录将会回滚耗材使用克重。</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(record)} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        确定删除
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))
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
                                onClick={() => handlePageChange(pagination.current - 1)}>
                                <ChevronLeft size={14} />
                            </Button>
                            <span className="text-xs text-foreground">{pagination.current} / {totalPages}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1)}>
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Modals (same as desktop) */}
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>记录详情</DialogTitle>
                            <DialogDescription className="sr-only">查看记录详情</DialogDescription>
                        </DialogHeader>
                        {detailRecord && (
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><span className="text-muted-foreground">任务ID：</span>{detailRecord.taskId ?? '-'}</div>
                                    <div><span className="text-muted-foreground">任务状态：</span>{detailRecord.statusText ?? '-'}</div>
                                </div>
                                <div><span className="text-muted-foreground">使用设备：</span>{detailRecord.deviceName || '-'}</div>
                                <div>
                                    <span className="text-muted-foreground">任务标题：</span>
                                    <span className="font-medium">{detailRecord.title || '-'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><span className="text-muted-foreground">任务重量：</span>{detailRecord.taskWeight ?? '-'}g</div>
                                    <div><span className="text-muted-foreground">实际重量：</span><span className="font-semibold">{detailRecord.actualWeight ?? '-'}g</span></div>
                                </div>
                                {isDepreciationEnabled && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <span className="text-muted-foreground">总成本：</span>
                                            <span className="font-semibold">{formatMoney(detailRecord.cost)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">总电费：</span>
                                            <span className="font-semibold">{formatMoney(detailRecord.electricityCost)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">总折损：</span>
                                            <span className="font-semibold">{formatMoney(detailRecord.depreciationCost)}</span>
                                        </div>
                                    </div>
                                )}
                                {detailRecord.startTime && <div><span className="text-muted-foreground">开始时间：</span><FormattedTime time={detailRecord.startTime} /></div>}
                                {detailRecord.endTime && <div><span className="text-muted-foreground">结束时间：</span><FormattedTime time={detailRecord.endTime} /></div>}
                                {detailRecord.coverUrl && (
                                    <div>
                                        <span className="text-muted-foreground">封面：</span>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <img
                                                    src={detailRecord.coverUrl}
                                                    alt="封面"
                                                    className="mt-2 h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                                />
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                                <DialogHeader className="sr-only">
                                                    <DialogTitle>View Image</DialogTitle>
                                                    <DialogDescription>Full size cover image</DialogDescription>
                                                </DialogHeader>
                                                <img
                                                    src={detailRecord.coverUrl}
                                                    alt="封面大图"
                                                    className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                                {detailRecord.spoolVO && (
                                    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                                        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">关联耗材</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>名称：{detailRecord.spoolVO.name}</div>
                                            <div>材料：{detailRecord.spoolVO.materialType}</div>
                                            <div>品牌：{detailRecord.spoolVO.brand ?? '-'}</div>
                                            {detailRecord.spoolVO.color && (
                                                <div className="flex items-center gap-1">
                                                    颜色：
                                                    <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: detailRecord.spoolVO.color }} />
                                                    <span className="font-mono">{detailRecord.spoolVO.color}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={bindOpen} onOpenChange={setBindOpen}>
                    <DialogContent className="max-w-md overflow-hidden">
                        <DialogHeader>
                            <DialogTitle>绑定订单</DialogTitle>
                            <DialogDescription className="sr-only">选择要绑定的订单</DialogDescription>
                        </DialogHeader>
                        {bindRecord && (
                            <div className="min-w-0 space-y-4">
                                <div className="space-y-1 text-sm rounded-lg border border-border bg-muted/30 p-3">
                                    <div><span className="text-muted-foreground">任务标题：</span>{bindRecord.title || '-'}</div>
                                    <div><span className="text-muted-foreground">实际重量：</span>{bindRecord.actualWeight != null ? `${bindRecord.actualWeight}g` : '-'}</div>
                                </div>
                                <div className="space-y-2">
                                    <Label>选择订单 <span className="text-destructive">*</span></Label>
                                    <Combobox
                                        options={processingOrders.map((order) => ({ label: `${order.orderName} | ${order.customerName || '-'}`, value: String(order.id) }))}
                                        value={selectedOrderId ? String(selectedOrderId) : ''}
                                        onChange={(value) => setSelectedOrderId(value ? Number(value) : undefined)}
                                        placeholder="请选择要绑定的订单"
                                        searchPlaceholder="搜索订单..."
                                        emptyText="未找到匹配订单"
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setBindOpen(false)} className="cursor-pointer">取消</Button>
                            <Button onClick={handleBind} disabled={bindLoading} className="cursor-pointer">
                                {bindLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                    <DialogContent className="max-w-md overflow-hidden">
                        <DialogHeader>
                            <DialogTitle>绑定耗材</DialogTitle>
                            <DialogDescription className="sr-only">选择要绑定的耗材</DialogDescription>
                        </DialogHeader>
                        {transferRecord && (
                            <div className="min-w-0 space-y-4">
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">当前记录: </span><span className="font-medium">{transferRecord.title || '未知任务'}</span></p>
                                    <p><span className="text-muted-foreground">转移重量: </span><span className="font-medium">{transferRecord.actualWeight}g</span></p>
                                </div>
                                <div className="space-y-2">
                                    <Label>选择耗材</Label>
                                    <Combobox
                                        options={availableSpools.map((s) => ({ label: `#${s.id} ${s.name} | ${s.materialType}`, value: String(s.id) }))}
                                        value={selectedTransferSpoolId ? String(selectedTransferSpoolId) : ''}
                                        onChange={(value) => setSelectedTransferSpoolId(value ? Number(value) : undefined)}
                                        placeholder="请选择要绑定的耗材"
                                        searchPlaceholder="搜索耗材..."
                                        emptyText="未找到匹配耗材"
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setTransferOpen(false)} className="cursor-pointer">取消</Button>
                            <Button onClick={handleTransfer} disabled={transferLoading} className="cursor-pointer">
                                {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <PrintHistoryModal open={historyOpen} onOpenChange={setHistoryOpen} onSuccess={() => fetchRecords()} />
            </div>
        )
    }

    /* ── Desktop layout ── */
    return (
        <div className="space-y-6 p-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">耗材使用记录</h1>
                {(isIntranet || isVip) && (
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setHistoryOpen(true)}>
                        <History size={14} />
                        打印历史
                    </Button>
                )}
            </div>

            {/* ── Search bar ── */}
            <div className={`${cardBase} space-y-4 p-5`}>
                {/* Status segmented */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">任务状态</span>
                    <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                        {statusOptions.map((opt) => (
                            <Button
                                type="button"
                                key={opt.value}
                                variant="ghost"
                                size="sm"
                                className={`h-8 cursor-pointer rounded-md px-3 text-sm transition-colors ${searchForm.status === opt.value
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted/60'
                                    }`}
                                onClick={() => handleStatusChange(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Device and title search */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-[200px]">
                        <Label className="mb-1 block text-xs text-muted-foreground">使用设备</Label>
                        <Select
                            value={searchForm.deviceId}
                            onValueChange={(value) => setSearchForm((s) => ({ ...s, deviceId: value }))}
                        >
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="全部设备" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部设备</SelectItem>
                                {devices.map((device) => device.deviceId && (
                                    <SelectItem key={device.deviceId} value={device.deviceId}>
                                        {device.name || device.deviceId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[200px]">
                        <Label className="mb-1 block text-xs text-muted-foreground">任务标题</Label>
                        <Input
                            value={searchForm.title}
                            onChange={(e) => setSearchForm((s) => ({ ...s, title: e.target.value }))}
                            placeholder="请输入任务标题"
                            className="h-9"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSearch} className="h-9 cursor-pointer">
                            <Search size={14} className="mr-1" /> 搜索
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleReset} className="h-9 cursor-pointer">
                            <RotateCcw size={14} className="mr-1" /> 重置
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Data table ── */}
            <div className={`${cardBase} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b hover:bg-transparent">
                                {['任务ID', '使用设备', '任务标题', '任务重量(g)', '实际重量(g)', '任务状态', '绑定订单', '绑定耗材', '时间', '操作'].map((h) => (
                                    <TableHead key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-b hover:bg-transparent">
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : records.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={10} className="px-4 py-12 text-center text-muted-foreground h-24">暂无使用记录</TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow
                                            key={record.id}
                                            className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                                            onClick={() => showDetail(record)}
                                        >
                                            {/* Task ID */}
                                            <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{record.taskId ?? '-'}</TableCell>

                                            {/* Device Name */}
                                            <TableCell className="max-w-[140px] truncate px-4 py-3 text-foreground">
                                                {record.deviceName || '-'}
                                            </TableCell>

                                            {/* Title */}
                                            <TableCell className="max-w-[200px] truncate px-4 py-3 font-medium text-foreground">
                                                {record.title || '-'}
                                            </TableCell>

                                            {/* Task Weight */}
                                            <TableCell className="px-4 py-3 tabular-nums text-foreground">{record.taskWeight ?? '-'}</TableCell>

                                            {/* Actual Weight */}
                                            <TableCell className="px-4 py-3 font-semibold tabular-nums text-foreground">{record.actualWeight ?? '-'}</TableCell>

                                            {/* Status */}
                                            <TableCell className="px-4 py-3">
                                                <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColorMap[record.statusText ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                                                    {record.statusText || '未知'}
                                                </span>
                                            </TableCell>

                                            {/* Bind order */}
                                            <TableCell className="px-4 py-3">
                                                <span className={`inline-block rounded px-2 py-0.5 text-xs ${record.orderId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {record.orderId ? '已绑定' : '未绑定'}
                                                </span>
                                            </TableCell>

                                            {/* Bind spool */}
                                            <TableCell className="px-4 py-3">
                                                <span className={`inline-block rounded px-2 py-0.5 text-xs ${record.spoolId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {record.spoolId ? '已绑定' : '未绑定'}
                                                </span>
                                            </TableCell>

                                            {/* Time */}
                                            <TableCell className="px-4 py-3 text-xs">
                                                {(record.startTime || record.endTime) ? (
                                                    <div className="space-y-0.5">
                                                        {record.startTime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                                <span className="text-muted-foreground">开始</span>
                                                                <span className="text-foreground"><FormattedTime time={record.startTime} /></span>
                                                            </div>
                                                        )}
                                                        {record.endTime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                <span className="text-muted-foreground">结束</span>
                                                                <span className="text-foreground"><FormattedTime time={record.endTime} /></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-primary" onClick={(e) => { e.stopPropagation(); goToSpool(record) }}>
                                                        <ExternalLink size={12} className="mr-1" /> 耗材
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-primary" onClick={(e) => { e.stopPropagation(); openBind(record) }}>
                                                        <Link2 size={12} className="mr-1" /> {record.orderId ? '订单' : '绑定'}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                                                <Trash2 size={12} className="mr-1" /> 删除
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>确定要删除这条记录吗？</AlertDialogTitle>
                                                                <AlertDialogDescription>删除该记录将会回滚耗材使用克重。</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(record) }} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                    确定删除
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                        </TableBody>
                    </Table>
                </div>

                {/* ── Pagination ── */}
                {pagination.total > 0 && (
                    <div className="flex items-center justify-between border-t px-5 py-3">
                        <span className="text-sm text-muted-foreground">共 {pagination.total} 条记录</span>
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
                                onClick={() => handlePageChange(pagination.current - 1)}>
                                <ChevronLeft size={14} />
                            </Button>
                            <span className="text-sm text-foreground">{pagination.current} / {totalPages}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer" disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1)}>
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ MODALS ═══ */}

            {/* ── Record detail modal ── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>记录详情</DialogTitle>
                        <DialogDescription className="sr-only">查看记录详情</DialogDescription>
                    </DialogHeader>
                    {detailRecord && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">任务ID：</span>{detailRecord.taskId ?? '-'}</div>
                                <div><span className="text-muted-foreground">任务状态：</span>{detailRecord.statusText ?? '-'}</div>
                            </div>
                            <div><span className="text-muted-foreground">使用设备：</span>{detailRecord.deviceName || '-'}</div>
                            <div>
                                <span className="text-muted-foreground">任务标题：</span>
                                <span className="font-medium">{detailRecord.title || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">任务重量：</span>{detailRecord.taskWeight ?? '-'}g</div>
                                <div><span className="text-muted-foreground">实际重量：</span><span className="font-semibold">{detailRecord.actualWeight ?? '-'}g</span></div>
                            </div>
                            {isDepreciationEnabled && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <span className="text-muted-foreground">总成本：</span>
                                        <span className="font-semibold">{formatMoney(detailRecord.cost)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">总电费：</span>
                                        <span className="font-semibold">{formatMoney(detailRecord.electricityCost)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">总折损：</span>
                                        <span className="font-semibold">{formatMoney(detailRecord.depreciationCost)}</span>
                                    </div>
                                </div>
                            )}
                            {detailRecord.printProgress != null && (
                                <div><span className="text-muted-foreground">打印进度：</span>{detailRecord.printProgress}%</div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">开始时间：</span>{detailRecord.startTime ? <FormattedTime time={detailRecord.startTime} /> : '-'}</div>
                                <div><span className="text-muted-foreground">结束时间：</span>{detailRecord.endTime ? <FormattedTime time={detailRecord.endTime} /> : '-'}</div>
                            </div>
                            {detailRecord.coverUrl && (
                                <div>
                                    <span className="text-muted-foreground">封面：</span>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <img
                                                src={detailRecord.coverUrl}
                                                alt="封面"
                                                className="mt-2 h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                            />
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                            <DialogHeader className="sr-only">
                                                <DialogTitle>View Image</DialogTitle>
                                                <DialogDescription>Full size cover image</DialogDescription>
                                            </DialogHeader>
                                            <img
                                                src={detailRecord.coverUrl}
                                                alt="封面大图"
                                                className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                            {detailRecord.spoolVO && (
                                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                                    <h4 className="mb-2 text-xs font-semibold text-muted-foreground">关联耗材</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>名称：{detailRecord.spoolVO.name}</div>
                                        <div>材料：{detailRecord.spoolVO.materialType}</div>
                                        <div>品牌：{detailRecord.spoolVO.brand ?? '-'}</div>
                                        {detailRecord.spoolVO.color && (
                                            <div className="flex items-center gap-1">
                                                颜色：
                                                <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: detailRecord.spoolVO.color }} />
                                                <span className="font-mono">{detailRecord.spoolVO.color}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Bind order modal ── */}
            <Dialog open={bindOpen} onOpenChange={setBindOpen}>
                <DialogContent className="max-w-md overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>绑定订单</DialogTitle>
                        <DialogDescription className="sr-only">选择要绑定的订单</DialogDescription>
                    </DialogHeader>
                    {bindRecord && (
                        <div className="min-w-0 space-y-4">
                            <div className="space-y-1 text-sm rounded-lg border border-border bg-muted/30 p-3">
                                <div><span className="text-muted-foreground">任务标题：</span>{bindRecord.title || '-'}</div>
                                <div><span className="text-muted-foreground">实际重量：</span>{bindRecord.actualWeight != null ? `${bindRecord.actualWeight}g` : '-'}</div>
                            </div>
                            <div className="space-y-2">
                                <Label>选择订单 <span className="text-destructive">*</span></Label>
                                <p className="text-xs text-muted-foreground">共 {processingOrders.length} 个进行中的订单</p>
                                <Combobox
                                    options={processingOrders.map((order) => ({
                                        label: `${order.orderName} | ${order.customerName || '-'} | ¥${order.totalIncome}`,
                                        value: String(order.id)
                                    }))}
                                    value={selectedOrderId ? String(selectedOrderId) : ''}
                                    onChange={(value) => setSelectedOrderId(value ? Number(value) : undefined)}
                                    placeholder="请选择要绑定的订单"
                                    searchPlaceholder="搜索订单..."
                                    emptyText="未找到匹配订单"
                                    className="w-full"
                                />
                                {processingOrders.length === 0 && (
                                    <p className="text-xs text-muted-foreground">暂无进行中的订单</p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBindOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleBind} disabled={bindLoading} className="cursor-pointer">
                            {bindLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Transfer / Bind spool modal ── */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="max-w-md overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>绑定耗材</DialogTitle>
                        <DialogDescription className="sr-only">选择要绑定的耗材</DialogDescription>
                    </DialogHeader>
                    {transferRecord && (
                        <div className="min-w-0 space-y-4">
                            <div className="space-y-1 text-sm">
                                <p><span className="text-muted-foreground">当前记录: </span><span className="font-medium">{transferRecord.title || '未知任务'}</span></p>
                                <p><span className="text-muted-foreground">转移重量: </span><span className="font-medium">{transferRecord.actualWeight}g</span></p>
                            </div>
                            <div className="space-y-2">
                                <Label>选择耗材</Label>
                                <Combobox
                                    options={availableSpools.map((s) => ({
                                        label: `#${s.id} ${s.name} | ${s.materialType} | 剩余: ${s.remainingWeight}g`,
                                        value: String(s.id)
                                    }))}
                                    value={selectedTransferSpoolId ? String(selectedTransferSpoolId) : ''}
                                    onChange={(value) => setSelectedTransferSpoolId(value ? Number(value) : undefined)}
                                    placeholder="请选择要绑定的耗材"
                                    searchPlaceholder="搜索耗材..."
                                    emptyText="未找到匹配耗材"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleTransfer} disabled={transferLoading} className="cursor-pointer">
                            {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Print History modal ── */}
            <PrintHistoryModal
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                onSuccess={() => fetchRecords()}
            />
        </div>
    )
}
