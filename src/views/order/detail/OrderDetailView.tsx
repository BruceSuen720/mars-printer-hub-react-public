import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { isOrderQuantityAdjustEnabled } from '@/config/featureFlags'
import type { LucideIcon } from 'lucide-react'
import {
    ArrowLeft,
    Edit,
    Trash2,
    Calculator,
    Link2,
    Unlink,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Search,
    Box,
    DollarSign,
    Package,
    TrendingDown,
    PiggyBank,
    Check,
    X,
    RotateCcw,
    ArrowDownToLine,
    ArrowUpFromLine,
    Info,
    Wallet,
    Truck,
    FolderOpen,
    History,
    Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/ui/decimal-input'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog'
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    getOrder, updateOrder, deleteOrder, updateStatus, getOrderPrintDuration,
    updateOrderOtherCost, bindRecords, unbindRecord, updateOrderAssets, updateTrackingNumber, queryLogistics, adjustQuantity
} from '@/api/orderInfo'
import { listSpoolUsedRecordByOrderId, listSpoolUsedRecordPage } from '@/api/record'
import { FormattedTime } from '@/components/ui/formatted-time'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { uploadFile } from '@/api/objectStorage'
import { showRequestError } from '@/request'
import { resolveQuoteSettings } from '@/utils/userConfigQuote'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { getTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePageSize'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

/* ── Section card with icon + title header ── */
function SectionCard({
    icon: Icon,
    title,
    action,
    children,
    className,
    contentClassName,
}: {
    icon: LucideIcon
    title: string
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    contentClassName?: string
}) {
    return (
        <section className={cn(cardBase, 'flex flex-col', className)}>
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Icon size={14} className="shrink-0 text-primary/70" />
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
                </div>
                {action}
            </header>
            <div className={cn('flex-1 p-5', contentClassName)}>{children}</div>
        </section>
    )
}

const formatLogisticsTimestamp = (time?: number, timeDesc?: string | null) => {
    if (timeDesc) return timeDesc
    if (typeof time !== 'number' || Number.isNaN(time)) return '-'

    const date = new Date(time)
    if (Number.isNaN(date.getTime())) return '-'

    const pad = (value: number) => String(value).padStart(2, '0')
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate text-right text-sm text-foreground">{children}</span>
        </div>
    )
}

const getStatusText = (s?: number) => { switch (s) { case 1: return '进行中'; case 4: return '库存中'; case 2: return '已完成'; case 3: return '已取消'; default: return '未知' } }
const statusBadge: Record<string, string> = {
    '进行中': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    '库存中': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    '已完成': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    '已取消': 'bg-muted text-muted-foreground',
}

/* ── Stat card (financial highlight) ── */
function FeatureHighlight({ title, value, unit, icon: Icon, loading }: { title: string; value: number | string; unit?: string; icon: LucideIcon; color?: string; loading: boolean }) {
    return (
        <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon size={13} className="shrink-0" />
                {title}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                {loading ? <Skeleton className="h-6 w-20" /> : (
                    <>
                        <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}</span>
                        {unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>}
                    </>
                )}
            </div>
        </div>
    )
}

export default function OrderDetailView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const orderId = Number(id)
    const backTo = typeof location.state?.from === 'string' ? location.state.from : '/order/manage'
    const isMobile = useDeviceStore((s) => s.isMobile)
    const { loginUser } = useLoginUserStore()
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const isIntranet = loginUser.isIntranet

    /* ── State ── */
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<API.OrderVO | null>(null)
    const [records, setRecords] = useState<API.SpoolUsedRecordVO[]>([])

    /* ── Record detail modal ── */
    const [recordDetailOpen, setRecordDetailOpen] = useState(false)
    const [recordDetailRecord, setRecordDetailRecord] = useState<API.SpoolUsedRecordVO | null>(null)
    const showRecordDetail = useCallback((record: API.SpoolUsedRecordVO) => {
        setRecordDetailRecord(record)
        setRecordDetailOpen(true)
    }, [])

    /* ── Edit modal ── */
    const [editOpen, setEditOpen] = useState(false)
    const [editLoading, setEditLoading] = useState(false)
    const [editForm, setEditForm] = useState({ orderName: '', customerName: '', customerSource: '', totalIncome: undefined as number | undefined, remark: '' })

    /* ── Cost modal ── */
    const [costOpen, setCostOpen] = useState(false)
    const [costLoading, setCostLoading] = useState(false)
    const [printDuration, setPrintDuration] = useState(0)
    const [costForm, setCostForm] = useState<{ powerConsumption?: number, electricityFee?: number, laborHourlyRate?: number, logisticsCost?: number, designCost?: number, otherCost?: number }>({ powerConsumption: 300, electricityFee: 0.5, laborHourlyRate: 0, logisticsCost: 0, designCost: 0, otherCost: 0 })
    const [trackingNumber, setTrackingNumber] = useState('')
    const [trackingEdit, setTrackingEdit] = useState(false)
    const [trackingSaveLoading, setTrackingSaveLoading] = useState(false)
    const [logisticsLoading, setLogisticsLoading] = useState(false)
    const [logisticsDialogOpen, setLogisticsDialogOpen] = useState(false)
    const [logisticsResult, setLogisticsResult] = useState<API.DataBody | null>(null)

    /* ── Batch bind modal ── */
    const [batchOpen, setBatchOpen] = useState(false)
    const [batchLoading, setBatchLoading] = useState(false)
    const [unboundRecords, setUnboundRecords] = useState<API.SpoolUsedRecordVO[]>([])
    const [unboundPag, setUnboundPag] = useState({ current: 1, pageSize: preferredPageSize, total: 0 })
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [unboundSearch, setUnboundSearch] = useState('')
    const [batchPageSizeChanged, setBatchPageSizeChanged] = useState(false)
    const pageSizeOptions = useMemo(() => getTablePageSizeOptions(preferredPageSize), [preferredPageSize])

    /* ── Asset modal ── */
    const [assetOpen, setAssetOpen] = useState(false)
    const [assetLoading, setAssetLoading] = useState(false)
    const [assetType, setAssetType] = useState<'image' | 'model'>('image')
    const [assetForm, setAssetForm] = useState({ url: '' })
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [deleteConfirmImage, setDeleteConfirmImage] = useState<string | null>(null)

    /* ── Quantity adjust modal ── */
    const [quantityAdjustOpen, setQuantityAdjustOpen] = useState(false)
    const [quantityAdjustLoading, setQuantityAdjustLoading] = useState(false)
    const [quantityAdjustOperation, setQuantityAdjustOperation] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND')
    const [quantityAdjustForm, setQuantityAdjustForm] = useState<{ quantity: number | undefined; unitPrice: number | undefined }>({
        quantity: undefined,
        unitPrice: undefined,
    })

    /* ── Computed ── */
    const totalRecordsWeight = useMemo(() => {
        const sum = records.reduce((s, r) => s + (r.actualWeight || 0), 0)
        return Number(sum.toFixed(2))
    }, [records])
    const usageSummary = useMemo(() => {
        const summary = new Map<string, { label: string, weight: number }>()

        records.forEach((record) => {
            const weight = record.actualWeight ?? 0
            if (weight <= 0) return

            const label = record.spoolVO?.name?.trim() || (record.spoolId ? `耗材 #${record.spoolId}` : '未知耗材')
            const key = label
            const prev = summary.get(key)

            summary.set(key, {
                label: prev?.label ?? label,
                weight: (prev?.weight ?? 0) + weight,
            })
        })

        return Array.from(summary.values()).map((item) => ({
            ...item,
            weight: Number(item.weight.toFixed(2)),
        }))
    }, [records])
    const electricityCost = useMemo(() => ((costForm.powerConsumption || 0) * printDuration * (costForm.electricityFee || 0)) / 1000, [costForm, printDuration])
    const laborCost = useMemo(() => printDuration * (costForm.laborHourlyRate || 0), [costForm, printDuration])
    const totalCost = useMemo(() => electricityCost + laborCost + (costForm.logisticsCost || 0) + (costForm.designCost || 0) + (costForm.otherCost || 0), [electricityCost, laborCost, costForm])
    const unboundPages = useMemo(() => Math.max(1, Math.ceil(unboundPag.total / unboundPag.pageSize)), [unboundPag])
    const currentPageRecordIds = useMemo(
        () => unboundRecords.map((r) => r.id).filter((id): id is number => id != null),
        [unboundRecords],
    )
    const isCurrentPageAllSelected = useMemo(
        () => currentPageRecordIds.length > 0 && currentPageRecordIds.every((id) => selectedIds.includes(id)),
        [currentPageRecordIds, selectedIds],
    )
    const primaryExpressInfo = useMemo(
        () => logisticsResult?.info?.[0] ?? null,
        [logisticsResult],
    )

    const statusText = getStatusText(order?.status)
    const canChangeStatus = order?.status === 1 || order?.status === 4
    const canRestart = order?.status === 2 || order?.status === 3

    /* ── Fetchers ── */
    const fetchDetail = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getOrder({ id: orderId })
            if (res.data?.data) setOrder(res.data.data)
        } catch (error) { showRequestError(error, '获取订单详情失败') }
        finally { setLoading(false) }
    }, [orderId])

    const fetchHistory = useCallback(async () => {
        try {
            const res = await listSpoolUsedRecordByOrderId({ orderId })
            if (res.data?.data) setRecords(res.data.data)
        } catch (error) { showRequestError(error, '获取使用历史失败') }
    }, [orderId])

    useEffect(() => { fetchDetail(); fetchHistory() }, [fetchDetail, fetchHistory])
    useEffect(() => {
        setTrackingNumber(order?.trackingNumber ?? '')
        setTrackingEdit(false)
    }, [order?.trackingNumber])

    /* ── Status change ── */
    const handleStatusChange = useCallback(async (newStatus: number) => {
        if (!order?.id) return
        try {
            await updateStatus({ id: order.id }, { status: newStatus })
            toast.success('状态更新成功')
            if (newStatus === 2) toast.success(`🎉 又让你小子回本 ¥${order.profit ?? 0}！`, { duration: 5000 })
            fetchDetail()
        } catch (error) { showRequestError(error, '状态更新失败') }
    }, [order, fetchDetail])

    /* ── Delete ── */
    const handleDelete = useCallback(async () => {
        if (!order?.id) return
        try { await deleteOrder({ id: order.id }); toast.success('订单删除成功'); navigate(backTo) }
        catch (error) { showRequestError(error, '删除订单失败') }
    }, [backTo, order, navigate])

    /* ── Quantity adjust ── */
    const openQuantityAdjust = useCallback((operation: 'INBOUND' | 'OUTBOUND') => {
        setQuantityAdjustOperation(operation)
        setQuantityAdjustForm({ quantity: undefined, unitPrice: undefined })
        setQuantityAdjustOpen(true)
    }, [])

    const handleQuantityAdjustSubmit = useCallback(async () => {
        if (!order?.id) return

        const quantity = quantityAdjustForm.quantity
        const unitPrice = quantityAdjustForm.unitPrice

        if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
            toast.warning('请输入大于 0 的数量')
            return
        }

        if (quantityAdjustOperation === 'OUTBOUND' && (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice < 0)) {
            toast.warning('请输入有效单价')
            return
        }

        setQuantityAdjustLoading(true)
        try {
            await adjustQuantity({
                orderId: order.id,
                operation: quantityAdjustOperation,
                quantity,
                ...(quantityAdjustOperation === 'OUTBOUND' ? { unitPrice } : {}),
            })
            toast.success(quantityAdjustOperation === 'INBOUND' ? '入库成功' : '出库成功')
            setQuantityAdjustOpen(false)
            fetchDetail()
        } catch (error) {
            showRequestError(error, quantityAdjustOperation === 'INBOUND' ? '入库失败' : '出库失败')
        } finally {
            setQuantityAdjustLoading(false)
        }
    }, [fetchDetail, order?.id, quantityAdjustForm.quantity, quantityAdjustForm.unitPrice, quantityAdjustOperation])

    /* ── Edit ── */
    const openEdit = () => {
        if (!order) return
        setEditForm({ orderName: order.orderName ?? '', customerName: order.customerName ?? '', customerSource: order.customerSource ?? '', totalIncome: order.totalIncome, remark: order.remark ?? '' })
        setEditOpen(true)
    }
    const handleEditSubmit = useCallback(async () => {
        if (!order?.id || !editForm.orderName || !editForm.customerName) { toast.warning('请填写必填字段'); return }
        setEditLoading(true)
        try {
            await updateOrder({ id: order.id, orderName: editForm.orderName, customerName: editForm.customerName, customerSource: editForm.customerSource || undefined, totalIncome: editForm.totalIncome, remark: editForm.remark || undefined } as API.OrderUpdateDTO)
            toast.success('订单更新成功'); setEditOpen(false); fetchDetail()
        } catch (error) { showRequestError(error, '更新订单失败') }
        finally { setEditLoading(false) }
    }, [order, editForm, fetchDetail])

    /* ── Cost ── */
    const openCost = useCallback(async () => {
        if (!order?.id) return
        setCostLoading(true)
        const settings = await resolveQuoteSettings()
        const base = {
            powerConsumption: settings.power,
            electricityFee: settings.electricityPrice,
            laborHourlyRate: settings.laborHourlyRate,
        }
        setCostForm({ ...base, logisticsCost: order.logisticsCost ?? 0, designCost: order.designCost ?? 0, otherCost: order.otherCost ?? 0 })
        try { const res = await getOrderPrintDuration({ id: order.id }); if (res.data?.data !== undefined) setPrintDuration(res.data.data) }
        catch (error) { showRequestError(error, '获取打印时长失败') }
        finally { setCostLoading(false); setCostOpen(true) }
    }, [order])

    const handleSaveCost = useCallback(async () => {
        if (!order?.id) return
        setCostLoading(true)
        try {
            await updateOrderOtherCost({ id: order.id, otherCost: costForm.otherCost || 0, logisticsCost: costForm.logisticsCost || 0, designCost: costForm.designCost || 0, laborCost, electricityCost } as API.OrderOtherCostUpdateDTO)
            toast.success('成本已保存'); setCostOpen(false); fetchDetail()
        } catch (error) { showRequestError(error, '保存成本失败') }
        finally { setCostLoading(false) }
    }, [order, costForm, laborCost, electricityCost, fetchDetail])

    const handleSaveTrackingNumber = useCallback(async () => {
        const nextTrackingNumber = trackingNumber.trim()
        if (!order?.id) return
        if ((order.trackingNumber ?? '') === nextTrackingNumber) {
            setTrackingEdit(false)
            return
        }

        setTrackingSaveLoading(true)
        try {
            await updateTrackingNumber({
                id: order.id,
                trackingNumber: nextTrackingNumber || undefined,
            })
            setOrder((prev) => prev ? { ...prev, trackingNumber: nextTrackingNumber } : prev)
            setTrackingNumber(nextTrackingNumber)
            setTrackingEdit(false)
            toast.success('物流单号已保存')
        } catch (error) {
            showRequestError(error, '保存物流单号失败')
        } finally {
            setTrackingSaveLoading(false)
        }
    }, [order, trackingNumber])

    const startEditTrackingNumber = useCallback(() => {
        setTrackingNumber(order?.trackingNumber ?? '')
        setTrackingEdit(true)
    }, [order?.trackingNumber])

    const cancelEditTrackingNumber = useCallback(() => {
        setTrackingNumber(order?.trackingNumber ?? '')
        setTrackingEdit(false)
    }, [order?.trackingNumber])

    const handleQueryLogistics = useCallback(async () => {
        const expressNo = trackingNumber.trim()
        if (!order?.id || !expressNo) {
            toast.warning('请输入物流单号')
            return
        }

        setLogisticsLoading(true)
        try {
            const res = await queryLogistics({ number: expressNo })
            const logisticsData = res.data?.data

            if (!logisticsData?.success || !logisticsData.data?.info?.length) {
                toast.error(logisticsData?.msg || '查询物流信息失败')
                return
            }

            setLogisticsResult(logisticsData.data)
            setLogisticsDialogOpen(true)
        } catch (error) {
            showRequestError(error, '查询物流信息失败')
        } finally {
            setLogisticsLoading(false)
        }
    }, [order?.id, trackingNumber])

    /* ── Batch bind ── */
    const fetchUnbound = useCallback(async (pag = unboundPag, title = unboundSearch) => {
        setBatchLoading(true)
        try {
            const res = await listSpoolUsedRecordPage({
                current: pag.current,
                size: pag.pageSize,
                isBindOrder: 0,
                title: title.trim() || undefined,
            })
            if (res.data?.data) { setUnboundRecords(res.data.data.records ?? []); setUnboundPag(p => ({ ...p, total: res.data.data!.total ?? 0 })) }
        } catch (error) { showRequestError(error, '获取记录失败') }
        finally { setBatchLoading(false) }
    }, [unboundPag, unboundSearch])

    useEffect(() => {
        if (!userConfigLoaded || batchPageSizeChanged || unboundPag.pageSize === preferredPageSize || !batchOpen) {
            return
        }

        const p = { current: 1, pageSize: preferredPageSize, total: unboundPag.total }
        setUnboundPag(p)
        fetchUnbound(p, unboundSearch)
    }, [batchOpen, batchPageSizeChanged, fetchUnbound, preferredPageSize, unboundPag.pageSize, unboundPag.total, unboundSearch, userConfigLoaded])

    const openBatchBind = useCallback(() => {
        setSelectedIds([]); setUnboundSearch(''); setBatchPageSizeChanged(false)
        const p = { current: 1, pageSize: preferredPageSize, total: 0 }; setUnboundPag(p)
        setBatchOpen(true); fetchUnbound(p, '')
    }, [fetchUnbound, preferredPageSize])

    const handleUnboundPageSizeChange = useCallback((size: number) => {
        setBatchPageSizeChanged(true)
        const p = { ...unboundPag, current: 1, pageSize: size }
        setUnboundPag(p)
        fetchUnbound(p, unboundSearch)
    }, [fetchUnbound, unboundPag, unboundSearch])

    const handleBatchBind = useCallback(async () => {
        if (selectedIds.length === 0) { toast.warning('请选择记录'); return }
        setBatchLoading(true)
        try {
            await bindRecords({ orderId, recordIds: selectedIds })
            toast.success('批量绑定成功'); setBatchOpen(false); fetchDetail(); fetchHistory()
        } catch (error) { showRequestError(error, '批量绑定失败') }
        finally { setBatchLoading(false) }
    }, [selectedIds, orderId, fetchDetail, fetchHistory])

    /* ── Unbind record ── */
    const handleUnbind = useCallback(async (record: API.SpoolUsedRecordVO) => {
        if (!record.id) return
        try { await unbindRecord({ orderId, recordId: record.id }); toast.success('解绑成功'); fetchDetail(); fetchHistory() }
        catch (error) { showRequestError(error, '解绑失败') }
    }, [orderId, fetchDetail, fetchHistory])

    /* ── Assets ── */
    const openAssetModal = (type: 'image' | 'model') => {
        setAssetType(type)
        setAssetForm({ url: '' })
        setAssetOpen(true)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setAssetLoading(true)
        try {
            const res = await uploadFile(formData)
            if (!res.data.data) {
                toast.error('上传失败')
                return
            }
            setAssetForm({ url: res.data.data })
            toast.success('上传成功')
        } catch (error) {
            showRequestError(error, '上传失败')
        } finally {
            setAssetLoading(false)
        }
    }

    const handleSaveAsset = async () => {
        if (!order?.id || !assetForm.url) {
            toast.warning('请输入或上传链接')
            return
        }
        setAssetLoading(true)
        try {
            const images = [...(order.images || [])]
            const models = [...(order.models || [])]
            if (assetType === 'image') images.push(assetForm.url)
            else models.push(assetForm.url)

            await updateOrderAssets({ id: order.id, images, models })
            toast.success('添加成功')
            setAssetOpen(false)
            fetchDetail()
        } catch (error) {
            showRequestError(error, '添加失败')
        } finally {
            setAssetLoading(false)
        }
    }

    const handleDeleteAsset = async (url: string, type: 'image' | 'model') => {
        if (!order?.id) return
        try {
            const images = type === 'image' ? (order.images || []).filter(u => u !== url) : (order.images || [])
            const models = type === 'model' ? (order.models || []).filter(u => u !== url) : (order.models || [])
            await updateOrderAssets({ id: order.id, images, models })
            toast.success('删除成功')
            if (type === 'image' && previewImage === url) setPreviewImage(null)
            if (type === 'image' && deleteConfirmImage === url) setDeleteConfirmImage(null)
            fetchDetail()
        } catch (error) {
            showRequestError(error, '删除失败')
        }
    }

    const normalizeExternalUrl = (url: string) => {
        const trimmedUrl = url.trim()
        if (!trimmedUrl) return trimmedUrl
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedUrl)) return trimmedUrl
        if (trimmedUrl.startsWith('//')) return `${window.location.protocol}${trimmedUrl}`
        try {
            return new URL(trimmedUrl, window.location.origin).href
        } catch {
            return `${window.location.origin}/${trimmedUrl.replace(/^\/+/, '')}`
        }
    }

    const getBambuStudioOpenUrl = (modelUrl: string) => {
        const normalizedModelUrl = normalizeExternalUrl(modelUrl)
        if (normalizedModelUrl.startsWith('bambustudioopen://')) return normalizedModelUrl
        return `bambustudioopen://${encodeURIComponent(normalizedModelUrl)}`
    }

    const handleOpenInBambuStudio = (modelUrl: string) => {
        try {
            window.location.href = getBambuStudioOpenUrl(modelUrl)
        } catch {
            toast.error('打开 Bambu Studio 失败')
        }
    }

    const toggleId = (rid: number) => setSelectedIds(ids => ids.includes(rid) ? ids.filter(i => i !== rid) : [...ids, rid])
    const toggleSelectCurrentPage = useCallback(() => {
        setSelectedIds((ids) => {
            if (currentPageRecordIds.length === 0) return ids
            const allSelected = currentPageRecordIds.every((id) => ids.includes(id))
            if (allSelected) return ids.filter((id) => !currentPageRecordIds.includes(id))
            const merged = new Set(ids)
            currentPageRecordIds.forEach((id) => merged.add(id))
            return Array.from(merged)
        })
    }, [currentPageRecordIds])
    const updateCost = (patch: Partial<typeof costForm>) => setCostForm(p => ({ ...p, ...patch }))
    const updateEdit = (patch: Partial<typeof editForm>) => setEditForm(p => ({ ...p, ...patch }))

    const getSpoolCost = (r: API.SpoolUsedRecordVO) => {
        const s = r.spoolVO; if (s?.price && s?.netWeight && r.actualWeight) return `¥${((r.actualWeight / s.netWeight) * s.price).toFixed(2)}`; return '¥0.00'
    }
    const renderUsageSummaryButton = () => (
        <button
            type="button"
            aria-label="查看耗材汇总"
            className="inline-flex h-6 cursor-help items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:border-primary/30 focus-visible:bg-primary/5 focus-visible:text-primary"
        >
            <Package size={13} />
            <span>耗材汇总</span>
            <span className="text-[11px] text-muted-foreground/80">{usageSummary.length}</span>
        </button>
    )
    const renderUsageSummaryList = () => (
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {usageSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">{item.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{item.weight}g</span>
                </div>
            ))}
        </div>
    )
    const renderUsageHistoryTitle = (className?: string) => {
        if (usageSummary.length === 0) return <h2 className={cn('text-sm font-semibold', className)}>使用历史</h2>

        if (isMobile) {
            return (
                <div className="flex items-center gap-1.5">
                    <h2 className={cn('text-sm font-semibold', className)}>使用历史</h2>
                    <Dialog>
                        <DialogTrigger asChild>
                            {renderUsageSummaryButton()}
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>耗材汇总</DialogTitle>
                                <DialogDescription className="sr-only">查看当前订单已绑定使用记录的耗材重量汇总</DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>按耗材名称合并</span>
                                <span>{usageSummary.length} 种</span>
                            </div>
                            {renderUsageSummaryList()}
                        </DialogContent>
                    </Dialog>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-1.5">
                <h2 className={cn('text-sm font-semibold', className)}>使用历史</h2>
                <HoverCard openDelay={120} closeDelay={80}>
                    <HoverCardTrigger asChild>
                        {renderUsageSummaryButton()}
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" align="start" sideOffset={8} className="w-96 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-muted-foreground">耗材汇总</span>
                            <span className="text-xs text-muted-foreground">{usageSummary.length} 种</span>
                        </div>
                        {renderUsageSummaryList()}
                    </HoverCardContent>
                </HoverCard>
            </div>
        )
    }

    /* ── Loading ── */
    if (loading && !order) return (
        <div className="space-y-6 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /></div>
    )

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="h-8 w-8 cursor-pointer"><ArrowLeft size={18} /></Button>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">订单详情</h1>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">#{order?.id}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${statusBadge[statusText] ?? 'bg-muted text-muted-foreground'}`}>{statusText}</span>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                {/* Row 1: Basic Info + Operations */}
                <SectionCard icon={Info} title="基本信息" className="lg:col-span-2">
                    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                        <InfoRow label="订单名称"><span className="font-medium text-foreground">{order?.orderName || '-'}</span></InfoRow>
                        <InfoRow label="客户名称"><span className="text-foreground">{order?.customerName || '-'}</span></InfoRow>
                        {isOrderQuantityAdjustEnabled && <InfoRow label="数量"><span className="tabular-nums">{order?.quantity ?? '-'}</span></InfoRow>}
                        <InfoRow label="客户来源"><span className="text-foreground">{order?.customerSource || '-'}</span></InfoRow>
                        <InfoRow label="备注"><span className="text-muted-foreground">{order?.remark || '-'}</span></InfoRow>
                        <InfoRow label="创建时间">{order?.createTime ? <FormattedTime time={order.createTime} /> : <span className="text-muted-foreground">-</span>}</InfoRow>
                        <InfoRow label="开始时间">{order?.startTime ? <FormattedTime time={order.startTime} /> : <span className="text-muted-foreground">-</span>}</InfoRow>
                        <InfoRow label="结束时间">{order?.endTime ? <FormattedTime time={order.endTime} /> : <span className="text-muted-foreground">-</span>}</InfoRow>
                    </div>
                </SectionCard>

                <SectionCard icon={Settings} title="订单操作">
                    <div className="flex h-full flex-col justify-center gap-3">
                        {/* 1. 常规操作区：一行两列 */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={openEdit} disabled={!order} className="w-full justify-center cursor-pointer">
                                <Edit size={16} className="mr-1.5" /> 编辑
                            </Button>
                            <Button variant="outline" onClick={openCost} disabled={!order} className="w-full justify-center cursor-pointer">
                                <Calculator size={16} className="mr-1.5" /> 成本
                            </Button>
                        </div>

                        {/* 2. 状态变更区 */}
                        {canChangeStatus && (
                            <>
                                <div className="h-px bg-border/50" />
                                <div className={`grid gap-2 ${order?.status === 1 || order?.status === 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    {order?.status === 1 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-center text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-950/30 cursor-pointer"
                                                >
                                                    <Box size={16} className="mr-1.5" /> 库存
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>确认将订单入库？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        此操作将把订单状态更新为“库存中”。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="cursor-pointer">返回</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleStatusChange(4)} className="!bg-violet-600 hover:!bg-violet-700 !text-white cursor-pointer dark:!bg-violet-600 dark:hover:!bg-violet-700">
                                                        确定入库
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    {order?.status === 4 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 cursor-pointer"
                                                >
                                                    <RotateCcw size={16} className="mr-1.5" /> 恢复进行中
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>确认恢复为进行中？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        此操作将把订单状态从“库存中”更新为“进行中”。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="cursor-pointer">返回</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleStatusChange(1)} className="!bg-blue-600 hover:!bg-blue-700 !text-white cursor-pointer dark:!bg-blue-600 dark:hover:!bg-blue-700">
                                                        确定恢复
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30 cursor-pointer"
                                            >
                                                <Check size={16} className="mr-1.5" /> 完成
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>确认完成订单？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作将把订单状态更新为“已完成”。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="cursor-pointer">返回</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleStatusChange(2)} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white cursor-pointer dark:!bg-emerald-600 dark:hover:!bg-emerald-700">
                                                    确定完成
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-center text-orange-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/30 cursor-pointer"
                                            >
                                                <X size={16} className="mr-1.5" /> 取消
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>确认取消订单？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作将把订单状态更新为“已取消”。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="cursor-pointer">返回</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleStatusChange(3)} className="!bg-orange-500 hover:!bg-orange-600 !text-white cursor-pointer dark:!bg-orange-600 dark:hover:!bg-orange-700">
                                                    确定取消
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </>
                        )}

                        {canRestart && (
                            <>
                                <div className="h-px bg-border/50" />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 cursor-pointer"
                                        >
                                            <RotateCcw size={16} className="mr-1.5" /> 重启
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确认重启订单？</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                此操作将把订单状态更新为“进行中”。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="cursor-pointer">返回</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleStatusChange(1)} className="!bg-blue-600 hover:!bg-blue-700 !text-white cursor-pointer dark:!bg-blue-600 dark:hover:!bg-blue-700">
                                                确定重启
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}

                        {/* 3. 危险操作区 */}
                        <div className="h-px bg-border/50" />
                        {isOrderQuantityAdjustEnabled && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => openQuantityAdjust('INBOUND')}
                                        disabled={!order}
                                        className="w-full justify-center cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30"
                                    >
                                        <ArrowDownToLine size={16} className="mr-1.5" /> 入库
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => openQuantityAdjust('OUTBOUND')}
                                        disabled={!order}
                                        className="w-full justify-center cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30"
                                    >
                                        <ArrowUpFromLine size={16} className="mr-1.5" /> 出库
                                    </Button>
                                </div>
                                <div className="h-px bg-border/50" />
                            </>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
                                >
                                    <Trash2 size={16} className="mr-1.5" /> 删除订单
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>确定要删除这个订单吗？</AlertDialogTitle>
                                    <AlertDialogDescription>此操作不可撤销。该订单的所有相关数据将被永久移除。</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        确定删除
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </SectionCard>

                <SectionCard icon={Wallet} title="财务信息" className="lg:col-span-2">
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <FeatureHighlight
                            title="总收入"
                            value={`¥${order?.totalIncome?.toFixed(2) ?? '0.00'}`}
                            icon={DollarSign}
                            loading={loading}
                        />
                        <FeatureHighlight
                            title="材料成本"
                            value={`¥${order?.materialCost?.toFixed(2) ?? '0.00'}`}
                            icon={Package}
                            loading={loading}
                        />
                        <FeatureHighlight
                            title="其他总成本"
                            value={`¥${((order?.electricityCost ?? 0) + (order?.logisticsCost ?? 0) + (order?.designCost ?? 0) + (order?.laborCost ?? 0) + (order?.otherCost ?? 0)).toFixed(2)}`}
                            icon={TrendingDown}
                            loading={loading}
                        />
                        <FeatureHighlight
                            title="预计利润"
                            value={`¥${order?.profit?.toFixed(2) ?? '0.00'}`}
                            icon={PiggyBank}
                            loading={loading}
                        />
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                        <h3 className="mb-3 text-xs font-semibold text-muted-foreground">其他成本明细</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">电费</span>
                                <span className="text-sm font-medium tabular-nums text-foreground">¥{order?.electricityCost?.toFixed(2) ?? '0.00'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">物流费用</span>
                                <span className="text-sm font-medium tabular-nums text-foreground">¥{order?.logisticsCost?.toFixed(2) ?? '0.00'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">设计费</span>
                                <span className="text-sm font-medium tabular-nums text-foreground">¥{order?.designCost?.toFixed(2) ?? '0.00'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">人工时费</span>
                                <span className="text-sm font-medium tabular-nums text-foreground">¥{order?.laborCost?.toFixed(2) ?? '0.00'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">杂项支出</span>
                                <span className="text-sm font-medium tabular-nums text-foreground">¥{order?.otherCost?.toFixed(2) ?? '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Truck}
                    title="物流信息"
                    action={
                        isIntranet && (
                            <Button variant="ghost" size="sm" onClick={handleQueryLogistics} disabled={!order || logisticsLoading} className="h-7 cursor-pointer text-xs">
                                {logisticsLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                查询物流
                            </Button>
                        )
                    }
                >
                    <div className="space-y-2">
                        <Label htmlFor="tracking-number" className="text-xs text-muted-foreground">物流单号</Label>
                        {trackingEdit ? (
                            <div className="flex items-center gap-1.5">
                                <Input
                                    id="tracking-number"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="请输入物流单号"
                                    className="h-9"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTrackingNumber()
                                        if (e.key === 'Escape') cancelEditTrackingNumber()
                                    }}
                                    autoFocus
                                    disabled={trackingSaveLoading}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer text-emerald-600 hover:text-emerald-700"
                                    onClick={handleSaveTrackingNumber}
                                    disabled={trackingSaveLoading}
                                >
                                    {trackingSaveLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                                    onClick={cancelEditTrackingNumber}
                                    disabled={trackingSaveLoading}
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="group flex min-h-9 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 py-2 transition-colors hover:border-primary/50"
                                onClick={startEditTrackingNumber}
                            >
                                {order?.trackingNumber ? (
                                    <span className="text-sm font-medium text-foreground">{order.trackingNumber}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground/70 group-hover:text-muted-foreground">
                                        点击输入物流单号
                                    </span>
                                )}
                                <Edit size={13} className="ml-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                        )}
                    </div>
                </SectionCard>

                <div className="lg:col-span-2">
                    <SectionCard icon={FolderOpen} title="订单资源">
                        <div className="space-y-6">
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm font-medium">设计图片/实物图</span>
                                    <Button variant="outline" size="sm" onClick={() => openAssetModal('image')} className="h-8 cursor-pointer">
                                        添加图片
                                    </Button>
                                </div>
                                {order?.images && order.images.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                                        {order.images.map((img, i) => (
                                            <div
                                                key={i}
                                                role="button"
                                                tabIndex={0}
                                                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 outline-none transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                                                onClick={() => setPreviewImage(img)}
                                                onKeyDown={(event) => {
                                                    if (event.currentTarget !== event.target) return
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        setPreviewImage(img)
                                                    }
                                                }}
                                                aria-label="预览图片"
                                                >
                                                    <img src={img} alt="Order asset" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                                                <Popover
                                                    open={deleteConfirmImage === img}
                                                    onOpenChange={(open) => setDeleteConfirmImage(open ? img : null)}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-1.5 top-1.5 z-10 h-7 w-7 cursor-pointer bg-black/45 text-white opacity-0 shadow-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                                            onClick={(event) => event.stopPropagation()}
                                                            onKeyDown={(event) => event.stopPropagation()}
                                                            aria-label="删除图片"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        side="top"
                                                        align="end"
                                                        className="w-48 p-3"
                                                        onClick={(event) => event.stopPropagation()}
                                                        onKeyDown={(event) => event.stopPropagation()}
                                                    >
                                                        <p className="text-sm font-medium">确定删除这张图片吗？</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">删除后无法恢复。</p>
                                                        <div className="mt-3 flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 cursor-pointer px-2 text-xs"
                                                                onClick={() => setDeleteConfirmImage(null)}
                                                            >
                                                                取消
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-7 cursor-pointer px-2 text-xs"
                                                                onClick={() => handleDeleteAsset(img, 'image')}
                                                            >
                                                                删除
                                                            </Button>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed bg-muted/20 py-4 text-center text-sm text-muted-foreground">暂无图片</div>
                                )}
                            </div>
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm font-medium">模型文件</span>
                                    <Button variant="outline" size="sm" onClick={() => openAssetModal('model')} className="h-8 cursor-pointer">
                                        添加模型
                                    </Button>
                                </div>
                                {order?.models && order.models.length > 0 ? (
                                    <div className="space-y-2">
                                        {order.models.map((model, i) => (
                                            <div key={i} className="group flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                                                        <Box size={16} />
                                                    </div>
                                                    <a href={normalizeExternalUrl(model)} target="_blank" rel="noreferrer" className="truncate text-sm text-blue-500 hover:underline">
                                                        {model.split('/').pop() || model}
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 cursor-pointer"
                                                        onClick={() => handleOpenInBambuStudio(model)}
                                                    >
                                                        在 Bambu Studio 中打开
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive" onClick={() => handleDeleteAsset(model, 'model')}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed bg-muted/20 py-4 text-center text-sm text-muted-foreground">暂无模型</div>
                                )}
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* Usage history */}
            {isMobile ? (
                /* ── Mobile: card list ── */
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            {renderUsageHistoryTitle()}
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                                <span>绑定 <span className="font-medium tabular-nums text-foreground">{records.length}</span> 条</span>
                                <span>总重 <span className="font-semibold tabular-nums text-foreground">{totalRecordsWeight}g</span></span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openBatchBind} disabled={!order} className="cursor-pointer">
                            <Link2 size={14} className="mr-1" /> 绑定
                        </Button>
                    </div>
                    {records.length === 0 ? (
                        <div className={`${cardBase} py-12 text-center text-sm text-muted-foreground`}>暂无使用记录</div>
                    ) : (
                        records.map((r) => (
                            <div key={r.id} className={`${cardBase} cursor-pointer p-4 transition-colors active:bg-muted/40`} onClick={() => showRecordDetail(r)}>
                                {/* Row 1: Title + Status */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium text-foreground">{r.title || '-'}</span>
                                    <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.statusText || '-'}</span>
                                </div>
                                {/* Row 2: Weight + Cost + Spool */}
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>设备 <span className="text-foreground">{r.deviceName || '-'}</span></span>
                                    <span>实际 <span className="font-semibold tabular-nums text-foreground">{r.actualWeight ?? '-'}g</span></span>
                                    <span>成本 <span className="tabular-nums text-foreground">{getSpoolCost(r)}</span></span>
                                    {r.spoolVO?.name && <span>耗材 <span className="text-foreground">{r.spoolVO.name}</span></span>}
                                </div>
                                {/* Row 3: Unbind */}
                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-destructive hover:text-destructive">
                                                <Unlink size={12} className="mr-1" /> 解绑
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>确定解绑此记录？</AlertDialogTitle><AlertDialogDescription>解绑后可重新绑定到其他订单。</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel><AlertDialogAction onClick={() => handleUnbind(r)} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">确定</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* ── Desktop: table ── */
                <section className={`${cardBase} overflow-hidden`}>
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <History size={14} className="shrink-0 text-primary/70" />
                                {renderUsageHistoryTitle()}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>绑定 <span className="ml-0.5 font-medium tabular-nums text-foreground">{records.length}</span> 条</span>
                                <span>总重 <span className="ml-0.5 font-semibold tabular-nums text-foreground">{totalRecordsWeight}g</span></span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openBatchBind} disabled={!order} className="cursor-pointer">
                            <Link2 size={14} className="mr-2" /> 批量绑定
                        </Button>
                    </header>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow className="border-b hover:bg-transparent">
                                {['任务标题', '设备', '实际重量', '状态', '耗材名称', '耗材成本', '时间', '操作'].map(h => (
                                    <TableHead key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</TableHead>
                                ))}
                            </TableRow></TableHeader>
                            <TableBody>
                                {records.length === 0 ? (
                                    <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-24 px-4 py-12 text-center text-sm text-muted-foreground">暂无使用记录</TableCell></TableRow>
                                ) : records.map(r => (
                                    <TableRow key={r.id} className="cursor-pointer border-b transition-colors hover:bg-muted/40" onClick={() => showRecordDetail(r)}>
                                        <TableCell className="max-w-[180px] truncate px-4 py-3 font-medium">{r.title || '-'}</TableCell>
                                        <TableCell className="max-w-[140px] truncate px-4 py-3 text-muted-foreground">{r.deviceName || '-'}</TableCell>
                                        <TableCell className="px-4 py-3 font-semibold tabular-nums">{r.actualWeight ?? '-'}g</TableCell>
                                        <TableCell className="px-4 py-3"><span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.statusText || '-'}</span></TableCell>
                                        <TableCell className="px-4 py-3 text-muted-foreground">{r.spoolVO?.name || '-'}</TableCell>
                                        <TableCell className="px-4 py-3 tabular-nums">{getSpoolCost(r)}</TableCell>
                                        <TableCell className="px-4 py-3 text-xs">
                                            <div className="space-y-1">
                                                {r.startTime && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                        <span className="text-muted-foreground">开始</span>
                                                        <span className="text-foreground"><FormattedTime time={r.startTime} /></span>
                                                    </div>
                                                )}
                                                {r.endTime && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-muted-foreground">结束</span>
                                                        <span className="text-foreground"><FormattedTime time={r.endTime} /></span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-destructive hover:text-destructive"><Unlink size={12} className="mr-1" /> 解绑</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>确定解绑此记录？</AlertDialogTitle><AlertDialogDescription>解绑后可重新绑定到其他订单。</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel><AlertDialogAction onClick={() => handleUnbind(r)} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">确定</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            )}

            {/* ═══ MODALS ═══ */}

            {/* Image preview */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>预览订单图片</DialogTitle>
                        <DialogDescription>订单设计图片或实物图的大尺寸预览</DialogDescription>
                    </DialogHeader>
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Order asset fullsize"
                            className="max-h-[85vh] w-full rounded-lg object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>编辑订单</DialogTitle><DialogDescription className="sr-only">修改订单信息</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2"><Label>订单名称 <span className="text-destructive">*</span></Label><Input value={editForm.orderName} onChange={e => updateEdit({ orderName: e.target.value })} /></div>
                        <div className="space-y-2"><Label>客户名称 <span className="text-destructive">*</span></Label><Input value={editForm.customerName} onChange={e => updateEdit({ customerName: e.target.value })} /></div>
                        <div className="space-y-2"><Label>客户来源</Label><Input value={editForm.customerSource} onChange={e => updateEdit({ customerSource: e.target.value })} /></div>
                        <div className="space-y-2"><Label>总收入</Label><Input type="number" min={0} step={0.01} value={editForm.totalIncome ?? ''} onChange={e => updateEdit({ totalIncome: e.target.value ? Number(e.target.value) : undefined })} /></div>
                        <div className="space-y-2"><Label>备注</Label><Textarea value={editForm.remark} onChange={e => updateEdit({ remark: e.target.value })} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleEditSubmit} disabled={editLoading} className="cursor-pointer">{editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cost */}
            <Dialog open={costOpen} onOpenChange={setCostOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>成本计算</DialogTitle><DialogDescription className="sr-only">计算订单的各项成本</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                            <p><span className="text-muted-foreground">打印时长: </span><span className="font-semibold">{printDuration.toFixed(2)}</span> 小时</p>
                            <p className="mt-1 text-xs text-muted-foreground">功耗、电费、人工参数仅可在「偏好设置」中修改。</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">功耗(W)</Label><Input disabled value={costForm.powerConsumption ?? ''} /></div>
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">电费(元/度)</Label><Input disabled value={costForm.electricityFee ?? ''} /></div>
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">人工时费(元/时)</Label><Input disabled value={costForm.laborHourlyRate ?? ''} /></div>
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">物流成本</Label><DecimalInput min={0} step={0.01} value={costForm.logisticsCost ?? ''} onValueChange={val => updateCost({ logisticsCost: val })} /></div>
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">设计成本</Label><DecimalInput min={0} step={0.01} value={costForm.designCost ?? ''} onValueChange={val => updateCost({ designCost: val })} /></div>
                            <div className="space-y-1"><Label className="text-xs text-muted-foreground">其他成本</Label><DecimalInput min={0} step={0.01} value={costForm.otherCost ?? ''} onValueChange={val => updateCost({ otherCost: val })} /></div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                            <p><span className="text-muted-foreground">电费: </span>¥{electricityCost.toFixed(2)}</p>
                            <p><span className="text-muted-foreground">人工: </span>¥{laborCost.toFixed(2)}</p>
                            <p className="font-semibold"><span className="text-muted-foreground">总成本: </span><span className="text-amber-500">¥{totalCost.toFixed(2)}</span></p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCostOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleSaveCost} disabled={costLoading} className="cursor-pointer">{costLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={logisticsDialogOpen} onOpenChange={setLogisticsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>物流信息</DialogTitle>
                        <DialogDescription className="sr-only">查看物流最新状态和完整流程</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-base font-semibold text-foreground">
                                        {primaryExpressInfo?.logisticsStatusText || primaryExpressInfo?.logisticsStatusDesc || '暂无状态'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {primaryExpressInfo?.theLastMessage || '暂无最新物流描述'}
                                    </p>
                                </div>
                                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                    {primaryExpressInfo?.logisticsCompanyName || '未知物流公司'}
                                </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                <div>物流单号：<span className="font-mono text-foreground">{primaryExpressInfo?.mailNo || trackingNumber || '-'}</span></div>
                                <div>最后更新时间：<span className="text-foreground">{primaryExpressInfo?.theLastTime || '-'}</span></div>
                                <div>预计耗时：<span className="text-foreground">{primaryExpressInfo?.takeTime || '-'}</span></div>
                            </div>
                        </div>

                        <div className="themed-scrollbar max-h-[420px] overflow-y-auto pr-1">
                            {logisticsResult?.info && logisticsResult.info.length > 0 ? (
                                <div className="space-y-6">
                                    {logisticsResult.info.map((expressInfo, expressIndex) => (
                                        <div key={`${expressInfo.mailNo ?? expressIndex}`} className="space-y-3">
                                            {logisticsResult.info!.length > 1 && (
                                                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                                                    <span className="text-muted-foreground">物流单号：</span>
                                                    <span className="font-mono text-foreground">{expressInfo.mailNo || '-'}</span>
                                                </div>
                                            )}
                                            {expressInfo.logisticsTraceDetailList && expressInfo.logisticsTraceDetailList.length > 0 ? (
                                                <div className="space-y-0">
                                                    {[...expressInfo.logisticsTraceDetailList]
                                                        .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
                                                        .map((item, index, sortedList) => (
                                                        <div key={`${expressInfo.mailNo ?? expressIndex}-${item.timeDesc ?? item.time ?? index}`} className="flex gap-3">
                                                            <div className="flex w-4 flex-col items-center">
                                                                <span className={cn(
                                                                    'mt-1 h-2.5 w-2.5 rounded-full',
                                                                    index === 0 ? 'bg-primary' : 'bg-muted-foreground/30',
                                                                )} />
                                                                {index !== sortedList.length - 1 && (
                                                                    <span className="mt-1 w-px flex-1 bg-border" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 pb-5">
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                    <span className={cn(
                                                                        'text-sm font-medium',
                                                                        index === 0 ? 'text-foreground' : 'text-muted-foreground',
                                                                    )}>
                                                                        {item.desc || item.logisticsStatusText || item.subLogisticsStatusText || '暂无轨迹描述'}
                                                                    </span>
                                                                    {item.logisticsStatusText && (
                                                                        <span className="rounded bg-muted text-muted-foreground px-2 py-0.5 text-[11px] text-muted-foreground">
                                                                            {item.logisticsStatusText}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {formatLogisticsTimestamp(item.time, item.timeDesc)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed bg-muted/20 py-6 text-center text-sm text-muted-foreground">
                                                    暂无完整物流轨迹
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
                                    暂无完整物流轨迹
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Batch bind */}
            <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-4 sm:max-w-4xl sm:p-6">
                    <DialogHeader><DialogTitle>批量绑定记录</DialogTitle><DialogDescription className="sr-only">选择要绑定到此订单的使用记录</DialogDescription></DialogHeader>
                    <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                    <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                            <Input placeholder="搜索任务标题" value={unboundSearch} onChange={e => setUnboundSearch(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { const p = { ...unboundPag, current: 1 }; setUnboundPag(p); fetchUnbound(p, unboundSearch) } }} className="h-9 min-w-0 flex-1" />
                            <Button size="sm" onClick={() => { const p = { ...unboundPag, current: 1 }; setUnboundPag(p); fetchUnbound(p, unboundSearch) }} className="h-9 w-9 shrink-0 cursor-pointer px-0"><Search size={14} /></Button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-muted-foreground">已选择 {selectedIds.length} 条记录</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-full px-2 text-xs cursor-pointer sm:w-auto"
                                disabled={currentPageRecordIds.length === 0}
                                onClick={toggleSelectCurrentPage}
                            >
                                {isCurrentPageAllSelected ? '取消当前页全选' : '当前页全选'}
                            </Button>
                        </div>
                        {isMobile ? (
                            <div className="space-y-2">
                                {batchLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="rounded-xl border border-border p-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-32" />
                                            </div>
                                        </div>
                                    ))
                                ) : unboundRecords.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                                        暂无未绑定的记录
                                    </div>
                                ) : (
                                    unboundRecords.map((r) => {
                                        const isSelected = r.id != null && selectedIds.includes(r.id)
                                        return (
                                            <div
                                                key={r.id}
                                                className={cn(
                                                    'cursor-pointer rounded-xl border p-4 transition-colors',
                                                    isSelected
                                                        ? 'border-primary/40 bg-primary/[0.06] dark:bg-primary/[0.12]'
                                                        : 'border-border bg-background hover:bg-muted/20',
                                                )}
                                                onClick={() => r.id != null && toggleId(r.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => r.id != null && toggleId(r.id)}
                                                        className="mt-0.5 cursor-pointer dark:data-[state=checked]:text-white"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="min-w-0 truncate font-medium text-foreground">{r.title || '-'}</span>
                                                            <span className="shrink-0 rounded bg-muted text-muted-foreground px-2 py-0.5 text-xs">{r.statusText || '-'}</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span>设备: <span className="text-foreground">{r.deviceName || '-'}</span></span>
                                                            <span>实际: <span className="font-semibold text-foreground">{r.actualWeight ? `${r.actualWeight}g` : '-'}</span></span>
                                                        </div>
                                                        <div className="space-y-0.5 text-xs text-muted-foreground">
                                                            {r.startTime && <div><span className="text-blue-500">开始: </span><FormattedTime time={r.startTime} /></div>}
                                                            {r.endTime && <div><span className="text-emerald-500">结束: </span><FormattedTime time={r.endTime} /></div>}
                                                            {!r.startTime && !r.endTime && <div>-</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <Table>
                                    <TableHeader><TableRow className="border-b hover:bg-transparent bg-muted/30">
                                        <TableHead className="px-3 py-2 text-left text-xs font-semibold w-10"></TableHead>
                                        {['任务标题', '设备', '实际重量', '状态', '时间'].map(h => <TableHead key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</TableHead>)}
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {batchLoading ? (
                                            Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-b hover:bg-transparent"><TableCell colSpan={6} className="px-3 py-2"><Skeleton className="h-4 w-full" /></TableCell></TableRow>)
                                        ) : unboundRecords.length === 0 ? (
                                            <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="px-3 py-6 text-center text-muted-foreground">暂无未绑定的记录</TableCell></TableRow>
                                        ) : unboundRecords.map(r => (
                                            <TableRow
                                                key={r.id}
                                                className={cn(
                                                    "cursor-pointer border-b transition-colors hover:bg-muted/40",
                                                    selectedIds.includes(r.id!) && "bg-primary/[0.06] dark:bg-primary/[0.12]"
                                                )}
                                                onClick={() => toggleId(r.id!)}
                                            >
                                                <TableCell className="px-3 py-2">
                                                    <Checkbox
                                                        checked={selectedIds.includes(r.id!)}
                                                        onCheckedChange={() => toggleId(r.id!)}
                                                        className="cursor-pointer dark:data-[state=checked]:text-white"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                                <TableCell className="max-w-[150px] truncate px-3 py-2">{r.title || '-'}</TableCell>
                                                <TableCell className="max-w-[120px] truncate px-3 py-2">{r.deviceName || '-'}</TableCell>
                                                <TableCell className="px-3 py-2">{r.actualWeight ? `${r.actualWeight}g` : '-'}</TableCell>
                                                <TableCell className="px-3 py-2"><span className="rounded bg-muted text-muted-foreground px-2 py-0.5 text-xs">{r.statusText || '-'}</span></TableCell>
                                                <TableCell className="px-3 py-2 text-xs">
                                                    <div className="space-y-0.5">
                                                        {r.startTime && <div><span className="text-blue-500">开始: </span><FormattedTime time={r.startTime} /></div>}
                                                        {r.endTime && <div><span className="text-emerald-500">结束: </span><FormattedTime time={r.endTime} /></div>}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {unboundPag.total > 0 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-xs text-muted-foreground">共 {unboundPag.total} 条</span>
                                <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                                    <Select value={String(unboundPag.pageSize)} onValueChange={(value) => handleUnboundPageSizeChange(Number(value))}>
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
                                    <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" disabled={unboundPag.current <= 1}
                                        onClick={() => { const p = { ...unboundPag, current: unboundPag.current - 1 }; setUnboundPag(p); fetchUnbound(p, unboundSearch) }}><ChevronLeft size={12} /></Button>
                                    <span className="text-xs">{unboundPag.current}/{unboundPages}</span>
                                    <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" disabled={unboundPag.current >= unboundPages}
                                        onClick={() => { const p = { ...unboundPag, current: unboundPag.current + 1 }; setUnboundPag(p); fetchUnbound(p, unboundSearch) }}><ChevronRight size={12} /></Button>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                    <DialogFooter className="border-t border-border bg-background pt-3">
                        <Button variant="outline" onClick={() => setBatchOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleBatchBind} disabled={batchLoading || selectedIds.length === 0} className="cursor-pointer">
                            {batchLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 绑定 ({selectedIds.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quantity Adjust */}
            <Dialog open={quantityAdjustOpen} onOpenChange={setQuantityAdjustOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{quantityAdjustOperation === 'INBOUND' ? '订单入库' : '订单出库'}</DialogTitle>
                        <DialogDescription>
                            {quantityAdjustOperation === 'INBOUND' ? '填写本次入库数量。' : '填写本次出库数量和单价。'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="adjust-quantity">数量</Label>
                            <DecimalInput
                                id="adjust-quantity"
                                min={0}
                                step={1}
                                value={quantityAdjustForm.quantity ?? ''}
                                onValueChange={(value) => setQuantityAdjustForm((prev) => ({ ...prev, quantity: value }))}
                                placeholder="请输入数量"
                                disabled={quantityAdjustLoading}
                            />
                        </div>
                        {quantityAdjustOperation === 'OUTBOUND' && (
                            <div className="space-y-2">
                                <Label htmlFor="adjust-unit-price">单价</Label>
                                <DecimalInput
                                    id="adjust-unit-price"
                                    min={0}
                                    step={0.01}
                                    value={quantityAdjustForm.unitPrice ?? ''}
                                    onValueChange={(value) => setQuantityAdjustForm((prev) => ({ ...prev, unitPrice: value }))}
                                    placeholder="请输入单价"
                                    disabled={quantityAdjustLoading}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQuantityAdjustOpen(false)} disabled={quantityAdjustLoading} className="cursor-pointer">
                            取消
                        </Button>
                        <Button onClick={handleQuantityAdjustSubmit} disabled={quantityAdjustLoading} className="cursor-pointer">
                            {quantityAdjustLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Asset */}
            <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>添加{assetType === 'image' ? '图片' : '模型'}</DialogTitle>
                        <DialogDescription className="sr-only">添加资源链接</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>资源链接 <span className="text-destructive">*</span></Label>
                            <Input placeholder="输入以 http 或 https 开头的链接" value={assetForm.url} onChange={e => setAssetForm({ url: e.target.value })} />
                        </div>
                        {isIntranet && (
                            <div className="space-y-2 pt-2 border-t border-border border-dashed mt-4">
                                <Label className="text-xs text-muted-foreground block mb-2">或上传本地文件</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" onChange={handleFileUpload} className="cursor-pointer file:cursor-pointer pb-2" accept={assetType === 'image' ? "image/*" : undefined} disabled={assetLoading} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssetOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleSaveAsset} disabled={assetLoading || !assetForm.url} className="cursor-pointer">
                            {assetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Record detail modal ── */}
            <Dialog open={recordDetailOpen} onOpenChange={setRecordDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>记录详情</DialogTitle>
                        <DialogDescription className="sr-only">查看记录详情</DialogDescription>
                    </DialogHeader>
                    {recordDetailRecord && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">任务ID：</span>{recordDetailRecord.taskId ?? '-'}</div>
                                <div><span className="text-muted-foreground">状态：</span>{recordDetailRecord.statusText ?? '-'}</div>
                            </div>
                            <div><span className="text-muted-foreground">设备：</span>{recordDetailRecord.deviceName || '-'}</div>
                            <div><span className="text-muted-foreground">任务标题：</span><span className="font-medium">{recordDetailRecord.title || '-'}</span></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">任务重量：</span>{recordDetailRecord.taskWeight ?? '-'}g</div>
                                <div><span className="text-muted-foreground">实际重量：</span><span className="font-semibold">{recordDetailRecord.actualWeight ?? '-'}g</span></div>
                            </div>
                            {recordDetailRecord.startTime && <div><span className="text-muted-foreground">开始时间：</span><FormattedTime time={recordDetailRecord.startTime} /></div>}
                            {recordDetailRecord.endTime && <div><span className="text-muted-foreground">结束时间：</span><FormattedTime time={recordDetailRecord.endTime} /></div>}
                            {recordDetailRecord.coverUrl && (
                                <div>
                                    <span className="text-muted-foreground">封面：</span>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <img
                                                src={recordDetailRecord.coverUrl}
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
                                                src={recordDetailRecord.coverUrl}
                                                alt="封面大图"
                                                className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
