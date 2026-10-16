import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeSummary } from '@/api/home'
import { statusMap } from '@/assets/config/statusMap'
import { toast } from 'sonner'
import { Timer, Printer, Package2, ArrowUpDown, ScanLine, PrinterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import RecentActivities from '@/components/home/RecentActivities'
import PrinterSortModal from '@/components/home/PrinterSortModal'
import HomeScanDialog from '@/components/home/HomeScanDialog'
import { showRequestError } from '@/request'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { cn } from '@/lib/utils'

// Printer images
import a1Img from '@/assets/images/printer/home/a1.webp'
import a1MiniImg from '@/assets/images/printer/home/a1_mini.webp'
import a2lImg from '@/assets/images/printer/home/a2l.webp'
import x1cImg from '@/assets/images/printer/home/x1c.webp'
import x2dImg from '@/assets/images/printer/home/x2d.webp'
import p1sImg from '@/assets/images/printer/home/p1s.webp'
import p2sImg from '@/assets/images/printer/home/p2s.webp'
import h2dImg from '@/assets/images/printer/home/h2d.webp'
import h2sImg from '@/assets/images/printer/home/h2s.webp'
import h2cImg from '@/assets/images/printer/home/h2c.webp'

const printerImages: Record<string, string> = {
    A1: a1Img,
    A1MINI: a1MiniImg,
    A2L: a2lImg,
    X1C: x1cImg,
    X2D: x2dImg,
    P1S: p1sImg,
    P2S: p2sImg,
    H2D: h2dImg,
    H2S: h2sImg,
    H2C: h2cImg,
}

const printerStatusColorMap: Record<string, string> = {
    RUNNING: '#10b981',
    IDLE: '#3b82f6',
    OFFLINE: '#9ca3af',
    FAILED: '#ef4444',
    FINISH: '#14b8a6',
    PREPARE: '#6366f1',
    PAUSE: '#f59e0b',
    SLICING: '#a855f7',
    INIT: '#3b82f6',
}

function formatRemainingTime(minutes?: number) {
    if (!minutes || minutes <= 0) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}小时${mins}分钟`
    return `${mins}分钟`
}

function getPrinterStatus(status?: string) {
    const normalized = status?.toUpperCase?.() || ''
    return {
        label: statusMap[normalized] || status || '未知状态',
        color: printerStatusColorMap[normalized] || '#9ca3af',
    }
}

export default function HomeView() {
    const [loading, setLoading] = useState(false)
    const [summaryData, setSummaryData] = useState<API.HomeVO>()
    const [sortModalOpen, setSortModalOpen] = useState(false)
    const [scanDialogOpen, setScanDialogOpen] = useState(false)
    const isMobile = useDeviceStore((s) => s.isMobile)
    const navigate = useNavigate()

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getHomeSummary()
            if (res.data?.data) {
                setSummaryData(res.data.data)
            }
        } catch (error) {
            showRequestError(error, '获取汇总数据失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const metricCards = useMemo(() => {
        const data = summaryData
        const formatCount = (v?: number | null) => (v == null ? '--' : v.toLocaleString())
        const formatHours = (v?: number | null) => {
            if (v == null) return { display: '--', suffix: '' }
            const h = Number(v)
            if (Number.isNaN(h)) return { display: '--', suffix: '' }
            const r = h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)
            return { display: r.replace(/\.0$/, ''), suffix: 'h' }
        }
        const formatWeight = (v?: number | null) => {
            if (v == null) return { display: '--', suffix: '' }
            if (v >= 1000) return { display: Number((v / 1000).toFixed(1)).toString(), suffix: 'kg' }
            return { display: v.toString(), suffix: 'g' }
        }

        const wt = formatHours(data?.weeklyUsedTime)
        const w = formatWeight(data?.totalUsedSpoolsWeight)
        const sp = formatCount(data?.successfulPrints)

        return [
            { key: 'weeklyUsedTime', title: '本周打印时长', display: wt.display, unit: wt.suffix, icon: Timer, hasValue: wt.display !== '--', desc: '七日内累计任务耗时' },
            { key: 'successfulPrints', title: '本周成功打印', display: sp, unit: sp === '--' ? '' : '次', icon: Printer, hasValue: sp !== '--', desc: '七日内正常完成次数' },
            { key: 'totalUsedSpoolsWeight', title: '本周耗材消耗', display: w.display, unit: w.suffix, icon: Package2, hasValue: w.display !== '--', desc: '七日内累计净重消耗' },
        ]
    }, [summaryData])

    const printers = useMemo(() => summaryData?.printers ?? [], [summaryData?.printers])
    const runningCount = useMemo(() => printers.filter((p) => p.status?.toUpperCase() === 'RUNNING').length, [printers])

    const goToPrinterDetail = (printer: API.PrinterHomeSummaryVO) => {
        if (!printer.id) {
            toast.warning('无法定位该设备 ID')
            return
        }
        navigate(`/device/manage?printerId=${printer.id}`)
    }

    const handleScanResult = useCallback((rawText: string) => {
        const text = rawText.trim()

        if (!text) {
            toast.error('未识别到二维码内容')
            return
        }

        try {
            const url = text.startsWith('/') ? new URL(text, window.location.origin) : new URL(text)

            if (url.pathname === '/ams/slot') {
                const printerId = Number(url.searchParams.get('printerId'))
                const amsId = Number(url.searchParams.get('amsId'))
                const slotNo = Number(url.searchParams.get('slotNo'))

                if (Number.isNaN(printerId) || Number.isNaN(amsId) || Number.isNaN(slotNo)) {
                    toast.error('这不是有效的 AMS 槽位二维码')
                    return
                }

                setScanDialogOpen(false)
                navigate(`/device/manage?printerId=${printerId}&amsId=${amsId}&slotNo=${slotNo}&open=slot`)
                return
            }

            if (url.origin !== window.location.origin) {
                toast.error('仅支持当前站点内的二维码')
                return
            }

            setScanDialogOpen(false)
            navigate(`${url.pathname}${url.search}${url.hash}`)
        } catch {
            toast.error('无法识别该二维码内容')
        }
    }, [navigate])

    /* ─── Standard Card Classes ─── */
    const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

    return (
        <div className={isMobile ? 'min-h-full' : 'min-h-full p-6'}>
            {/* Page header */}
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className={isMobile ? 'flex min-h-8 items-center' : undefined}>
                        <h1 className={`font-bold tracking-tight text-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`}>概览</h1>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScanDialogOpen(true)}
                    className="cursor-pointer self-start"
                >
                    <ScanLine size={16} />
                    二维码
                </Button>
            </div>

            <div className="flex flex-col gap-8">
                {/* ── Metric cards ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {metricCards.map((metric) => (
                        <div
                            key={metric.key}
                            className={cn(
                                cardBase,
                                'group relative overflow-hidden p-5 transition-colors hover:border-primary/40',
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
                                    {loading ? (
                                        <Skeleton className="mt-3 h-8 w-24" />
                                    ) : (
                                        <div className="mt-3 flex items-baseline gap-1">
                                            <span
                                                className="text-3xl font-semibold tracking-tight tabular-nums"
                                                style={{ color: metric.hasValue ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
                                            >
                                                {metric.display}
                                            </span>
                                            {metric.unit && (
                                                <span className="ml-0.5 text-sm font-medium text-muted-foreground">{metric.unit}</span>
                                            )}
                                        </div>
                                    )}
                                    <p className="mt-1.5 text-xs text-muted-foreground">{metric.desc}</p>
                                </div>
                                <metric.icon size={18} className="shrink-0 text-primary/70" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Printer status section ── */}
                <section>
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">打印机状态</h2>
                            {!loading && printers.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs leading-none text-muted-foreground tabular-nums">
                                    <span>共 {printers.length} 台</span>
                                    {runningCount > 0 && (
                                        <>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                </span>
                                                {runningCount} 台打印中
                                            </span>
                                        </>
                                    )}
                                </span>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer items-center gap-1 px-0 py-0 text-sm text-primary hover:bg-transparent hover:text-primary/80"
                            onClick={() => setSortModalOpen(true)}
                        >
                            <ArrowUpDown size={14} />
                            排序
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={cn(cardBase, 'overflow-hidden')}>
                                    <Skeleton className="h-[200px] w-full rounded-none" />
                                    <div className="border-t border-border/40 p-4">
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : printers.length === 0 ? (
                        <div className={cn(cardBase, 'flex h-48 flex-col items-center justify-center gap-3 border-dashed')}>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                                <PrinterIcon size={20} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">暂无打印机</p>
                                <p className="mt-1 text-xs text-muted-foreground">前往设备管理添加你的第一台打印机</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-1 cursor-pointer"
                                onClick={() => navigate('/device/manage')}
                            >
                                前往管理
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {printers.map((printer) => {
                                const status = getPrinterStatus(printer.status)
                                const isRunning = printer.status?.toUpperCase() === 'RUNNING'
                                return (
                                    <div
                                        key={printer.id}
                                        className={cn(
                                            'group relative flex cursor-pointer flex-col overflow-hidden transition-all',
                                            cardBase,
                                            'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm',
                                            'focus-visible:outline-2 focus-visible:outline-primary',
                                        )}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => goToPrinterDetail(printer)}
                                        onKeyDown={(e) => e.key === 'Enter' && goToPrinterDetail(printer)}
                                    >
                                        {/* Status pill (tinted, calmer) */}
                                        <div className="absolute right-3 top-3 z-10">
                                            <span
                                                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm"
                                                style={{
                                                    color: status.color,
                                                    borderColor: `${status.color}33`,
                                                    backgroundColor: `${status.color}14`,
                                                }}
                                            >
                                                {isRunning && (
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: status.color }} />
                                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                    </span>
                                                )}
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Printer image */}
                                        <div className="relative flex h-[200px] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-muted/40 to-muted/10 p-5">
                                            <img
                                                src={printerImages[printer.model || '']}
                                                alt={printer.model || '打印机图片'}
                                                className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                                            />

                                            {/* Progress bar overlay (RUNNING only) */}
                                            {isRunning && (
                                                <div className="absolute inset-x-4 bottom-3 flex flex-col gap-1">
                                                    <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-foreground/80">
                                                        <span>{printer.mcPercent ?? 0}%</span>
                                                        <span className="text-muted-foreground">剩 {formatRemainingTime(printer.remainingTime)}</span>
                                                    </div>
                                                    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min(printer.mcPercent ?? 0, 100)}%`,
                                                                backgroundColor: status.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Printer info */}
                                        <div className="flex items-center justify-between gap-2 border-t border-border/40 px-4 py-3">
                                            <span className="truncate text-sm font-semibold text-foreground">
                                                {printer.name || '未命名打印机'}
                                            </span>
                                            {printer.model && (
                                                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
                                                    {printer.model}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* ── Recent activities ── */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">最近活动</h2>
                    </div>
                    <RecentActivities summaryData={summaryData} loading={loading} />
                </section>
            </div>

            {/* Sort modal */}
            <PrinterSortModal
                open={sortModalOpen}
                onOpenChange={setSortModalOpen}
                onSuccess={fetchData}
            />
            <HomeScanDialog
                open={scanDialogOpen}
                onOpenChange={setScanDialogOpen}
                onScanResult={handleScanResult}
            />
        </div>
    )
}
