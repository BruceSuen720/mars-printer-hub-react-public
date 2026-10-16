import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    Wifi,
    WifiOff,
    Zap,
    Thermometer,
    CheckCircle,
    Loader2,
    Droplets,
    Clock,
    Timer,
    Layers,
    Activity,
    RefreshCw,
    Info,
    Link2,
    Rocket,
    Circle,
    Lightbulb,
    Flame,
    AlertTriangle,
    ChartNoAxesGantt,
    Fan,
} from 'lucide-react'
import { Button, iconTextUniformWidthClass } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog'
import { listPrinters, getCompleteInfo, getPrinterPower, switchChamberLight, switchChamberLight2 } from '@/api/device'
import { getPrinter } from '@/api/printer'
import { connect, refresh } from '@/api/bambuMqtt'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useSseStore } from '@/stores/useSseStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { showRequestError } from '@/request'
import { cn } from '@/lib/utils'
import { HmsErrorDialog } from './components/HmsErrorDialog'
import { PrinterVideoDialog } from './components/PrinterVideoDialog'
import { PrinterDetailDialog } from './components/PrinterDetailDialog'
import { AmsEntityDialog } from './components/AmsEntityDialog'
import { SlotWorkflowDialogs } from './components/SlotWorkflowDialogs'
import { formatColor, getSlotDisplayName } from './deviceManage.utils'
import { getHmsSeverityMeta, sortHmsErrors } from './hms'

// Printer images
import a1On from '@/assets/images/printer/a1/on_a1.webp'
import a1Off from '@/assets/images/printer/a1/off_a1.webp'
import a1miniOn from '@/assets/images/printer/a1mini/on_a1mini.webp'
import a1miniOff from '@/assets/images/printer/a1mini/off_a1mini.webp'
import a2lOn from '@/assets/images/printer/a2l/on_a2l.webp'
import a2lOff from '@/assets/images/printer/a2l/off_a2l.webp'
import x1cOn from '@/assets/images/printer/x1c/on_x1c.webp'
import x1cOff from '@/assets/images/printer/x1c/off_x1c.webp'
import x2dOn from '@/assets/images/printer/x2d/on_x2d.webp'
import x2dOff from '@/assets/images/printer/x2d/off_x2d.webp'
import p1sOn from '@/assets/images/printer/p1s/on_p1s.webp'
import p1sOff from '@/assets/images/printer/p1s/off_p1s.webp'
import p2sOn from '@/assets/images/printer/p2s/on_p2s.webp'
import p2sOff from '@/assets/images/printer/p2s/off_p2s.webp'
import h2dOn from '@/assets/images/printer/h2d/on_h2d.webp'
import h2dOff from '@/assets/images/printer/h2d/off_h2d.webp'
import h2sOn from '@/assets/images/printer/h2s/on_h2s.webp'
import h2sOff from '@/assets/images/printer/h2s/off_h2s.webp'
import h2cOn from '@/assets/images/printer/h2c/on_h2c.webp'
import h2cOff from '@/assets/images/printer/h2c/off_h2c.webp'

const printerImages: Record<string, { on: string, off: string }> = {
    A1: { on: a1On, off: a1Off },
    A1MINI: { on: a1miniOn, off: a1miniOff },
    A2L: { on: a2lOn, off: a2lOff },
    X1C: { on: x1cOn, off: x1cOff },
    X2D: { on: x2dOn, off: x2dOff },
    P1S: { on: p1sOn, off: p1sOff },
    P2S: { on: p2sOn, off: p2sOff },
    H2D: { on: h2dOn, off: h2dOff },
    H2S: { on: h2sOn, off: h2sOff },
    H2C: { on: h2cOn, off: h2cOff },
}

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

const CONNECTION_STATUS_MAP: Record<number, string> = { 0: '未连接', 1: '局域网', 2: '云端' }

const PRINT_STATUS_MAP: Record<string, string> = {
    FAILED: "失败",
    FINISH: "完成",
    IDLE: "空闲",
    OFFLINE: "离线",
    PREPARE: "准备中",
    RUNNING: "打印中",
    PAUSE: "暂停",
    SLICING: "切片中",
    INIT: "初始化"
}

type NozzleTempItem = {
    key: 'single' | 'left' | 'right'
    label: string
    current?: number
    target?: number
    active: boolean
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
}

/* ── Helpers ── */
const formatTemp = (t?: string) => {
    if (!t) return '-';
    const v = `${t}`.trim();
    if (!v) return '-';
    if (/[°℃]/.test(v)) return v;
    return `${v}°C`
}
const formatDeviceTemp = (t?: number) => {
    if (t === undefined || t === null || Number.isNaN(t)) return '--'
    return `${Number.isInteger(t) ? t : t.toFixed(1)}°C`
}
const formatFanSpeed = (speed?: number) => {
    if (speed === undefined || speed === null || Number.isNaN(speed)) return '--'
    return `${Math.round(speed)}%`
}
const formatHumidity = (h?: string) => {
    if (!h) return '-';
    const v = `${h}`.trim();
    if (!v) return '-';
    if (/%/.test(v)) return v;
    return `${v}%`
}

const isSlotActive = (ams: API.AmsVO, slot: API.AmsSlotsVO) => {
    const t = ams.trayNow;
    if (t == null || t === 255) return false
    if (ams.amsNo === 254 || ams.amsNo === 255) return t === 0
    return slot.slotNo === t
}

const getCurrentSlotInfo = (ams: API.AmsVO) => {
    const t = ams.trayNow;
    if (t === null || t === 255) return '无'
    return getSlotDisplayName(ams.amsNo, t)
}

const isLightColor = (hex?: string) => {
    if (!hex) return false;
    const c = hex.replace('#', '');
    if (c.length !== 6) return false
    const b = parseInt(c, 16);
    return ((((b >> 16) & 255) * 299 + ((b >> 8) & 255) * 587 + (b & 255) * 114) / 1000) > 220
}

const formatRemainingTime = (minutes?: number) => {
    if (!minutes || minutes <= 0) return null
    const h = Math.floor(minutes / 60);
    const m = minutes % 60
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

const clampProgress = (value?: number) => Math.min(100, Math.max(0, value ?? 0))

export default function DeviceManageView() {
    const [searchParams, setSearchParams] = useSearchParams()
    const loginUserStore = useLoginUserStore()
    const isMobile = useDeviceStore((s) => s.isMobile)
    const isIntranet = loginUserStore.loginUser?.isIntranet === true
    const initRef = useRef(false)

    /* ── State ── */
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [printers, setPrinters] = useState<API.DeviceSimpleVO[]>([])
    const [selectedId, setSelectedId] = useState<number | undefined>()
    const [completeInfo, setCompleteInfo] = useState<API.DeviceCompleteVO | null>(null)
    const [powerInfo, setPowerInfo] = useState<API.HomeAssistantEntityStateVO | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    /* MQTT */
    const [connectLoading, setConnectLoading] = useState(false)
    const [refreshLoading, setRefreshLoading] = useState(false)

    /* Printer detail modal */
    const [detailOpen, setDetailOpen] = useState(false)

    /* AMS entity modal */
    const [amsEntityOpen, setAmsEntityOpen] = useState(false)
    const [editingAms, setEditingAms] = useState<API.AmsVO | null>(null)

    /* Slot detail modal */
    const [slotOpen, setSlotOpen] = useState(false)
    const [currentAms, setCurrentAms] = useState<API.AmsVO | null>(null)
    const [currentSlot, setCurrentSlot] = useState<API.AmsSlotsVO | null>(null)
    const [videoDialogOpen, setVideoDialogOpen] = useState(false)
    const [hmsOpen, setHmsOpen] = useState(false)

    /* ── Computed ── */
    const selectedPrinter = useMemo(() => printers.find(p => p.id === selectedId) ?? null, [printers, selectedId])
    const printerOptions = useMemo(
        () => printers.map((p) => ({ label: p.name || `打印机-${p.id}`, value: String(p.id) })),
        [printers],
    )
    const amsList = useMemo(() => completeInfo?.amsList ?? [], [completeInfo])
    const mqttStatus = completeInfo?.mqttConnectStatus ?? 0
    const printStatus = completeInfo?.status?.printStatus
    const printProgress = clampProgress(completeInfo?.status?.printProgress)
    const isPrintProgressActive = printStatus === 'RUNNING' || printStatus === 'PREPARE' || printStatus === 'SLICING'
    const hmsErrors = useMemo(() => sortHmsErrors(completeInfo?.hmsErrors ?? []), [completeInfo?.hmsErrors])
    const topHmsMeta = getHmsSeverityMeta(hmsErrors[0]?.severity)
    const nozzleTempItems = useMemo<NozzleTempItem[]>(() => {
        const activeNozzle = completeInfo?.activeNozzle
        if (activeNozzle === 'left' || activeNozzle === 'right') {
            return [
                {
                    key: 'left',
                    label: '左喷嘴',
                    current: completeInfo?.leftNozzleTemp,
                    target: completeInfo?.leftTargetNozzleTemp,
                    active: activeNozzle === 'left',
                },
                {
                    key: 'right',
                    label: '右喷嘴',
                    current: completeInfo?.rightNozzleTemp,
                    target: completeInfo?.rightTargetNozzleTemp,
                    active: activeNozzle === 'right',
                },
            ]
        }

        return [
            {
                key: 'single',
                label: '喷嘴',
                current: completeInfo?.nozzleTemp,
                target: completeInfo?.targetNozzleTemp,
                active: false,
            },
        ]
    }, [
        completeInfo?.activeNozzle,
        completeInfo?.leftNozzleTemp,
        completeInfo?.leftTargetNozzleTemp,
        completeInfo?.nozzleTemp,
        completeInfo?.rightNozzleTemp,
        completeInfo?.rightTargetNozzleTemp,
        completeInfo?.targetNozzleTemp,
    ])
    const fanStatusItems = useMemo(() => [
        {
            key: 'cooling',
            label: '部件风扇',
            value: completeInfo?.fans?.coolingFanSpeedPercentage,
        },
        {
            key: 'aux',
            label: '辅助风扇',
            value: completeInfo?.fans?.auxFanSpeedPercentage,
        },
        {
            key: 'chamber',
            label: '外排风扇',
            value: completeInfo?.fans?.chamberFanSpeedPercentage,
        },
        {
            key: 'secondaryAux',
            label: '第二辅助风扇',
            value: completeInfo?.fans?.secondaryAuxFanSpeedPercentage,
        },
    ].filter((item) => item.value !== undefined && item.value !== null && !Number.isNaN(item.value)), [
        completeInfo?.fans?.auxFanSpeedPercentage,
        completeInfo?.fans?.chamberFanSpeedPercentage,
        completeInfo?.fans?.coolingFanSpeedPercentage,
        completeInfo?.fans?.secondaryAuxFanSpeedPercentage,
    ])
    const renderTemperatureItem = (
        label: string,
        current?: number,
        target?: number,
        active = false,
    ) => (
        <div className="min-w-0">
            <span className={cn('block truncate text-xs', active ? 'font-medium text-orange-700 dark:text-orange-300' : 'text-muted-foreground')}>
                {label}
            </span>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className={cn('font-semibold', active && 'text-orange-700 dark:text-orange-300')}>
                    {formatDeviceTemp(current)}
                </span>
                {target !== undefined && (
                    <span className="text-sm text-muted-foreground">
                        / {formatDeviceTemp(target)}
                    </span>
                )}
            </div>
        </div>
    )

    const printerImageUrl = useMemo(() => {
        if (!selectedPrinter?.model) return printerImages['P1S']?.off || ''
        const baseModel = selectedPrinter.model.toUpperCase()
        const isLightOn = completeInfo?.chamberLight === 'on' || completeInfo?.chamberLight2 === 'on'

        const imagesForModel = printerImages[baseModel]
        if (!imagesForModel) return printerImages['P1S']?.off || ''

        return isLightOn ? imagesForModel.on : imagesForModel.off
    }, [selectedPrinter?.model, completeInfo?.chamberLight, completeInfo?.chamberLight2])

    const estimatedFinish = useMemo(() => {
        const r = completeInfo?.status?.remainingTime;
        if (!r || r <= 0) return null
        const d = new Date(Date.now() + r * 60000)
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }, [completeInfo])

    const taskImageUrl = useMemo(() => {
        const img = completeInfo?.status?.taskImage
        if (!img) return null
        return img
    }, [completeInfo?.status?.taskImage])


    /* ── Fetchers ── */
    const loadDetail = useCallback(async (pid: number, background = false) => {
        if (!background) setDetailLoading(true)
        try {
            const res = await getCompleteInfo({ deviceId: pid })
            const nextInfo = res.data.data ?? { amsList: [], mqttConnectStatus: 0, lastUpdateTime: Date.now() }
            setCompleteInfo(nextInfo)
            if (!background && isIntranet) {
                setPowerInfo(nextInfo.power ?? null)
            }
        } catch {
            setCompleteInfo({ amsList: [], mqttConnectStatus: 0, lastUpdateTime: Date.now() })
            if (!background && isIntranet) {
                setPowerInfo(null)
            }
        } finally {
            if (!background) setDetailLoading(false)
        }
    }, [isIntranet])

    const loadPrinterList = useCallback(async () => {
        setLoading(true);
        setError(null)
        try {
            const res = await listPrinters()
            const list = res.data.data ?? []
            setPrinters(list)
            const routeId = Number(searchParams.get('printerId') || searchParams.get('id'))
            const targetId = list.some(p => p.id === routeId) ? routeId : list[0]?.id
            if (targetId) {
                setSelectedId(targetId);
                await loadDetail(targetId)
            }
        } catch (error) {
            setError(getErrorMessage(error, '加载失败'))
        } finally {
            setLoading(false)
        }
    }, [searchParams, loadDetail])

    useEffect(() => {
        if (!initRef.current) {
            initRef.current = true;
            loginUserStore.fetchLoginUser().catch(() => {
            });
            loadPrinterList()
        }
    }, [loadPrinterList, loginUserStore])

    useEffect(() => {
        if (!printers.length) return
        const routeId = Number(searchParams.get('printerId') || searchParams.get('id'))
        if (!routeId || Number.isNaN(routeId)) return
        if (!printers.some((printer) => printer.id === routeId)) return
        if (selectedId === routeId) return

        setSelectedId(routeId)
        loadDetail(routeId)
    }, [searchParams, printers, selectedId, loadDetail])

    useEffect(() => {
        if (!completeInfo || !selectedId) return
        if (searchParams.get('open') !== 'slot') return

        const routePrinterId = Number(searchParams.get('printerId') || searchParams.get('id'))
        const routeAmsId = Number(searchParams.get('amsId'))
        const routeSlotNo = Number(searchParams.get('slotNo'))

        if (
            Number.isNaN(routePrinterId) ||
            Number.isNaN(routeAmsId) ||
            Number.isNaN(routeSlotNo) ||
            routePrinterId !== selectedId
        ) {
            return
        }

        for (const ams of completeInfo.amsList ?? []) {
            if (Number(ams.id) !== routeAmsId) continue
            const matchedSlot = ams.slots?.find((slot: API.AmsSlotsVO) => Number(slot.slotNo) === routeSlotNo)
            if (!matchedSlot) continue

            setCurrentAms(ams)
            setCurrentSlot(matchedSlot)
            setSlotOpen(true)
            return
        }
    }, [completeInfo, searchParams, selectedId])

    useEffect(() => {
        if (!isIntranet) return

        const sseStore = useSseStore.getState()
        sseStore.init()

        // Subscribe to real-time updates for the current printer
        const callbackId = 'deviceManageView'
        sseStore.subscribe(callbackId, (updatedDeviceId) => {
            if (updatedDeviceId && selectedPrinter?.deviceId === updatedDeviceId) {
                if (selectedId) loadDetail(selectedId, true)
            }
        })

        return () => {
            sseStore.unsubscribe(callbackId)
        }
    }, [isIntranet, selectedPrinter?.deviceId, selectedId, loadDetail])

    useEffect(() => {
        if (!isIntranet) {
            setPowerInfo(null)
            return
        }
        if (!selectedId) {
            setPowerInfo(null)
            return
        }

        let cancelled = false
        let timer: number | null = null
        let pollingStopped = false

        const getCurrentPowerEntityId = async () => {
            const res = await getPrinter({ id: selectedId })
            return res.data.data?.powerEntityId?.trim() ?? ''
        }

        const tick = async () => {
            if (pollingStopped) return
            if (document.visibilityState !== 'visible') return
            try {
                const res = await getPrinterPower({ printerId: selectedId })
                if (!cancelled) {
                    setPowerInfo(res.data.data ?? null)
                }
            } catch {
                pollingStopped = true
                if (timer !== null) {
                    window.clearInterval(timer)
                    timer = null
                }
                if (!cancelled) {
                    setPowerInfo(null)
                }
            }
        }

        const startPolling = async () => {
            if (timer !== null || pollingStopped) return
            try {
                const powerEntityId = await getCurrentPowerEntityId()
                if (!powerEntityId) {
                    if (!cancelled) {
                        setPowerInfo(null)
                    }
                    return
                }

                await tick()
                if (cancelled || pollingStopped) return

                timer = window.setInterval(() => {
                    void tick()
                }, 5000)
            } catch {
                if (!cancelled) {
                    setPowerInfo(null)
                }
            }
        }

        void startPolling()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (timer !== null) {
                    void tick()
                    return
                }
                void startPolling()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            cancelled = true
            if (timer !== null) {
                window.clearInterval(timer)
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isIntranet, selectedId])

    /* ── Handlers ── */
    const handlePrinterChange = (val: string) => {
        if (!val) return
        const id = Number(val);
        if (!id || Number.isNaN(id)) return
        setSelectedId(id);
        setSearchParams({ printerId: String(id) }, { replace: true })
        loadDetail(id)
    }

    const handleForceRefresh = async () => {
        if (!selectedPrinter?.deviceId) return
        setRefreshLoading(true)
        try {
            await refresh({ deviceId: selectedPrinter.deviceId });
            toast.success('强制刷新成功');
            if (selectedId) {
                await loadDetail(selectedId, true)
            }
        } catch (error) {
            showRequestError(error, '强制刷新失败')
        } finally {
            setRefreshLoading(false)
        }
    }

    const handleConnectMqtt = async () => {
        if (!selectedId || !selectedPrinter?.deviceId) return
        setConnectLoading(true)
        try {
            await connect({ deviceId: selectedPrinter.deviceId })
            toast.success('MQTT 连接请求已发送', {
                description: '设备正在尝试重新连接，请稍候查看状态更新'
            })
            await loadDetail(selectedId)
        } catch (error) {
            const message = error instanceof Error ? error.message : undefined
            toast.error('MQTT 连接失败', {
                description: message || '请检查设备网络或稍后重试'
            })
        } finally {
            setConnectLoading(false)
        }
    }

    const handleLightChanged = async (type: 'chamberLight' | 'chamberLight2') => {
        if (!selectedId || !selectedPrinter?.deviceId || !completeInfo) return

        // Determine the target state (toggle whatever is current, fallback to 'on' if undefined)
        const currentState = type === 'chamberLight' ? completeInfo.chamberLight : completeInfo.chamberLight2
        const targetState = currentState === 'on' ? 'off' : 'on'

        try {
            if (type === 'chamberLight') {
                await switchChamberLight({ deviceId: selectedPrinter.deviceId }, { chamberLight: targetState })
            } else {
                await switchChamberLight2({ deviceId: selectedPrinter.deviceId }, { chamberLight2: targetState })
            }
            toast.success('灯光指令已发送', {
                description: `正在尝试将${type === 'chamberLight' ? '主' : '副'}仓灯切换为 ${targetState === 'on' ? '开启' : '关闭'}`
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : undefined
            toast.error('灯光切换失败', {
                description: message || '请检查设备连接后重试'
            })
        }
    }

    /* Printer detail modal */
    const showPrinterDetail = () => {
        if (selectedPrinter?.id) setDetailOpen(true)
    }

    /* AMS entity config */
    const openAmsEntityModal = (ams: API.AmsVO) => {
        setEditingAms(ams)
        setAmsEntityOpen(true)
    }

    const handleAmsEntityOpenChange = (open: boolean) => {
        setAmsEntityOpen(open)
        if (!open) setEditingAms(null)
    }

    /* Slot detail */
    const showSlotDetail = (ams: API.AmsVO, slot: API.AmsSlotsVO) => {
        setCurrentAms(ams);
        setCurrentSlot(slot);
        setSlotOpen(true)
    }

    const handleSlotDialogOpenChange = useCallback((open: boolean) => {
        setSlotOpen(open)

        if (open) return

        if (searchParams.get('open') !== 'slot') return

        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('open')
        nextParams.delete('amsId')
        nextParams.delete('slotNo')
        if (selectedId) {
            nextParams.set('printerId', String(selectedId))
            nextParams.delete('id')
        }
        setSearchParams(nextParams, { replace: true })
    }, [searchParams, selectedId, setSearchParams])

    /* ── Render ── */
    const pageClassName = isMobile ? 'space-y-4' : 'space-y-6 p-6'
    const titleRowClassName = isMobile
        ? 'flex min-h-8 items-center justify-between'
        : 'flex items-center justify-between border-b border-border/50 pb-4'
    const titleClassName = `font-bold tracking-tight text-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`

    if (loading) return (
        <div className={pageClassName}>
            <div className={titleRowClassName}>
                <h1 className={titleClassName}>设备管理</h1>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    )

    if (error) return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <p className="text-lg text-destructive">{error}</p>
            <Button onClick={loadPrinterList} className="cursor-pointer">重新加载</Button>
        </div>
    )

    return (
        <div className={pageClassName}>
            <div className={titleRowClassName}>
                <h1 className={titleClassName}>设备管理</h1>
            </div>

            {/* ── Printer selector ── */}
            <div className={`${cardBase} p-5 space-y-4`}>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-80">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                            选择打印机
                        </Label>

                        <Combobox
                            options={printerOptions}
                            value={selectedId ? String(selectedId) : ''}
                            onChange={handlePrinterChange}
                            placeholder="请选择打印机"
                            searchPlaceholder="搜索打印机..."
                            emptyText="未找到打印机"
                            className="h-9 w-full"
                        />
                    </div>
                    <Button variant="destructive" size="sm" disabled={!selectedPrinter?.deviceId || refreshLoading}
                        onClick={handleForceRefresh} className={cn('h-9 cursor-pointer', iconTextUniformWidthClass)}>
                        {refreshLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> :
                            <RefreshCw size={14} className="mr-1" />} 强制刷新
                    </Button>
                    <Button variant="outline" size="sm" disabled={!selectedPrinter} onClick={showPrinterDetail}
                        className="h-9 cursor-pointer">
                        <Info size={14} className="mr-1" /> 详情
                    </Button>
                </div>

                {/* MQTT status */}
                {selectedId && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3">
                        <div className="flex items-center gap-2">
                            {mqttStatus === 0 ? <WifiOff size={14} className="text-muted-foreground" /> :
                                <Wifi size={14} className="text-emerald-500" />}
                            <span className="text-sm text-muted-foreground">MQTT</span>
                            <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${mqttStatus === 0 ? 'bg-muted text-muted-foreground' : mqttStatus === 1 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                                {CONNECTION_STATUS_MAP[mqttStatus] ?? '未知'}
                            </span>
                        </div>
                        {mqttStatus === 0 && (
                            <Button size="sm" variant="outline" onClick={handleConnectMqtt} disabled={connectLoading}
                                className="h-7 cursor-pointer text-xs">
                                {connectLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> :
                                    <Zap size={12} className="mr-1" />} 连接
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Printer status + AMS ── */}
            {selectedPrinter ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left: Printer status */}
                    <div className={`${cardBase} overflow-hidden p-0 flex flex-col`}>
                        {detailLoading ? (
                            <div className="space-y-3 p-5"><Skeleton className="h-6 w-full" /><Skeleton
                                className="h-[200px] w-full" /><Skeleton className="h-6 w-1/2" /></div>
                        ) : (
                            <>
                                {/* Visual Area */}
                                <div
                                    className="relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden py-4 px-4 shrink-0 rounded-t-xl group/visual">
                                    <img
                                        src={printerImageUrl}
                                        alt={selectedPrinter.model}
                                        className="max-h-[95%] max-w-[95%] object-contain drop-shadow-2xl scale-[1.1] pointer-events-none mt-4 transition-all duration-300"
                                    />
                                    {taskImageUrl && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div
                                                    className="absolute inset-x-0 bottom-[16%] mx-auto w-[45%] max-w-[200px] transform cursor-pointer z-20">
                                                    <img
                                                        src={taskImageUrl}
                                                        alt="Task"
                                                        className="w-full object-contain drop-shadow-md transition-transform duration-500 hover:scale-110"
                                                    />
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent
                                                className="max-w-4xl border-none bg-transparent p-0 shadow-none">
                                                <DialogHeader className="sr-only">
                                                    <DialogTitle>预览打印任务图</DialogTitle>
                                                    <DialogDescription>打印机当前任务的大尺寸预览</DialogDescription>
                                                </DialogHeader>
                                                <img
                                                    src={taskImageUrl}
                                                    alt="Task Fullsize"
                                                    className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                    {/* --- 浮动控制区 / Floating Controls --- */}
                                    {isIntranet && (
                                        <div
                                            className="absolute left-4 top-4 flex flex-col gap-3 z-30">

                                        {/* 主灯光 */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={`h-9 w-9 rounded-full shadow-lg backdrop-blur-md transition-all ${completeInfo?.chamberLight === 'on' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-background/80 text-muted-foreground hover:bg-background'}`}
                                                onClick={() => handleLightChanged('chamberLight')}
                                            >
                                                <Lightbulb size={18}
                                                    className={completeInfo?.chamberLight === 'on' ? 'animate-pulse' : ''} />
                                            </Button>
                                            <span
                                                className="text-[10px] font-medium text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">主灯</span>
                                        </div>

                                        {/* H2系列专有副照明灯 */}
                                        {selectedPrinter.model?.toUpperCase().startsWith('H2') && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className={`h-9 w-9 rounded-full shadow-lg backdrop-blur-md transition-all ${completeInfo?.chamberLight2 === 'on' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-background/80 text-muted-foreground hover:bg-background'}`}
                                                    onClick={() => handleLightChanged('chamberLight2')}
                                                >
                                                    <Lightbulb size={18}
                                                        className={completeInfo?.chamberLight2 === 'on' ? 'animate-pulse' : ''} />
                                                </Button>
                                                <span
                                                    className="text-[10px] font-medium text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">副灯</span>
                                            </div>
                                        )}

                                        {/* 实时画面摄像头预览 */}
                                        <div className="flex items-center gap-2">
                                            <PrinterVideoDialog
                                                open={videoDialogOpen}
                                                onOpenChange={setVideoDialogOpen}
                                                printerName={selectedPrinter.name}
                                                deviceId={selectedPrinter.deviceId!}
                                            />
                                            <span
                                                className="text-[10px] font-medium text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">监控</span>
                                        </div>

                                        {/* HMS 异常入口 */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="relative h-9 w-9 rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur-md transition-all hover:border-primary/50 hover:bg-background hover:text-primary"
                                                onClick={() => setHmsOpen(true)}
                                            >
                                                <AlertTriangle
                                                    size={16}
                                                    className={hmsErrors.length > 0 ? topHmsMeta.iconClassName : undefined}
                                                />
                                            </Button>
                                            <span
                                                className={cn(
                                                    'text-[10px] font-medium bg-background/50 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none',
                                                    hmsErrors.length > 0 ? topHmsMeta.badgeClassName : 'text-muted-foreground',
                                                )}
                                            >
                                                HMS{hmsErrors.length > 0 ? ` · ${hmsErrors.length > 99 ? '99+' : hmsErrors.length}` : ''}
                                            </span>
                                        </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info Area */}
                                <div
                                    className="relative z-10 flex flex-col p-6 bg-background rounded-b-xl border-t border-border/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Row 1: Status & layers */}
                                        <div className="col-span-2 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/40 p-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Activity size={14} />
                                                    <span>打印状态</span>
                                                </div>
                                                <span
                                                    className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${completeInfo?.status?.printStatus === 'IDLE' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : completeInfo?.status?.printStatus === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {completeInfo?.status?.printStatus === 'RUNNING' &&
                                                        <Loader2 size={12} className="animate-spin" />}
                                                    {completeInfo?.status?.printStatus === 'IDLE' &&
                                                        <CheckCircle size={12} />}
                                                    {completeInfo?.status?.printStatus ? (PRINT_STATUS_MAP[completeInfo.status.printStatus] || completeInfo.status.printStatus) : '离线'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 border-l border-border/50 pl-4">
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Layers size={14} />
                                                    <span>打印层数</span>
                                                </div>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-lg font-bold leading-none tabular-nums">{completeInfo?.layerNum ?? '--'}</span>
                                                    <span className="text-sm text-muted-foreground mb-[1px] tabular-nums">/ {completeInfo?.totalLayerNum ?? '--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Progress */}
                                        <div className="col-span-2 rounded-lg border border-border/50 bg-muted/40 p-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <ChartNoAxesGantt size={14} className="text-primary" />
                                                        <span>打印进度</span>
                                                    </span>
                                                    <span className="shrink-0 text-foreground font-semibold">{printProgress}%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full border border-border/50 bg-muted">
                                                    <div
                                                        className="relative h-full overflow-hidden rounded-full bg-primary transition-all duration-500"
                                                        style={{ width: `${printProgress}%` }}>
                                                        <div className={cn('absolute inset-0 bg-white/20', isPrintProgressActive && 'printing-progress-stripes')} style={{
                                                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                                                            backgroundSize: '1rem 1rem'
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Row 3: Temperatures */}
                                        <div
                                            className="col-span-2 flex flex-col gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Thermometer size={14} className="text-orange-500" />
                                                    <span>温度属性</span>
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <div className={cn('grid', nozzleTempItems.length > 1 ? 'grid-cols-2 gap-y-3 sm:grid-cols-4' : 'grid-cols-3')}>
                                                    <div>
                                                        {renderTemperatureItem('热床', completeInfo?.bedTemp)}
                                                    </div>
                                                    <div className="border-l border-border/50 pl-4">
                                                        {renderTemperatureItem('仓温', completeInfo?.chamberTemp)}
                                                    </div>
                                                    {nozzleTempItems.map((nozzle, index) => (
                                                        <div
                                                            key={nozzle.key}
                                                            className={cn(
                                                                nozzleTempItems.length > 1 && index === 0
                                                                    ? 'col-start-1 pl-0 sm:col-start-auto sm:border-l sm:border-border/50 sm:pl-4'
                                                                    : 'border-l border-border/50 pl-4',
                                                            )}
                                                        >
                                                            {renderTemperatureItem(nozzle.label, nozzle.current, nozzle.target, nozzle.active)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {fanStatusItems.length > 0 && (
                                            <div
                                                className="col-span-2 flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Fan size={14} className="text-sky-500" />
                                                    <span>风扇状态</span>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {fanStatusItems.map((item) => {
                                                        const value = clampProgress(item.value)
                                                        return (
                                                            <div key={item.key} className="min-w-0 space-y-1.5">
                                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                                    <span className="truncate text-muted-foreground">{item.label}</span>
                                                                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                                                                        {formatFanSpeed(item.value)}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className="h-full rounded-full bg-sky-500 transition-all duration-500"
                                                                        style={{ width: `${value}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {isIntranet && powerInfo?.state && (
                                            <div
                                                className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                                                <div
                                                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Zap size={14} className="text-amber-500" />
                                                    <span>当前功率</span>
                                                </div>
                                                <div className="flex items-baseline gap-1 mt-1">
                                                    <span className="text-lg font-bold leading-none">{powerInfo.state}</span>
                                                    <span className="text-sm leading-none text-muted-foreground">{powerInfo.unit || 'W'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Timings (Spans 2 columns if running) */}
                                        {completeInfo?.status?.printStatus === 'RUNNING' && (
                                            <div
                                                className="col-span-2 grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/40 border border-border/50">
                                                <div className="flex flex-col gap-1">
                                                    <div
                                                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                        <Clock size={14} />
                                                        <span>预计完成</span>
                                                    </div>
                                                    <span
                                                        className="text-sm font-semibold">{estimatedFinish || '--:--'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 border-l border-border/50 pl-4">
                                                    <div
                                                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                        <Timer size={14} />
                                                        <span>剩余时间</span>
                                                    </div>
                                                    <span
                                                        className="text-sm font-semibold">{completeInfo?.status?.remainingTime ? formatRemainingTime(completeInfo.status.remainingTime) : '--分钟'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: AMS */}
                    <div className="space-y-4">
                        {amsList.length === 0 ? (
                            <div className={`${cardBase} flex items-center justify-center p-12`}><p
                                className="text-muted-foreground">暂无 AMS 设备</p></div>
                        ) : amsList.map((ams) => (
                            <div key={ams.amsNo} className={`${cardBase} overflow-hidden`}>
                                {/* AMS header */}
                                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{ams.amsName}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
                                        {isIntranet ? (
                                            <button
                                                type="button"
                                                className="flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                                                onClick={() => openAmsEntityModal(ams)}
                                            >
                                                <Thermometer size={12} />
                                                {formatTemp(ams.temperature)}
                                                {ams.temperatureEntityId && <Link2 size={10} className="text-emerald-600" />}
                                            </button>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Thermometer size={12} />
                                                {formatTemp(ams.temperature)}
                                                {ams.temperatureEntityId && <Link2 size={10} className="text-emerald-600" />}
                                            </span>
                                        )}
                                        {isIntranet ? (
                                            <button
                                                type="button"
                                                className="flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                                                onClick={() => openAmsEntityModal(ams)}
                                            >
                                                <Droplets size={12} />
                                                {formatHumidity(ams.humidity)}
                                                {ams.humidityEntityId && <Link2 size={10} className="text-emerald-600" />}
                                            </button>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Droplets size={12} />
                                                {formatHumidity(ams.humidity)}
                                                {ams.humidityEntityId && <Link2 size={10} className="text-emerald-600" />}
                                            </span>
                                        )}
                                        {ams.drySetting && ams.drySetting.dryDuration !== -1 && (
                                            isMobile ? (
                                                <span
                                                    className="flex cursor-pointer items-center gap-1 text-orange-500"
                                                    onClick={() => {
                                                        const ds = ams.drySetting!
                                                        const fmtMinutes = (min?: number) => min == null ? '' : min >= 60 ? `${Math.floor(min / 60)}h${min % 60}m` : `${min}m`
                                                        const fmtHours = (hour?: number) => hour == null ? '' : `${hour}h`
                                                        toast.info('烘干中', {
                                                            description: [
                                                                ds.dryFilament && `材料: ${ds.dryFilament}`,
                                                                `温度: ${ds.dryTemperature}°C`,
                                                                `总时长: ${fmtHours(ds.dryDuration)}`,
                                                                ams.dryTime != null && ams.dryTime > 0 && `剩余: ${fmtMinutes(ams.dryTime)}`,
                                                            ].filter(Boolean).join(' · '),
                                                        })
                                                    }}
                                                >
                                                    <Flame size={12} />
                                                    <span>{ams.drySetting.dryTemperature}°C</span>
                                                    {ams.dryTime != null && ams.dryTime > 0 && (
                                                        <span className="text-muted-foreground">
                                                            {ams.dryTime >= 60 ? `${Math.floor(ams.dryTime / 60)}h${ams.dryTime % 60}m` : `${ams.dryTime}m`}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex cursor-default items-center gap-1 text-orange-500">
                                                            <Flame size={12} />
                                                            <span>{ams.drySetting.dryTemperature}°C</span>
                                                            {ams.dryTime != null && ams.dryTime > 0 && (
                                                                <span className="text-muted-foreground">
                                                                    {ams.dryTime >= 60 ? `${Math.floor(ams.dryTime / 60)}h${ams.dryTime % 60}m` : `${ams.dryTime}m`}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="space-y-1 text-xs">
                                                            <p>烘干中</p>
                                                            {ams.drySetting.dryFilament && <p>材料: {ams.drySetting.dryFilament}</p>}
                                                            <p>温度: {ams.drySetting.dryTemperature}°C</p>
                                                            <p>总时长: {ams.drySetting.dryDuration}h</p>
                                                            {ams.dryTime != null && ams.dryTime > 0 && <p>剩余: {ams.dryTime >= 60 ? `${Math.floor(ams.dryTime / 60)}h${ams.dryTime % 60}m` : `${ams.dryTime}m`}</p>}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        )}
                                        <span>使用: <strong
                                            className="text-foreground">{getCurrentSlotInfo(ams)}</strong></span>
                                    </div>
                                </div>
                                {/* Slots grid */}
                                <div className="grid grid-cols-4 gap-3 p-4">
                                    {ams.slots?.map(slot => {
                                        const active = isSlotActive(ams, slot)
                                        const color = formatColor(slot.spool?.color)
                                        const remaining = slot.spool?.remainingPercentage ?? 0
                                        return (
                                            <div key={slot.slotNo}
                                                className={`group relative cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md ${active ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}
                                                onClick={() => showSlotDetail(ams, slot)}>
                                                {/* Header */}
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span
                                                        className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{getSlotDisplayName(ams.amsNo, slot.slotNo)}</span>
                                                    {active ?
                                                        <Rocket size={12} className="text-primary" /> : slot.spool ?
                                                            <CheckCircle size={12} className="text-emerald-500" /> :
                                                            <Circle size={12} className="text-muted-foreground/40" />}
                                                </div>
                                                {/* Spool visu */}
                                                <div
                                                    className="relative mx-auto mb-2 h-20 w-10 overflow-hidden rounded-md border-2 border-border bg-muted/30 shadow-inner">
                                                    {slot.spoolId ? (
                                                        <div
                                                            className="absolute inset-0 flex items-end shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] bg-gradient-to-t from-gray-100 to-white dark:from-white/5 dark:to-white/10">
                                                            <div
                                                                className="w-full transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.1)] rounded-b-sm bg-gradient-to-t from-black/10 to-transparent"
                                                                style={{
                                                                    height: `${remaining}%`,
                                                                    backgroundColor: color || '#3b82f6'
                                                                }} />
                                                        </div>
                                                    ) : (<div
                                                        className="flex h-full items-center justify-center text-xs text-muted-foreground">-</div>)}
                                                    {slot.spoolId && (
                                                        <div
                                                            className={`absolute inset-x-0 bottom-1 flex items-center justify-center text-[11px] font-semibold pointer-events-none select-none ${isLightColor(color) ? 'text-black/75 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]' : 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.4)]'}`}>
                                                            {Math.round(slot.spool?.remainingWeight ?? 0)}g
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Material */}
                                                {slot.trayColor ? (
                                                    <div
                                                        className="rounded-md px-1.5 py-0.5 text-center text-[10px] font-medium"
                                                        style={{
                                                            backgroundColor: formatColor(slot.trayColor) || '#888',
                                                            color: isLightColor(formatColor(slot.trayColor)) ? '#333' : '#fff'
                                                        }}>
                                                        {slot.trayType || 'PLA'}
                                                    </div>
                                                ) : (<div
                                                    className="text-center text-[10px] text-muted-foreground">-</div>)}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={`${cardBase} flex items-center justify-center p-16`}>
                    <p className="text-muted-foreground">请选择一台打印机查看详细信息</p>
                </div>
            )}

            {/* ═══ MODALS ═══ */}

            <HmsErrorDialog
                open={hmsOpen}
                onOpenChange={setHmsOpen}
                printerName={selectedPrinter?.name}
                errors={hmsErrors}
            />

            <PrinterDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                printerId={selectedPrinter?.id}
                isIntranet={isIntranet}
                onChanged={loadPrinterList}
            />

            <AmsEntityDialog
                open={amsEntityOpen}
                onOpenChange={handleAmsEntityOpenChange}
                ams={editingAms}
                onSaved={async () => {
                    if (selectedId) await loadDetail(selectedId, true)
                }}
            />

            <SlotWorkflowDialogs
                open={slotOpen}
                onOpenChange={handleSlotDialogOpenChange}
                ams={currentAms}
                slot={currentSlot}
                printerId={selectedId}
                onReload={async () => {
                    if (selectedId) await loadDetail(selectedId)
                }}
            />
        </div>
    )
}
