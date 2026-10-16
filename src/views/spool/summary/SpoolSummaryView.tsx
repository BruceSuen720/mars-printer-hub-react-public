import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw, Loader2, Package, DollarSign, Weight, TrendingDown, Layers, ArrowRight, Camera, RotateCcw, TrendingUp } from 'lucide-react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getSpoolSummary } from '@/api/spool'
import { useRemoteColorConfig } from '@/hooks/useRemoteConfig'
import { isDepreciationEnabled } from '@/config/featureFlags'
import { showRequestError } from '@/request'
import { cn } from '@/lib/utils'
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { useDeviceStore } from '@/stores/useDeviceStore'

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'
const sectionTitle = 'text-lg font-semibold tracking-tight text-foreground'

const isLightHex = (hex: string) => {
    const c = hex.replace('#', ''); if (c.length !== 6) return false
    const b = parseInt(c, 16); return ((((b >> 16) & 255) * 299 + ((b >> 8) & 255) * 587 + (b & 255) * 114) / 1000) > 128
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

/* ── Icon-based Feature Highlight Card ── */
function FeatureHighlight({ title, value, unit, icon: Icon, loading }: { title: string; value: number | string; unit?: string; icon: React.ElementType; loading: boolean }) {
    return (
        <div className={cn(cardBase, 'group relative overflow-hidden p-5 transition-colors hover:border-primary/40')}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    {loading ? <Skeleton className="mt-3 h-8 w-20" /> : (
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                                {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
                            </span>
                            {unit && <span className="ml-0.5 text-xs font-medium text-muted-foreground">{unit}</span>}
                        </div>
                    )}
                </div>
                <Icon size={18} className="shrink-0 text-primary/70" />
            </div>
        </div>
    )
}

/* ── Real-time Data Visualization Hero ── */
interface UsageStatus { unused?: number; inUse?: number; finished?: number }

function VisualizerHero({
    materialItems,
    usageData,
    loading,
    activeMaterialType,
    onMaterialClick,
}: {
    materialItems: [string, number][]
    usageData?: UsageStatus
    loading: boolean
    activeMaterialType?: string
    onMaterialClick?: (materialType: string) => void
}) {
    const materialChartData = useMemo(() => {
        return materialItems.map(([name, value], index) => ({
            name,
            value,
            color: PALETTE[index % PALETTE.length],
        }))
    }, [materialItems])

    const totalUsage = usageData ? ((usageData.unused ?? 0) + (usageData.inUse ?? 0) + (usageData.finished ?? 0)) : 1;

    return (
        <div className={cn(cardBase, 'col-span-full p-5 xl:col-span-2')}>
            <div className="mb-5 flex items-baseline justify-between gap-3">
                <h2 className={sectionTitle}>库存数据概览</h2>
                {activeMaterialType && (
                    <span className="text-xs text-muted-foreground">已筛选: <span className="font-medium text-foreground">{activeMaterialType}</span></span>
                )}
            </div>

            {loading ? (
                <div className="h-[280px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center md:h-[280px]">
                    <div className="h-[240px] md:h-full w-full">
                        {materialItems.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={materialChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius="50%"
                                        outerRadius="75%"
                                        paddingAngle={1}
                                        stroke="transparent"
                                    >
                                        {materialChartData.map((item) => (
                                            <Cell
                                                key={item.name}
                                                fill={item.color}
                                                opacity={activeMaterialType && activeMaterialType !== item.name ? 0.4 : 1}
                                                className="cursor-pointer outline-none"
                                                onClick={() => onMaterialClick?.(item.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => [value, '数量']} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">暂无材料数据</div>}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-4">库存使用状态</h3>
                            {/* Segmented bar */}
                            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                                {(usageData?.unused ?? 0) > 0 && (
                                    <div className="h-full transition-all duration-500" style={{ width: `${((usageData?.unused ?? 0) / totalUsage) * 100}%`, backgroundColor: '#10b981' }} />
                                )}
                                {(usageData?.inUse ?? 0) > 0 && (
                                    <div className="h-full transition-all duration-500" style={{ width: `${((usageData?.inUse ?? 0) / totalUsage) * 100}%`, backgroundColor: '#3b82f6' }} />
                                )}
                                {(usageData?.finished ?? 0) > 0 && (
                                    <div className="h-full transition-all duration-500" style={{ width: `${((usageData?.finished ?? 0) / totalUsage) * 100}%`, backgroundColor: '#ef4444' }} />
                                )}
                            </div>
                            {/* Legend */}
                            <div className="mt-4 space-y-0.5">
                                {([
                                    { label: '未使用', value: usageData?.unused ?? 0, color: '#10b981' },
                                    { label: '使用中', value: usageData?.inUse ?? 0, color: '#3b82f6' },
                                    { label: '消耗完', value: usageData?.finished ?? 0, color: '#ef4444' },
                                ] as const).map(item => {
                                    const pct = totalUsage > 0 ? Math.round((item.value / totalUsage) * 100) : 0
                                    return (
                                        <div key={item.label} className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/40">
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-[13px] text-foreground/80">{item.label}</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[15px] font-semibold tabular-nums tracking-tight text-foreground">{item.value}</span>
                                                <span className="text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Pricing Card ── */
interface PricingCardProps {
    title: string
    range?: string
    count?: number
    percent: number
    color: string
    isPopular: boolean
    onClick?: () => void
}

function PricingCard({ title, range, count, percent, color, isPopular, onClick }: PricingCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                cardBase,
                'group relative flex cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm',
                isPopular && 'border-primary/60 shadow-sm',
            )}
        >
            {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                    最主要耗材
                </div>
            )}

            <div className="flex items-center gap-2">
                <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{range}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
                <div>
                    <div className="text-[11px] text-muted-foreground">数量</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{count}<span className="ml-0.5 text-xs font-normal text-muted-foreground">个</span></div>
                </div>
                <div>
                    <div className="text-[11px] text-muted-foreground">占比</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{percent}<span className="ml-0.5 text-xs font-normal text-muted-foreground">%</span></div>
                </div>
            </div>

            {/* Progress hint */}
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
                />
            </div>

            <div className="mt-5 flex items-center justify-between text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                <span>查看明细</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
        </div>
    )
}

/* ── Standard Distribution Panel ── */
function DistPanel({ title, count, action, children, loading }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode; loading: boolean }) {
    return (
        <div className={cn(cardBase, 'flex h-full min-h-[300px] flex-col overflow-hidden')}>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-2">
                    <h3 className={sectionTitle}>{title}</h3>
                    {typeof count === 'number' && count > 0 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>
                    )}
                </div>
                {action}
            </div>
            <div className="themed-scrollbar flex-1 overflow-y-auto p-3">
                {loading ? (
                    <div className="space-y-2 p-1">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
                ) : children}
            </div>
        </div>
    )
}

function DistRow({ label, count, tagColor, onClick, active }: { label: string; count: number; tagColor: string; onClick?: () => void; active?: boolean }) {
    return (
        <div
            className={cn(
                'flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                onClick && 'cursor-pointer',
                active && 'border-primary/40 bg-primary/5',
            )}
            onClick={onClick}
        >
            <span className="truncate text-foreground">{label}</span>
            <span
                className="ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ backgroundColor: `${tagColor}14`, color: tagColor }}
            >
                {count}
            </span>
        </div>
    )
}

function ColorRow({ color, name, count }: { color: string; name?: string; count: number }) {
    const light = isLightHex(color)
    return (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50">
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className={cn(
                        'h-4 w-4 shrink-0 rounded-full ring-1',
                        light ? 'ring-border' : 'ring-border/40',
                    )}
                    style={{ backgroundColor: color }}
                />
                <span className="truncate text-xs font-medium text-muted-foreground">{name || color}</span>
            </div>
            <span className="ml-2 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>
        </div>
    )
}

/* ── Bar Visualizer ── */
function BarVisual({ items, colorFn }: { items: { label: string; value: number }[]; colorFn: (i: number) => string }) {
    const max = Math.max(...items.map(i => i.value), 1)
    return (
        <div className="space-y-2.5">
            {items.map((item, i) => (
                <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="truncate text-muted-foreground">{item.label}</span>
                        <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: colorFn(i) }} />
                    </div>
                </div>
            ))}
        </div>
    )
}

const inboundTrendChartConfig = {
    count: {
        label: '入库数量',
        color: '#2563eb',
    },
    amount: {
        label: '入库金额',
        color: '#f97316',
    },
}

function InboundTrendChart({ items, loading }: { items: API.DailyInboundStats[]; loading: boolean }) {
    const chartData = useMemo(() => items.map((item) => ({
        date: item.date ?? '',
        label: item.date ? dayjs(item.date).format('MM-DD') : '--',
        count: item.count ?? 0,
        amount: item.amount ?? 0,
    })), [items])

    const totalCount = useMemo(() => chartData.reduce((s, d) => s + d.count, 0), [chartData])
    const totalAmount = useMemo(() => chartData.reduce((s, d) => s + d.amount, 0), [chartData])

    return (
        <div className={cn(cardBase, 'hidden p-5 md:block')}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={17} className="text-muted-foreground" />
                    <h2 className={sectionTitle}>近30天入库趋势</h2>
                </div>
                {!loading && chartData.length > 0 && (
                    <div className="flex items-center gap-5 text-xs">
                        <div className="flex items-baseline gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                            <span className="text-muted-foreground">入库数量</span>
                            <span className="font-semibold tabular-nums text-foreground">{totalCount}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
                            <span className="text-muted-foreground">入库金额</span>
                            <span className="font-semibold tabular-nums text-foreground">¥{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : chartData.length ? (
                <ChartContainer config={inboundTrendChartConfig} className="h-[280px] w-full">
                    <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis
                            yAxisId="count"
                            width={36}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <YAxis
                            yAxisId="amount"
                            orientation="right"
                            width={52}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `¥${value}`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="line"
                                    labelFormatter={(_, payload) => String(payload?.[0]?.payload?.date ?? '')}
                                    formatter={(value, name) => name === 'amount' ? `¥${Number(value ?? 0).toFixed(2)}` : value}
                                />
                            }
                        />
                        <Line
                            yAxisId="count"
                            dataKey="count"
                            type="monotone"
                            stroke="var(--color-count)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            yAxisId="amount"
                            dataKey="amount"
                            type="monotone"
                            stroke="var(--color-amount)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">暂无近30天入库数据</div>
            )}
        </div>
    )
}

export default function SpoolSummaryView() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<API.SpoolSummaryVO | null>(null)
    const [filterMode, setFilterMode] = useState<'全部' | '可用'>('全部')
    const [brandFilter, setBrandFilter] = useState<string>()
    const [materialTypeFilter, setMaterialTypeFilter] = useState<string>()
    const [capturing, setCapturing] = useState(false)
    const pageRef = useRef<HTMLDivElement>(null)
    const summaryRequestIdRef = useRef(0)

    const handleScreenshot = useCallback(async () => {
        if (!pageRef.current || capturing) return
        setCapturing(true)
        try {
            const { toPng } = await import('html-to-image')
            const dataUrl = await toPng(pageRef.current, {
                pixelRatio: 2,
                cacheBust: true,
                filter: (node: Node) => {
                    if (node instanceof HTMLLinkElement && node.rel === 'stylesheet' && node.href?.includes('fonts.googleapis.com')) {
                        return false
                    }
                    return true
                },
            })
            const link = document.createElement('a')
            link.download = `耗材汇总_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
            link.href = dataUrl
            link.click()
            toast.success('截图已保存')
        } catch (err) {
            console.error('截图失败:', err)
            toast.error('截图失败，请重试')
        } finally {
            setCapturing(false)
        }
    }, [capturing])

    const fetchData = useCallback(async (
        mode: '全部' | '可用',
        brand?: string,
        materialType?: string,
    ) => {
        const requestId = ++summaryRequestIdRef.current
        setLoading(true)
        try {
            const res = await getSpoolSummary({
                excludeFinished: mode === '可用',
                brand,
                materialType,
            })
            if (requestId === summaryRequestIdRef.current && res.data?.data) setData(res.data.data)
        } catch (error) {
            if (requestId === summaryRequestIdRef.current) showRequestError(error, '获取汇总数据失败')
        } finally {
            if (requestId === summaryRequestIdRef.current) setLoading(false)
        }
    }, [])

    const { colorConfig, ensureColorConfigLoaded } = useRemoteColorConfig()

    useEffect(() => {
        fetchData(filterMode, brandFilter, materialTypeFilter)
    }, [brandFilter, fetchData, filterMode, materialTypeFilter])

    useEffect(() => {
        ensureColorConfigLoaded()
    }, [ensureColorConfigLoaded])

    const avgPrice = useMemo(() => data?.totalCount ? (data.totalPrice ?? 0) / data.totalCount : 0, [data])
    const formatCurrency = useCallback((value?: number) => `¥${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, [])
    const hasAdvancedFilters = Boolean(brandFilter || materialTypeFilter)

    const applyBrandFilter = useCallback((brand: string) => {
        const nextBrand = brandFilter === brand ? undefined : brand
        setBrandFilter(nextBrand)
    }, [brandFilter])

    const applyMaterialTypeFilter = useCallback((materialType: string) => {
        const nextMaterialType = materialTypeFilter === materialType ? undefined : materialType
        setMaterialTypeFilter(nextMaterialType)
    }, [materialTypeFilter])

    const resetFilters = useCallback(() => {
        setBrandFilter(undefined)
        setMaterialTypeFilter(undefined)
    }, [])

    /* Distribution data */
    const materialItems = useMemo(() => Object.entries(data?.materialTypeDistribution ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number)), [data])
    const brandItems = useMemo(() => Object.entries(data?.brandDistribution ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number)), [data])
    const colorItems = useMemo(() => Object.entries(data?.colorDistribution ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number)), [data])
    const priceRanges = useMemo(() => data?.priceRangeDistribution ?? [], [data?.priceRangeDistribution])
    const recent30DaysInboundStats = useMemo(() => data?.recent30DaysInboundStats ?? [], [data?.recent30DaysInboundStats])

    // Sort and calculate max for pricing tiers
    const sortedRanges = useMemo(() => [...priceRanges].sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0)), [priceRanges])
    const maxRangeCount = useMemo(() => Math.max(...sortedRanges.map(r => r.count ?? 0), 1), [sortedRanges])
    const tierNames = ['极致羊毛款', '超高性价比', '日常口粮款', '稳定主力款', '高端旗舰款', '价格天花板']
    const tierColors = ['#10b981', '#0ea5e9', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']
    const isMobile = useDeviceStore((s) => s.isMobile)

    return (
        <div ref={pageRef} className={isMobile ? 'space-y-6 p-4 pb-10' : 'space-y-6 p-6 pb-12'}>
            {/* ── Page Header ── */}
            <div className="border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">耗材汇总</h1>
            </div>

            {/* Filter and Actions Panel */}
            <div className={cn(cardBase, 'flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4')}>
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs
                        value={filterMode}
                        onValueChange={(v) => {
                            const nextMode = v as '全部' | '可用'
                            setFilterMode(nextMode)
                        }}
                    >
                        <TabsList className="h-9 bg-muted/80 p-1 shadow-none">
                            <TabsTrigger value="全部" className="cursor-pointer px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-card">全部</TabsTrigger>
                            <TabsTrigger value="可用" className="cursor-pointer px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-card">可用</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {hasAdvancedFilters && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {brandFilter && (
                                <button
                                    type="button"
                                    onClick={() => setBrandFilter(undefined)}
                                    className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                                    title="点击移除"
                                >
                                    <span className="text-muted-foreground">品牌</span>
                                    {brandFilter}
                                    <span className="text-muted-foreground group-hover:text-destructive">×</span>
                                </button>
                            )}
                            {materialTypeFilter && (
                                <button
                                    type="button"
                                    onClick={() => setMaterialTypeFilter(undefined)}
                                    className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                                    title="点击移除"
                                >
                                    <span className="text-muted-foreground">材料</span>
                                    {materialTypeFilter}
                                    <span className="text-muted-foreground group-hover:text-destructive">×</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleScreenshot} disabled={capturing} className="h-9 cursor-pointer">
                        {capturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera size={14} />} 截图
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchData(filterMode, brandFilter, materialTypeFilter)} disabled={loading} className="h-9 cursor-pointer">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw size={14} />} 刷新
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasAdvancedFilters || loading} className="h-9 cursor-pointer">
                        <RotateCcw size={14} /> 重置
                    </Button>
                </div>
            </div>

            {/* ── Feature Highlights (Stats) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <FeatureHighlight title="耗材总数量" value={data?.totalCount ?? 0} unit="个" icon={Package} loading={loading} />
                <FeatureHighlight title="耗材总价值" value={formatCurrency(data?.totalPrice)} icon={DollarSign} loading={loading} />
                <FeatureHighlight title="平均单价" value={`¥${typeof avgPrice === 'number' ? avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}`} icon={DollarSign} loading={loading} />
                <FeatureHighlight title="初始净重" value={data?.totalNetWeight ?? 0} unit="g" icon={Weight} loading={loading} />
                <FeatureHighlight title="消耗重量" value={data?.totalUsedWeight ?? 0} unit="g" icon={TrendingDown} loading={loading} />
                <FeatureHighlight title="剩余可用" value={data?.totalRemainingWeight ?? 0} unit="g" icon={Layers} loading={loading} />
                {isDepreciationEnabled && (
                    <>
                        <FeatureHighlight title="总成本" value={formatCurrency(data?.totalCost)} icon={DollarSign} loading={loading} />
                        <FeatureHighlight title="总电费" value={formatCurrency(data?.totalElectricityCost)} icon={DollarSign} loading={loading} />
                        <FeatureHighlight title="总折损" value={formatCurrency(data?.totalDepreciationCost)} icon={DollarSign} loading={loading} />
                    </>
                )}
            </div>

            {/* ── Visualizer Hero & Brand Panel ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <VisualizerHero
                    materialItems={materialItems as [string, number][]}
                    usageData={data?.usageStatusDistribution}
                    loading={loading}
                    activeMaterialType={materialTypeFilter}
                    onMaterialClick={applyMaterialTypeFilter}
                />

                <div className="col-span-1">
                    <DistPanel title="品牌分布" count={brandItems.length} loading={loading}>
                        {brandItems.length ? (
                            <div className="flex h-full flex-col">
                                <div className="themed-scrollbar max-h-[160px] space-y-0.5 overflow-y-auto pr-1">
                                    {brandItems.map(([brand, count]) => (
                                        <DistRow
                                            key={brand}
                                            label={brand}
                                            count={count as number}
                                            tagColor="#8b5cf6"
                                            active={brandFilter === brand}
                                            onClick={() => applyBrandFilter(brand)}
                                        />
                                    ))}
                                </div>
                                <div className="mt-4 shrink-0 border-t border-border/50 px-2 pt-4">
                                    <div className="mb-2.5 text-[11px] font-medium text-muted-foreground">Top 3 品牌</div>
                                    <BarVisual items={brandItems.slice(0, 3).map(([l, v]) => ({ label: l, value: v as number }))} colorFn={i => PALETTE[(i + 4) % PALETTE.length]} />
                                </div>
                            </div>
                        ) : <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>}
                    </DistPanel>
                </div>
            </div>

            <InboundTrendChart items={recent30DaysInboundStats} loading={loading} />

            {/* ── Pricing Table (Price Range Distribution) ── */}
            <div className={cn(cardBase, 'space-y-5 p-5')}>
                <div className="flex items-center gap-2">
                    <DollarSign size={17} className="text-muted-foreground" />
                    <h2 className={sectionTitle}>价格区间分布</h2>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[220px] w-full rounded-xl" />)}
                    </div>
                ) : sortedRanges.length ? (
                    <div className="grid grid-cols-1 items-stretch gap-4 pb-2 md:grid-cols-2 lg:grid-cols-4">
                        {sortedRanges.map((r, i) => {
                            const isPopular = r.count === maxRangeCount && (r.count ?? 0) > 0;
                            const percent = data?.totalCount ? Math.round(((r.count || 0) / data.totalCount) * 100) : 0;
                            return (
                                <PricingCard
                                    key={r.priceRange}
                                    title={tierNames[i % tierNames.length]}
                                    range={r.priceRange}
                                    count={r.count}
                                    percent={percent}
                                    isPopular={isPopular}
                                    color={tierColors[i % tierColors.length]}
                                    onClick={() => navigate(`/spool/manage?${r.minPrice != null ? `minPrice=${r.minPrice}&` : ''}${r.maxPrice != null ? `maxPrice=${r.maxPrice}` : ''}`)}
                                />
                            )
                        })}
                    </div>
                ) : <p className="py-8 text-center text-sm text-muted-foreground">暂无区间数据</p>}
            </div>

            {/* ── Other Distributions ── */}
            <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
                <DistPanel title="材料类型细分" count={materialItems.length} loading={loading}>
                    {materialItems.length ? (
                        <div className="themed-scrollbar max-h-[240px] space-y-0.5 overflow-y-auto pr-1">
                            {materialItems.map(([type, count]) => (
                                <DistRow
                                    key={type}
                                    label={type}
                                    count={count as number}
                                    tagColor="#3b82f6"
                                    active={materialTypeFilter === type}
                                    onClick={() => applyMaterialTypeFilter(type)}
                                />
                            ))}
                        </div>
                    ) : <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>}
                </DistPanel>

                <DistPanel title="颜色分布" count={colorItems.length} loading={loading}>
                    {colorItems.length ? (
                        <div className="themed-scrollbar max-h-[240px] space-y-0.5 overflow-y-auto pr-1">
                            {colorItems.map(([color, count]) => {
                                const match = colorConfig?.find(c => c.hex.toLowerCase() === color.toLowerCase())
                                return <ColorRow key={color} color={color} name={match ? match.name : color} count={count as number} />
                            })}
                        </div>
                    ) : <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>}
                </DistPanel>
            </div>
        </div>
    )
}
