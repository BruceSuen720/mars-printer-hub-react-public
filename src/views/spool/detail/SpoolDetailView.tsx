import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import {
    ArrowLeft,
    Edit,
    Copy,
    Download,
    Crosshair,
    FlaskConical,
    Loader2,
    ImageIcon,
    ArrowRightLeft,
    Link2,
    CheckCircle2,
    ScanLine,
    Info,
    Scale,
    Clock,
    Gauge,
    QrCode,
    History,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getSpool, useSpool as applySpoolUsage, getAllAvailableSpools } from '@/api/spool'
import { listSpoolUsedRecordBySpoolId, listSpoolUsedSnapshot, transferSpoolUsedRecord } from '@/api/record'
import { bindSlotSpool, getCompleteInfo, listPrinters } from '@/api/device'
import { FormattedTime } from '@/components/ui/formatted-time'
import { showRequestError } from '@/request'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Combobox } from '@/components/ui/combobox'
import AddSpoolModal from '@/components/spool/AddSpoolModal'
import CalibrateModal from '@/components/spool/CalibrateModal'
import { SpoolAppearanceTag } from '@/components/spool/SpoolAppearanceTag'
import HomeScanDialog from '@/components/home/HomeScanDialog'
import { useSpoolCalibration } from '@/hooks/useSpoolCalibration'
import { cn } from '@/lib/utils'

/* ── Card style (matches home / summary / system-config pages) ── */
const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

/* ── Section card with icon + title header ── */
function SectionCard({
    icon: Icon,
    title,
    action,
    children,
    contentClassName,
}: {
    icon: LucideIcon
    title: string
    action?: React.ReactNode
    children: React.ReactNode
    contentClassName?: string
}) {
    return (
        <section className={cardBase}>
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Icon size={14} className="shrink-0 text-primary/70" />
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
                </div>
                {action}
            </header>
            <div className={cn('p-5', contentClassName)}>{children}</div>
        </section>
    )
}

/* ── Circular Progress ── */
function CircularProgress({ percentage, color, size = 160 }: { percentage: number; color: string; size?: number }) {
    const r = (size - 16) / 2
    const circumference = 2 * Math.PI * r
    const offset = circumference - (percentage / 100) * circumference

    return (
        <svg width={size} height={size} className="mx-auto">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={8}
                className="text-border"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-500"
            />
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground text-2xl font-semibold tabular-nums"
            >
                {percentage}%
            </text>
        </svg>
    )
}

/* ── Info row (label / value) ── */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate text-right text-sm text-foreground">{children}</span>
        </div>
    )
}

/* ── Stat card ── */
function StatCard({ label, value, suffix, accent }: { label: string; value: number; suffix: string; accent?: string }) {
    return (
        <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background/40 px-3 py-3">
            {accent && (
                <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }}
                />
            )}
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums text-foreground">
                {value}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span>
            </div>
        </div>
    )
}

const getSlotDisplayName = (amsNo?: number, slotNo?: number) => {
    if (slotNo === undefined) return '-'
    if (amsNo === 254 || amsNo === 255) return '外挂'
    if (amsNo !== undefined && amsNo >= 0 && amsNo <= 3) return `${String.fromCharCode(65 + amsNo)}${slotNo + 1}`
    if (amsNo !== undefined && amsNo >= 128 && amsNo <= 136) return `${String.fromCharCode(65 + amsNo - 128)}${slotNo + 1}`
    return `S${slotNo + 1}`
}

export default function SpoolDetailView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const spoolId = Number(id)
    const backTo = typeof location.state?.from === 'string' ? location.state.from : '/spool/manage'
    const isMobile = useDeviceStore((s) => s.isMobile)
    const qrCodeCardRef = useRef<HTMLDivElement | null>(null)

    /* ── State ── */
    const [spool, setSpool] = useState<API.SpoolVO | null>(null)
    const [records, setRecords] = useState<API.SpoolUsedRecordVO[]>([])
    const [loading, setLoading] = useState(true)

    /* ── Use modal ── */
    const [useOpen, setUseOpen] = useState(false)
    const [useLoading, setUseLoading] = useState(false)
    const [useWeight, setUseWeight] = useState<number | undefined>()

    /* ── Edit modal ── */
    const [editOpen, setEditOpen] = useState(false)
    const [editMode, setEditMode] = useState<'edit' | 'clone'>('edit')

    /* ── Transfer modal ── */
    const [transferOpen, setTransferOpen] = useState(false)
    const [transferLoading, setTransferLoading] = useState(false)
    const [transferRecord, setTransferRecord] = useState<API.SpoolUsedRecordVO | null>(null)
    const [availableSpools, setAvailableSpools] = useState<API.SpoolVO[]>([])
    const [selectedTransferSpoolId, setSelectedTransferSpoolId] = useState<number | undefined>()

    /* ── Snapshot modal ── */
    const [snapshotOpen, setSnapshotOpen] = useState(false)
    const [snapshotLoading, setSnapshotLoading] = useState(false)
    const [snapshots, setSnapshots] = useState<API.SpoolUsedSnapshots[]>([])

    /* ── Quick bind modal ── */
    const [quickBindOpen, setQuickBindOpen] = useState(false)
    const [quickBindPrintersLoading, setQuickBindPrintersLoading] = useState(false)
    const [quickBindSlotsLoading, setQuickBindSlotsLoading] = useState(false)
    const [quickBindSubmittingKey, setQuickBindSubmittingKey] = useState<string | null>(null)
    const [quickBindPrinters, setQuickBindPrinters] = useState<API.DeviceSimpleVO[]>([])
    const [quickBindPrinterId, setQuickBindPrinterId] = useState('')
    const [quickBindDeviceInfo, setQuickBindDeviceInfo] = useState<API.DeviceCompleteVO | null>(null)
    const [overwriteTarget, setOverwriteTarget] = useState<{ ams: API.AmsVO; slot: API.AmsSlotsVO } | null>(null)
    const [slotScanOpen, setSlotScanOpen] = useState(false)

    /* ── Record detail modal ── */
    const [recordDetailOpen, setRecordDetailOpen] = useState(false)
    const [recordDetailRecord, setRecordDetailRecord] = useState<API.SpoolUsedRecordVO | null>(null)
    const showRecordDetail = useCallback((record: API.SpoolUsedRecordVO) => {
        setRecordDetailRecord(record)
        setRecordDetailOpen(true)
    }, [])

    /* ── Fetchers ── */
    const fetchDetail = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getSpool({ id: spoolId })
            if (res.data?.data) setSpool(res.data.data)
        } catch (error) {
            showRequestError(error, '获取耗材详情失败')
        } finally {
            setLoading(false)
        }
    }, [spoolId])

    const fetchHistory = useCallback(async () => {
        try {
            const res = await listSpoolUsedRecordBySpoolId({ spoolId })
            if (res.data?.data) setRecords(res.data.data)
        } catch (error) {
            showRequestError(error, '获取使用历史失败')
        }
    }, [spoolId])

    useEffect(() => {
        fetchDetail()
        fetchHistory()
    }, [fetchDetail, fetchHistory])

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
        onSuccess: async () => {
            await fetchDetail()
            await fetchHistory()
        },
    })

    /* ── Helpers ── */
    const getRemainingColor = (pct: number) => {
        if (pct > 70) return '#52c41a'
        if (pct > 30) return '#faad14'
        return '#f5222d'
    }

    const isLightHex = (hex: string) => {
        if (!/^#[0-9A-F]{6}$/i.test(hex)) return false
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return (r * 299 + g * 587 + b * 114) / 1000 > 128
    }

    const colorTagStyle = (color?: string) => {
        if (!color) return {}
        return isLightHex(color) ? { color: '#000', border: '1px solid #d9d9d9' } : { color: '#fff' }
    }

    const getSpoolCost = (record: API.SpoolUsedRecordVO) => {
        const s = record.spoolVO
        if (s?.price && s?.netWeight && record.actualWeight) {
            return `¥${((record.actualWeight / s.netWeight) * s.price).toFixed(2)}`
        }
        return '¥0.00'
    }

    const pct = spool?.remainingPercentage ?? 100
    const detailUrl = useMemo(
        () => `${location.pathname}${location.search}${location.hash}`,
        [location.hash, location.pathname, location.search]
    )
    const quickBindPrinterOptions = useMemo(
        () => quickBindPrinters.map((printer) => ({
            label: printer.name || `设备-${printer.id}`,
            value: String(printer.id),
        })),
        [quickBindPrinters]
    )
    const quickBindAmsList = useMemo(() => quickBindDeviceInfo?.amsList ?? [], [quickBindDeviceInfo])

    /* ── Use spool handler ── */
    const handleUse = useCallback(async () => {
        if (!useWeight || useWeight <= 0) { toast.warning('请输入使用重量'); return }
        setUseLoading(true)
        try {
            await applySpoolUsage({ spoolId, usedWeight: useWeight })
            toast.success('使用耗材成功')
            setUseOpen(false)
            setUseWeight(undefined)
            fetchDetail()
            fetchHistory()
        } catch (error) {
            showRequestError(error, '使用耗材失败')
        } finally {
            setUseLoading(false)
        }
    }, [useWeight, spoolId, fetchDetail, fetchHistory])

    /* ── Transfer handler ── */
    const handleTransfer = useCallback(async () => {
        if (!selectedTransferSpoolId || !transferRecord?.id) { toast.warning('请选择要转移到的耗材'); return }
        setTransferLoading(true)
        try {
            await transferSpoolUsedRecord({ id: transferRecord.id, newSpoolId: selectedTransferSpoolId })
            toast.success('转移成功')
            setTransferOpen(false)
            fetchDetail()
            fetchHistory()
        } catch (error) {
            showRequestError(error, '转移失败')
        } finally {
            setTransferLoading(false)
        }
    }, [selectedTransferSpoolId, transferRecord, fetchDetail, fetchHistory])

    /* ── Show modals ── */
    const openUse = () => { setUseWeight(undefined); setUseOpen(true) }
    const openCalibrate = () => {
        if (!spool) return
        openCalibrateModal(spool)
    }
    const openEdit = () => {
        if (!spool) return
        setEditMode('edit')
        setEditOpen(true)
    }
    const openClone = () => {
        if (!spool) return
        setEditMode('clone')
        setEditOpen(true)
    }
    const openTransfer = async (record: API.SpoolUsedRecordVO) => {
        setTransferRecord(record)
        setSelectedTransferSpoolId(undefined)
        setTransferOpen(true)
        try {
            const res = await getAllAvailableSpools()
            setAvailableSpools(res.data?.data ?? [])
        } catch (error) { showRequestError(error, '获取可用耗材列表失败') }
    }
    const openSnapshot = async (record: API.SpoolUsedRecordVO) => {
        setSnapshotOpen(true)
        setSnapshotLoading(true)
        try {
            const res = await listSpoolUsedSnapshot({ recordId: record.id! })
            setSnapshots(res.data?.data ?? [])
        } catch (error) { showRequestError(error, '获取快照失败') }
        finally { setSnapshotLoading(false) }
    }

    const handleDownloadQrCode = useCallback(async () => {
        const cardEl = qrCodeCardRef.current
        if (!cardEl || !spool?.id) {
            toast.error('二维码尚未准备完成')
            return
        }

        try {
            const { toPng } = await import('html-to-image')
            const dataUrl = await toPng(cardEl, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            })

            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `spool-${spool.id}-qrcode.png`
            link.click()

            toast.success('二维码已开始下载')
        } catch (error) {
            showRequestError(error, '下载二维码失败')
        }
    }, [spool?.id])

    const loadQuickBindSlots = useCallback(async (printerId: number) => {
        setQuickBindSlotsLoading(true)
        try {
            const res = await getCompleteInfo({ deviceId: printerId })
            setQuickBindDeviceInfo(res.data?.data ?? { amsList: [], mqttConnectStatus: 0, lastUpdateTime: Date.now() })
        } catch (error) {
            setQuickBindDeviceInfo({ amsList: [], mqttConnectStatus: 0, lastUpdateTime: Date.now() })
            showRequestError(error, '获取设备槽位失败')
        } finally {
            setQuickBindSlotsLoading(false)
        }
    }, [])

    const openQuickBindModal = useCallback(async () => {
        if (!spool?.id) return

        setQuickBindPrintersLoading(true)
        try {
            const printersRes = await listPrinters()
            const printers = printersRes.data?.data ?? []
            setQuickBindPrinters(printers)
            setQuickBindDeviceInfo(null)
            setQuickBindOpen(true)

            const firstPrinterId = printers[0]?.id
            if (firstPrinterId != null) {
                setQuickBindPrinterId(String(firstPrinterId))
                await loadQuickBindSlots(firstPrinterId)
            } else {
                setQuickBindPrinterId('')
            }
        } catch (error) {
            showRequestError(error, '加载设备列表失败')
        } finally {
            setQuickBindPrintersLoading(false)
        }
    }, [loadQuickBindSlots, spool?.id])

    const handleQuickBindPrinterChange = useCallback(async (value: string) => {
        setQuickBindPrinterId(value)
        setQuickBindDeviceInfo(null)

        const printerId = Number(value)
        if (!printerId) return

        await loadQuickBindSlots(printerId)
    }, [loadQuickBindSlots])

    const handleQuickBindSlot = useCallback(async (ams: API.AmsVO, slot: API.AmsSlotsVO) => {
        if (!spool?.id || !slot.amsId || slot.slotNo == null) {
            toast.error('当前槽位信息不完整，无法绑定')
            return
        }

        const slotKey = `${slot.amsId}-${slot.slotNo}`
        setQuickBindSubmittingKey(slotKey)
        try {
            const payload: API.AmsBindRequest = {
                amsId: slot.amsId,
                slotNo: slot.slotNo,
                spoolId: spool.id,
                syncUpdateDevice: false,
            }
            if (slot.trayInfoIdx) {
                payload.trayInfoIdx = slot.trayInfoIdx
            }

            await bindSlotSpool(payload)

            toast.success(`已绑定到 ${ams.amsName || 'AMS'} ${getSlotDisplayName(ams.amsNo, slot.slotNo)}`)
            setQuickBindOpen(false)
            if (quickBindPrinterId) {
                await loadQuickBindSlots(Number(quickBindPrinterId))
            }
            await fetchDetail()
        } catch (error) {
            showRequestError(error, '绑定失败')
        } finally {
            setQuickBindSubmittingKey(null)
        }
    }, [fetchDetail, loadQuickBindSlots, quickBindPrinterId, spool?.id])

    const handleQuickBindSlotClick = useCallback((ams: API.AmsVO, slot: API.AmsSlotsVO) => {
        if (slot.spoolId) {
            setOverwriteTarget({ ams, slot })
            return
        }

        void handleQuickBindSlot(ams, slot)
    }, [handleQuickBindSlot])

    const handleScannedSlotBind = useCallback(async (rawText: string) => {
        const text = rawText.trim()
        if (!text) {
            toast.error('未识别到二维码内容')
            return
        }
        let amsId: number | null = null
        let slotNo: number | null = null

        const extractFromUrl = (value: URL) => {
            const pathMatched = value.pathname === '/ams/slot'
            if (!pathMatched) return
            const nextAmsId = Number(value.searchParams.get('amsId'))
            const nextSlotNo = Number(value.searchParams.get('slotNo'))
            if (!Number.isNaN(nextAmsId) && !Number.isNaN(nextSlotNo)) {
                amsId = nextAmsId
                slotNo = nextSlotNo
            }
        }

        try {
            if (text.startsWith('/')) {
                extractFromUrl(new URL(text, window.location.origin))
            } else {
                extractFromUrl(new URL(text))
            }
        } catch {
            amsId = null
            slotNo = null
        }

        if (amsId == null || slotNo == null) {
            toast.error('这不是有效的槽位二维码')
            return
        }

        const printersRes = await listPrinters()
        const printers = printersRes.data?.data ?? []

        for (const printer of printers) {
            if (printer.id == null) continue

            try {
                const detailRes = await getCompleteInfo({ deviceId: printer.id })
                const deviceInfo = detailRes.data?.data
                const matchedAms = deviceInfo?.amsList?.find((item) => Number(item.id) === amsId)
                const matchedSlot = matchedAms?.slots?.find((item) => Number(item.slotNo) === slotNo)

                if (!matchedAms || !matchedSlot || !matchedSlot.amsId || matchedSlot.slotNo == null) {
                    continue
                }

                setQuickBindOpen(false)
                setSlotScanOpen(false)

                if (matchedSlot.spoolId) {
                    setOverwriteTarget({ ams: matchedAms, slot: matchedSlot })
                    return
                }

                await handleQuickBindSlot(matchedAms, matchedSlot)
                return
            } catch {
                // Keep trying other printers until a matching slot is found.
            }
        }

        toast.error('未找到对应的 AMS 槽位')
    }, [handleQuickBindSlot])


    /* ── Loading skeleton ── */
    if (loading && !spool) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="h-8 w-8 cursor-pointer">
                    <ArrowLeft size={18} />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">耗材详情</h1>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">
                    #{spool?.id}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* ── Left: Detail cards ── */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Basic info */}
                    <SectionCard icon={Info} title="基本信息">
                        <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                            <InfoRow label="名称">
                                <span className="font-medium text-foreground">{spool?.name || '-'}</span>
                            </InfoRow>
                            <InfoRow label="ID">
                                <span className="font-mono text-muted-foreground">#{spool?.id}</span>
                            </InfoRow>
                            <InfoRow label="类型">
                                {spool?.materialType ? (
                                    <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs text-sky-600 dark:text-sky-400">
                                        {spool.materialType}
                                    </span>
                                ) : '-'}
                            </InfoRow>
                            <InfoRow label="品牌">
                                {spool?.brand ? (
                                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                                        {spool.brand}
                                    </span>
                                ) : '-'}
                            </InfoRow>
                            <InfoRow label="价格">
                                {spool?.price != null ? (
                                    <span className="tabular-nums">¥{spool.price.toFixed(2)}</span>
                                ) : '-'}
                            </InfoRow>
                            <InfoRow label="颜色">
                                {spool?.color ? (
                                    <span
                                        className="inline-block rounded px-2 py-0.5 font-mono text-xs"
                                        style={{ backgroundColor: spool.color, ...colorTagStyle(spool.color) }}
                                    >
                                        {spool.color}
                                    </span>
                                ) : '-'}
                            </InfoRow>
                            <InfoRow label="外观">
                                <SpoolAppearanceTag appearanceId={spool?.appearance} />
                            </InfoRow>
                            <InfoRow label="备注">
                                <span className="text-muted-foreground">{spool?.remark || '-'}</span>
                            </InfoRow>
                        </div>
                    </SectionCard>

                    {/* Weight stats */}
                    <SectionCard icon={Scale} title="重量信息">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatCard label="耗材净重" value={spool?.netWeight ?? 0} suffix="g" />
                            <StatCard label="料盘重量" value={spool?.spoolWeight ?? 0} suffix="g" />
                            <StatCard label="已用重量" value={spool?.usedWeight ?? 0} suffix="g" />
                            <StatCard
                                label="剩余重量"
                                value={spool?.remainingWeight ?? (spool?.netWeight ? spool.netWeight - (spool.usedWeight ?? 0) : 0)}
                                suffix="g"
                            />
                        </div>
                    </SectionCard>

                    {/* Time info */}
                    <SectionCard icon={Clock} title="时间信息">
                        <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                            <InfoRow label="创建时间">{spool?.createTime ? <FormattedTime time={spool.createTime} /> : <span className="text-muted-foreground">未记录</span>}</InfoRow>
                            <InfoRow label="更新时间">{spool?.updateTime ? <FormattedTime time={spool.updateTime} /> : <span className="text-muted-foreground">未记录</span>}</InfoRow>
                            <InfoRow label="首次使用">{spool?.firstUsedTime ? <FormattedTime time={spool.firstUsedTime} /> : <span className="text-muted-foreground">未使用</span>}</InfoRow>
                            <InfoRow label="最后使用">{spool?.lastUsedTime ? <FormattedTime time={spool.lastUsedTime} /> : <span className="text-muted-foreground">未使用</span>}</InfoRow>
                        </div>
                    </SectionCard>
                </div>

                {/* ── Right: Progress + actions ── */}
                <div className="space-y-6">
                    <SectionCard icon={Gauge} title="剩余百分比">
                        <CircularProgress percentage={pct} color={getRemainingColor(pct)} />
                        <div className="mt-6 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={openUse} disabled={!spool || pct === 0} className="cursor-pointer">
                                    <FlaskConical size={14} /> 使用
                                </Button>
                                <Button variant="outline" onClick={openCalibrate} disabled={!spool} className="cursor-pointer">
                                    <Crosshair size={14} /> 校准
                                </Button>
                                <Button variant="outline" onClick={openClone} disabled={!spool} className="cursor-pointer">
                                    <Copy size={14} /> 克隆
                                </Button>
                                <Button variant="outline" onClick={openEdit} disabled={!spool} className="cursor-pointer">
                                    <Edit size={14} /> 编辑
                                </Button>
                            </div>
                            <Button variant="outline" onClick={openQuickBindModal} disabled={!spool} className="w-full cursor-pointer">
                                <Link2 size={14} /> 快速绑定 AMS
                            </Button>
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={QrCode}
                        title="详情二维码"
                        action={
                            <Button variant="ghost" size="sm" onClick={handleDownloadQrCode} className="h-7 cursor-pointer text-xs">
                                <Download size={13} /> 下载
                            </Button>
                        }
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div ref={qrCodeCardRef} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-border/60">
                                <p className="mb-3 text-center text-xs font-medium text-slate-900">
                                    耗材 #{spool?.id ?? '-'}
                                </p>
                                <QRCodeSVG value={detailUrl} size={172} marginSize={3} includeMargin />
                            </div>
                            <p className="text-center text-xs leading-5 text-muted-foreground">
                                扫码可直接打开当前耗材详情页
                            </p>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* ── History ── */}
            {isMobile ? (
                /* ── Mobile: card list ── */
                <SectionCard icon={History} title="使用历史" contentClassName="p-4">
                    {records.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">暂无使用记录</div>
                    ) : (
                        <div className="space-y-2">
                            {records.map((r) => (
                                <div
                                    key={r.id}
                                    className="cursor-pointer rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-border hover:bg-muted/40 active:bg-muted/60"
                                    onClick={() => showRecordDetail(r)}
                                >
                                    {/* Row 1: Title + status */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-foreground">{r.title || '未知任务'}</span>
                                        <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{r.statusText || '未知'}</span>
                                    </div>
                                    {/* Row 2: Weight info */}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>设备 <span className="text-foreground">{r.deviceName || '-'}</span></span>
                                        <span>任务 <span className="text-foreground tabular-nums">{r.taskWeight != null ? `${r.taskWeight}g` : '-'}</span></span>
                                        <span>实际 <span className="text-foreground tabular-nums">{r.actualWeight != null ? `${r.actualWeight}g` : '-'}</span></span>
                                        <span>成本 <span className="text-foreground tabular-nums">{getSpoolCost(r)}</span></span>
                                    </div>
                                    {/* Row 3: Actions */}
                                    <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => openSnapshot(r)}>
                                            <ImageIcon size={12} /> 快照
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => openTransfer(r)}>
                                            <ArrowRightLeft size={12} /> 纠错
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            ) : (
                /* ── Desktop: table ── */
                <SectionCard icon={History} title="使用历史" contentClassName="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b hover:bg-transparent">
                                    {['任务标题', '使用设备', '任务重量', '实际重量', '耗材成本', '任务状态', '操作'].map((h) => (
                                        <TableHead key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={7} className="h-24 px-5 py-12 text-center text-sm text-muted-foreground">暂无使用记录</TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((r) => (
                                        <TableRow key={r.id} className="cursor-pointer border-b transition-colors hover:bg-muted/40" onClick={() => showRecordDetail(r)}>
                                            <TableCell className="max-w-[220px] truncate px-5 py-3 font-medium text-foreground">{r.title || '未知任务'}</TableCell>
                                            <TableCell className="max-w-[140px] truncate px-5 py-3 text-foreground">{r.deviceName || '-'}</TableCell>
                                            <TableCell className="px-5 py-3 tabular-nums text-foreground">{r.taskWeight != null ? `${r.taskWeight}g` : '-'}</TableCell>
                                            <TableCell className="px-5 py-3 tabular-nums text-foreground">{r.actualWeight != null ? `${r.actualWeight}g` : '-'}</TableCell>
                                            <TableCell className="px-5 py-3 tabular-nums text-foreground">{getSpoolCost(r)}</TableCell>
                                            <TableCell className="px-5 py-3">
                                                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.statusText || '未知'}</span>
                                            </TableCell>
                                            <TableCell className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => openSnapshot(r)}>
                                                        <ImageIcon size={12} /> 快照
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => openTransfer(r)}>
                                                        <ArrowRightLeft size={12} /> 纠错
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </SectionCard>
            )}

            {/* ═══ MODALS ═══ */}
            <Dialog open={quickBindOpen} onOpenChange={setQuickBindOpen}>
                <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>快速绑定 AMS</DialogTitle>
                        <DialogDescription>
                            为当前耗材选择设备和空槽位，点击槽位后会立即完成绑定。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <div className="rounded-xl border bg-card/40 p-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                <span className="text-muted-foreground">当前耗材</span>
                                <span className="font-medium text-foreground">
                                    #{spool?.id} {spool?.name || '未命名耗材'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label>选择设备</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSlotScanOpen(true)}
                                    className="cursor-pointer"
                                >
                                    <ScanLine size={14} className="mr-1" /> 二维码
                                </Button>
                            </div>
                            <Combobox
                                options={quickBindPrinterOptions}
                                value={quickBindPrinterId}
                                onChange={(value) => void handleQuickBindPrinterChange(value || '')}
                                placeholder={quickBindPrintersLoading ? '正在加载设备...' : '请选择设备'}
                                searchPlaceholder="搜索设备"
                                emptyText="暂无设备"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>选择空槽位</Label>
                                {quickBindSlotsLoading && (
                                    <span className="inline-flex items-center text-xs text-muted-foreground">
                                        <Loader2 size={12} className="mr-1 animate-spin" /> 正在加载槽位
                                    </span>
                                )}
                            </div>

                            {!quickBindPrinterId ? (
                                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    请先选择设备
                                </div>
                            ) : quickBindAmsList.length === 0 && !quickBindSlotsLoading ? (
                                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    当前设备暂无 AMS 信息
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {quickBindAmsList.map((ams) => (
                                        <div key={ams.id ?? ams.amsNo} className="rounded-2xl border bg-card/30 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-foreground">{ams.amsName || 'AMS'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                {ams.slots?.map((slot) => {
                                                    const occupied = Boolean(slot.spoolId)
                                                    const slotKey = `${slot.amsId}-${slot.slotNo}`
                                                    const isSubmitting = quickBindSubmittingKey === slotKey

                                                    return (
                                                        <button
                                                            key={slotKey}
                                                            type="button"
                                                            disabled={Boolean(quickBindSubmittingKey)}
                                                            onClick={() => handleQuickBindSlotClick(ams, slot)}
                                                            className={`rounded-xl border p-3 text-left transition ${
                                                                occupied
                                                                    ? 'cursor-pointer border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/60 dark:border-amber-900/50 dark:bg-amber-950/20'
                                                                    : 'cursor-pointer border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold text-foreground">
                                                                    {getSlotDisplayName(ams.amsNo, slot.slotNo)}
                                                                </span>
                                                                {isSubmitting ? (
                                                                    <Loader2 size={14} className="animate-spin text-primary" />
                                                                ) : occupied ? (
                                                                    <span className="text-xs text-amber-600 dark:text-amber-400">将覆盖</span>
                                                                ) : (
                                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                                )}
                                                            </div>
                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                {occupied
                                                                    ? [slot.spool?.id ? `#${slot.spool.id}` : '', slot.spool?.name || '已绑定耗材'].filter(Boolean).join(' ')
                                                                    : '点击绑定到该槽位'}
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(overwriteTarget)} onOpenChange={(open) => !open && setOverwriteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认覆盖绑定？</AlertDialogTitle>
                        <AlertDialogDescription>
                            {overwriteTarget
                                ? `该槽位当前已绑定耗材 ${overwriteTarget.slot.spool?.name || '未命名耗材'}。继续后，将改为绑定当前耗材 ${spool?.name || `#${spool?.id}` }。`
                                : '继续后将覆盖该槽位当前绑定的耗材。'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOverwriteTarget(null)} className="cursor-pointer">
                            取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!overwriteTarget) return
                                void handleQuickBindSlot(overwriteTarget.ams, overwriteTarget.slot)
                                setOverwriteTarget(null)
                            }}
                            className="cursor-pointer"
                        >
                            确认覆盖
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HomeScanDialog
                open={slotScanOpen}
                onOpenChange={setSlotScanOpen}
                onScanResult={(text) => void handleScannedSlotBind(text)}
                title="扫码绑定槽位"
                description="扫描 AMS 槽位二维码后，会将当前耗材直接绑定到对应槽位。"
            />

            {/* ── Use modal ── */}
            <Dialog open={useOpen} onOpenChange={setUseOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>使用耗材</DialogTitle>
                        <DialogDescription className="sr-only">输入使用重量</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">名称</span><span className="font-medium">{spool?.name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">材料</span><span className="font-medium">{spool?.materialType}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">剩余</span><span className="font-medium">{spool?.remainingWeight ?? spool?.netWeight}g</span></div>
                    </div>
                    <div className="space-y-2">
                        <Label>使用重量(克) <span className="text-destructive">*</span></Label>
                        <DecimalInput min={1} max={spool?.remainingWeight ?? spool?.netWeight} step={0.01}
                            value={useWeight ?? ''} onValueChange={(val) => setUseWeight(val)}
                            placeholder="请输入使用重量" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUseOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={handleUse} disabled={useLoading} className="cursor-pointer">
                            {useLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CalibrateModal
                open={calibrateOpen}
                onOpenChange={setCalibrateOpen}
                loading={calibrateLoading}
                readingWeight={calibrateReadingWeight}
                scaleWeight={calibrateScaleWeight}
                currentSpool={currentSpool}
                calibrateForm={calibrateForm}
                onTotalWeightChange={handleCalibrateTotalWeightChange}
                onSubmit={handleCalibrateSubmit}
                onUseScaleWeight={handleUseScaleWeightSubmit}
            />

            {/* ── Edit/Clone modal ── */}
            <AddSpoolModal
                open={editOpen}
                onOpenChange={setEditOpen}
                mode={editMode}
                initialData={spool}
                onSuccess={() => {
                    fetchDetail()
                }}
            />

            {/* ── Transfer modal ── */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="max-w-md overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>纠错转移</DialogTitle>
                        <DialogDescription className="sr-only">将使用记录转移到其他耗材</DialogDescription>
                    </DialogHeader>
                    {transferRecord && (
                        <div className="min-w-0 space-y-3">
                            <div className="space-y-1 text-sm">
                                <p><span className="text-muted-foreground">当前记录: </span><span className="font-medium">{transferRecord.title || '未知任务'}</span></p>
                                <p><span className="text-muted-foreground">原耗材: </span><span className="font-medium">{spool?.name}</span></p>
                                <p><span className="text-muted-foreground">转移重量: </span><span className="font-medium">{transferRecord.actualWeight}g</span></p>
                            </div>
                            <div className="space-y-2">
                                <Label>选择新耗材</Label>
                                <Combobox
                                    options={availableSpools
                                        .filter((s) => s.id !== spoolId)
                                        .map((s) => ({
                                            value: String(s.id),
                                            label: `#${s.id} ${s.name || '-'} | ${s.materialType || '-'} | 剩余: ${s.remainingWeight ?? '-'}g`,
                                        }))}
                                    value={selectedTransferSpoolId ? String(selectedTransferSpoolId) : ''}
                                    onChange={(value) => setSelectedTransferSpoolId(value ? Number(value) : undefined)}
                                    placeholder="请选择要转移到的耗材"
                                    searchPlaceholder="搜索耗材名称/ID..."
                                    emptyText="未找到可转移耗材"
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

            {/* ── Snapshot modal ── */}
            <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>使用记录快照</DialogTitle>
                        <DialogDescription className="sr-only">查看打印过程中的快照记录</DialogDescription>
                    </DialogHeader>
                    {snapshotLoading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">暂无快照记录</div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {snapshots.map((snap) => (
                                <div key={snap.id} className="flex items-start gap-4 rounded-lg border border-border/50 p-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">打印进度 {snap.percent}%</p>
                                    </div>
                                    {snap.imageUrl && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <img
                                                    src={snap.imageUrl}
                                                    alt={`快照 ${snap.percent}%`}
                                                    className="h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                                />
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                                <DialogHeader className="sr-only">
                                                    <DialogTitle>View Image</DialogTitle>
                                                    <DialogDescription>Full size snapshot image</DialogDescription>
                                                </DialogHeader>
                                                <img
                                                    src={snap.imageUrl}
                                                    alt={`快照大图 ${snap.percent}%`}
                                                    className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                                <div><span className="text-muted-foreground">任务状态：</span>{recordDetailRecord.statusText ?? '-'}</div>
                            </div>
                            <div><span className="text-muted-foreground">使用设备：</span>{recordDetailRecord.deviceName || '-'}</div>
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
