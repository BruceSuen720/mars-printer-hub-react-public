import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
    Monitor,
    Loader2,
    Printer,
    PauseCircle,
    Activity,
    MapPin,
    Clock,
    Zap,
    Maximize,
    Minimize,
    Pause,
    Power,
    AlertTriangle,
    CheckCircle,
    Wrench,
    ZoomIn,
    Image as ImageIcon,
    HelpCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog'
import { getOverview } from '@/api/printer'
import { showRequestError } from '@/request'
import { useDeviceStore } from '@/stores/useDeviceStore'

// Printer model images
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

const OVERVIEW_TITLE_CACHE_KEY = 'device_overview_title'
const DEFAULT_OVERVIEW_TITLE = '设备总览'

/* ── Card style ── */
const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

/* ── Status config with icons ── */
const STATUS_CONFIG: Record<string, {
    bg: string
    bgBlock: string
    shadow: string
    label: string
    icon: React.ElementType
    textColor: string
}> = {
    RUNNING: {
        bg: 'bg-emerald-500',
        bgBlock: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        shadow: 'shadow-emerald-500/40',
        label: '打印中',
        icon: Printer,
        textColor: 'text-white',
    },
    PAUSE: {
        bg: 'bg-amber-400',
        bgBlock: 'bg-gradient-to-br from-amber-300 to-amber-500',
        shadow: 'shadow-amber-400/40',
        label: '暂停',
        icon: Pause,
        textColor: 'text-white',
    },
    IDLE: {
        bg: 'bg-zinc-400 dark:bg-zinc-600',
        bgBlock: 'bg-gradient-to-br from-zinc-300 to-zinc-500 dark:from-zinc-500 dark:to-zinc-700',
        shadow: '',
        label: '空闲',
        icon: Power,
        textColor: 'text-white/80',
    },
    FINISH: {
        bg: 'bg-zinc-400 dark:bg-zinc-600',
        bgBlock: 'bg-gradient-to-br from-zinc-300 to-zinc-500 dark:from-zinc-500 dark:to-zinc-700',
        shadow: '',
        label: '完成',
        icon: CheckCircle,
        textColor: 'text-white/80',
    },
    OFFLINE: {
        bg: 'bg-red-500',
        bgBlock: 'bg-gradient-to-br from-red-400 to-red-600',
        shadow: 'shadow-red-500/40',
        label: '待维修',
        icon: Wrench,
        textColor: 'text-white',
    },
    PREPARE: {
        bg: 'bg-emerald-500',
        bgBlock: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        shadow: 'shadow-emerald-500/40',
        label: '准备中',
        icon: Printer,
        textColor: 'text-white',
    },
    SLICING: {
        bg: 'bg-emerald-500',
        bgBlock: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        shadow: 'shadow-emerald-500/40',
        label: '切片中',
        icon: Printer,
        textColor: 'text-white',
    },
    FAILED: {
        bg: 'bg-zinc-400 dark:bg-zinc-600',
        bgBlock: 'bg-gradient-to-br from-zinc-300 to-zinc-500 dark:from-zinc-500 dark:to-zinc-700',
        shadow: '',
        label: '失败',
        icon: AlertTriangle,
        textColor: 'text-white/80',
    },
    INIT: {
        bg: 'bg-zinc-400 dark:bg-zinc-600',
        bgBlock: 'bg-gradient-to-br from-zinc-300 to-zinc-500 dark:from-zinc-500 dark:to-zinc-700',
        shadow: '',
        label: '初始化',
        icon: Loader2,
        textColor: 'text-white/80',
    },
    UNKNOWN: {
        bg: 'bg-zinc-300 dark:bg-zinc-700',
        bgBlock: 'bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-600 dark:to-zinc-800',
        shadow: '',
        label: '未知',
        icon: HelpCircle,
        textColor: 'text-white/60',
    },
}

const getStatusInfo = (status?: string) =>
    STATUS_CONFIG[status ?? 'UNKNOWN'] ?? STATUS_CONFIG.UNKNOWN

/* ── Format remaining time ── */
function formatRemaining(minutes?: number): string {
    if (!minutes || minutes <= 0) return '-'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}小时${m > 0 ? ` ${m}分钟` : ''}`
    return `${m}分钟`
}

/* ── Types for grouped data ── */
interface ShelfGroup {
    shelf: string
    printers: API.PrinterOverviewVO[]
}

interface RoomGroup {
    room: string
    shelves: ShelfGroup[]
    stats: { total: number; running: number; paused: number; idle: number; offline: number }
}

/* ── Group printers by location ── */
function groupByLocation(printers: API.PrinterOverviewVO[]): {
    rooms: RoomGroup[];
    unlocated: API.PrinterOverviewVO[]
} {
    const unlocated: API.PrinterOverviewVO[] = []
    const roomMap = new Map<string, Map<string, API.PrinterOverviewVO[]>>()

    for (const p of printers) {
        if (!p.location) {
            unlocated.push(p)
            continue
        }
        const parts = p.location.split('-')
        const room = parts[0] ?? '?'
        const shelf = parts[1] ?? '?'

        if (!roomMap.has(room)) roomMap.set(room, new Map())
        const shelves = roomMap.get(room)!
        if (!shelves.has(shelf)) shelves.set(shelf, [])
        shelves.get(shelf)!.push(p)
    }

    const rooms: RoomGroup[] = Array.from(roomMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(([room, shelves]) => {
            const shelfGroups: ShelfGroup[] = Array.from(shelves.entries())
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                .map(([shelf, printers]) => ({
                    shelf,
                    printers: printers.sort((a, b) => {
                        const la = a.location?.split('-')[2] ?? '0'
                        const lb = b.location?.split('-')[2] ?? '0'
                        return Number(la) - Number(lb)
                    }),
                }))

            const allPrinters = shelfGroups.flatMap((s) => s.printers)
            return {
                room,
                shelves: shelfGroups,
                stats: {
                    total: allPrinters.length,
                    running: allPrinters.filter((p) => p.status === 'RUNNING' || p.status === 'PREPARE' || p.status === 'SLICING').length,
                    paused: allPrinters.filter((p) => p.status === 'PAUSE').length,
                    idle: allPrinters.filter((p) => p.status === 'IDLE' || p.status === 'FINISH' || p.status === 'FAILED' || p.status === 'INIT').length,
                    offline: allPrinters.filter((p) => p.status === 'OFFLINE').length,
                },
            }
        })

    return { rooms, unlocated }
}

/* ── Printer block component ── */
function PrinterBlock({
    printer,
    onNavigate,
    container,
}: {
    printer: API.PrinterOverviewVO;
    onNavigate: (printer: API.PrinterOverviewVO) => void;
    container?: HTMLElement | null
}) {
    const info = getStatusInfo(printer.status)
    const isPause = printer.status === 'PAUSE'
    const isActive = printer.status === 'RUNNING' || printer.status === 'PREPARE' || printer.status === 'SLICING'
    const Icon = info.icon
    const modelImg = printerImages[printer.model ?? ''] || printerImages.P1S

    return (
        <HoverCard openDelay={100} closeDelay={50}>
            <HoverCardTrigger asChild>
                <div className="flex flex-col items-center gap-0.5">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${info.bgBlock} ${info.shadow ? `shadow-md ${info.shadow}` : ''
                            } ${isPause ? 'animate-pulse' : ''
                            } cursor-pointer overflow-hidden transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-white/60 hover:brightness-110`}
                        onClick={() => onNavigate(printer)}
                    >
                        {modelImg ? (
                            <img src={modelImg} alt={printer.model ?? ''}
                                className="h-7 w-7 object-contain drop-shadow-sm" />
                        ) : (
                            <Icon size={16} className={info.textColor} strokeWidth={2.5} />
                        )}
                    </div>
                    {printer.location && (
                        <span className="text-[9px] leading-none text-muted-foreground">
                            {printer.location.split('-').slice(-2).join('-')}
                        </span>
                    )}
                </div>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-56 p-3" sideOffset={8} container={container}>
                {/* Name + model */}
                <div className="mb-2.5 flex items-center gap-2">
                    <Printer size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-semibold text-foreground">{printer.name}</span>
                </div>

                {/* Status */}
                <div className="mb-2 flex items-center gap-2">
                    <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${info.bg} ${isPause ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-foreground">{info.label}</span>
                    {printer.model && (
                        <span
                            className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {printer.model}
                        </span>
                    )}
                </div>

                {/* Progress bar */}
                {(isActive || isPause) && (
                    <div className="mb-2">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Zap size={10} />
                                打印进度
                            </span>
                            <span className="text-[11px] font-semibold text-foreground">{printer.mcPercent ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all ${isPause ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${printer.mcPercent ?? 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Remaining time */}
                <div className="flex items-center gap-2 text-[11px]">
                    <Clock size={10} className="text-muted-foreground" />
                    <span className="text-muted-foreground">剩余时间</span>
                    <span
                        className="ml-auto font-medium text-foreground">{formatRemaining(printer.remainingTime)}</span>
                </div>

                {/* Location */}
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <MapPin size={10} className="text-muted-foreground" />
                    <span className="text-muted-foreground">位置</span>
                    <span className="ml-auto font-medium text-foreground">{printer.location ?? '未分配'}</span>
                </div>

                {/* Task Image Row */}
                {printer.coverUrl && (
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <ImageIcon size={10} className="text-muted-foreground" />
                        <span className="text-muted-foreground">任务图片</span>
                        <div className="ml-auto">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div
                                        className="group relative h-8 w-8 cursor-zoom-in overflow-hidden rounded border bg-muted/20 shadow-sm transition-all hover:ring-1 hover:ring-primary/40">
                                        <img
                                            src={printer.coverUrl}
                                            alt="Thumbnail"
                                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <div
                                            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/10 group-hover:opacity-100">
                                            <ZoomIn size={10} className="text-white drop-shadow-sm" />
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent
                                    className="max-w-3xl border-none bg-transparent p-0 shadow-none outline-none"
                                    container={container}>
                                    <img
                                        src={printer.coverUrl}
                                        alt={printer.name ?? 'Cover Large'}
                                        className="h-full w-full rounded-lg object-contain"
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                )}
            </HoverCardContent>
        </HoverCard>
    )
}

/* ── Summary Card (enlarged) ── */
function SummaryCard({
    icon: Icon,
    label,
    value,
    subtitle,
    tone,
    total,
}: {
    icon: React.ElementType
    label: string
    value: number
    subtitle?: string
    tone: string
    total?: number
}) {
    return (
        <div className={`${cardBase} flex items-center gap-4 px-5 py-4`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
                    {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                    {total != null && (
                        <span className="text-xs text-muted-foreground tabular-nums">/ {total}</span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function DeviceOverviewView() {
    const [loading, setLoading] = useState(true)
    const [printers, setPrinters] = useState<API.PrinterOverviewVO[]>([])
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [title, setTitle] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_OVERVIEW_TITLE
        const cached = window.localStorage.getItem(OVERVIEW_TITLE_CACHE_KEY)?.trim()
        return cached || DEFAULT_OVERVIEW_TITLE
    })
    const [titleEditing, setTitleEditing] = useState(false)
    const [editingTitle, setEditingTitle] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const isMobile = useDeviceStore((s) => s.isMobile)
    const navigate = useNavigate()

    const commitTitle = useCallback(() => {
        const next = editingTitle.trim() || DEFAULT_OVERVIEW_TITLE
        setTitle(next)
        setTitleEditing(false)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(OVERVIEW_TITLE_CACHE_KEY, next)
        }
    }, [editingTitle])

    const cancelTitleEdit = useCallback(() => {
        setEditingTitle(title)
        setTitleEditing(false)
    }, [title])

    useEffect(() => {
        if (!titleEditing) return
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
    }, [titleEditing])

    const handleNavigateToPrinter = useCallback((printer: API.PrinterOverviewVO) => {
        if (!printer.id) {
            toast.warning('无法定位该设备 ID')
            return
        }
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {
            })
        }
        navigate(`/device/manage?printerId=${printer.id}`)
    }, [navigate])

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true)
        try {
            const res = await getOverview()
            if (res.data?.data) {
                setPrinters(res.data.data)
            }
        } catch (error) {
            if (!isSilent) showRequestError(error, '获取设备概览失败')
        } finally {
            if (!isSilent) setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData() // Initial fetch

        const timer = setInterval(() => {
            fetchData(true) // Silent refresh every 1 minute
        }, 60000)

        return () => clearInterval(timer)
    }, [fetchData])

    /* ── Fullscreen ── */
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {
            })
        } else {
            document.exitFullscreen().catch(() => {
            })
        }
    }, [])

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    /* ── Computed ── */
    const { rooms, unlocated } = useMemo(() => groupByLocation(printers), [printers])

    const totalStats = useMemo(() => {
        const total = printers.length
        const running = printers.filter((p) => p.status === 'RUNNING' || p.status === 'PREPARE' || p.status === 'SLICING').length
        const paused = printers.filter((p) => p.status === 'PAUSE').length
        const offline = printers.filter((p) => p.status === 'OFFLINE').length
        const online = total - offline
        return { total, running, paused, offline, online }
    }, [printers])

    if (loading) {
        return (
            <div className={`space-y-6 ${isMobile ? '' : 'p-6'}`}>
                <Skeleton className="h-8 w-40" />
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[88px] rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-60 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef}
            className={`space-y-6 ${isMobile ? '' : 'p-6'} ${isFullscreen ? 'overflow-y-auto bg-background' : ''}`}>
            {/* ── Header ── */}
            <div className={`flex items-center justify-between ${isMobile ? '' : 'border-b border-border/50 pb-4'}`}>
                {titleEditing ? (
                    <Input
                        ref={titleInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitTitle()
                            if (e.key === 'Escape') cancelTitleEdit()
                        }}
                        className={`h-9 max-w-[240px] font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}
                    />
                ) : (
                    <h1
                        className={`cursor-text font-bold text-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`}
                        onDoubleClick={() => {
                            setEditingTitle(title)
                            setTitleEditing(true)
                        }}
                        title="双击可编辑标题"
                    >
                        {title}
                    </h1>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        title={isFullscreen ? '退出全屏' : '全屏展示'}
                    >
                        {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
                        {isFullscreen ? '退出全屏' : '全屏'}
                    </button>
                    <button
                        onClick={() => fetchData()}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                        <Loader2 size={12} className={loading ? 'animate-spin' : ''} />
                        刷新
                    </button>
                </div>
            </div>

            {/* ── Summary cards ── */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                <SummaryCard icon={Monitor} label="设备总数" value={totalStats.total}
                    subtitle={`${totalStats.online} 台在线`} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
                <SummaryCard icon={Activity} label="打印中" value={totalStats.running} total={totalStats.total}
                    subtitle="" tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard icon={PauseCircle} label="暂停中" value={totalStats.paused} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
                <SummaryCard icon={Wrench} label="待维修" value={totalStats.offline} tone="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
            </div>

            {/* ── Zone grid ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => (
                    <div key={room.room} className={`${cardBase} overflow-hidden`}>
                        {/* Room header */}
                        <div
                            className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                            <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                ZONE-{String.fromCharCode(64 + Number(room.room))}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
                                <span className="text-muted-foreground">共 {room.stats.total} 台</span>
                                <span className="h-3 w-px bg-border" />
                                {room.stats.running > 0 && (
                                    <span
                                        className="text-emerald-600 dark:text-emerald-400">打印中: {room.stats.running}</span>
                                )}
                                {room.stats.paused > 0 && (
                                    <span
                                        className="text-amber-600 dark:text-amber-400">暂停: {room.stats.paused}</span>
                                )}
                                {room.stats.idle > 0 && (
                                    <span className="text-muted-foreground">空闲: {room.stats.idle}</span>
                                )}
                                {room.stats.offline > 0 && (
                                    <span className="text-red-600 dark:text-red-400">待维修: {room.stats.offline}</span>
                                )}
                            </div>
                        </div>

                        {/* Shelves */}
                        <div className="space-y-4 p-4">
                            {room.shelves.map((shelf) => {
                                return (
                                    <div key={shelf.shelf} className="flex items-start gap-3">
                                        <div
                                            className="flex h-9 min-w-[40px] shrink-0 items-center justify-center rounded-lg bg-muted/60 px-2 text-xs font-bold text-muted-foreground uppercase">
                                            {shelf.shelf}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {shelf.printers.map((p) => (
                                                <PrinterBlock key={p.id} printer={p}
                                                    onNavigate={handleNavigateToPrinter}
                                                    container={containerRef.current} />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {/* Unlocated printers */}
                {unlocated.length > 0 && (
                    <div className={`${cardBase} overflow-hidden`}>
                        <div
                            className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                            <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                未分配位置
                            </h2>
                            <span className="text-[11px] font-medium text-muted-foreground">{unlocated.length} 台</span>
                        </div>
                        <div className="p-4">
                            <div className="flex flex-wrap gap-2">
                                {unlocated.map((p) => (
                                    <PrinterBlock key={p.id} printer={p} onNavigate={handleNavigateToPrinter}
                                        container={containerRef.current} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
