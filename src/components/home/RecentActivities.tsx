import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, PlusCircle, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { FormattedTime } from '@/components/ui/formatted-time'
import { SpoolAppearanceTag } from '@/components/spool/SpoolAppearanceTag'
import { useRemoteSpoolConfig } from '@/hooks/useRemoteConfig'
import { cn } from '@/lib/utils'

interface RecentActivitiesProps {
    summaryData?: API.HomeVO
    loading?: boolean
}

const panelBase =
    'flex h-[500px] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs'

function getRemainingColor(percent: number) {
    if (percent <= 10) return '#ef4444'
    if (percent <= 30) return '#f59e0b'
    return '#10b981'
}

interface ColumnHeaderProps {
    title: string
    count?: number
    icon: React.ReactNode
}

function ColumnHeader({ title, count, icon }: ColumnHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
                <span className="shrink-0 text-primary/70">{icon}</span>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            </div>
            {typeof count === 'number' && count > 0 && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {count}
                </span>
            )}
        </div>
    )
}

export default function RecentActivities({ summaryData, loading }: RecentActivitiesProps) {
    const navigate = useNavigate()
    const { spoolConfig, ensureSpoolConfigLoaded } = useRemoteSpoolConfig()

    const getBrandLogo = (brandName?: string) => {
        if (!brandName || !spoolConfig) return ''
        const brand = spoolConfig.brands.find((b) => b.name === brandName)
        return brand?.logo || ''
    }

    useEffect(() => {
        void ensureSpoolConfigLoaded()
    }, [ensureSpoolConfigLoaded])

    const goToSpoolDetail = (id?: number) => {
        if (id) {
            navigate(`/spool/detail/${id}`)
        }
    }

    /* ── Column: 最近使用 ── */
    const usedRecords = summaryData?.last10UsedRecords ?? []
    /* ── Column: 最近添加 ── */
    const recentlyAdded = summaryData?.recentlyAdded ?? []
    /* ── Column: 库存不足 ── */
    const lowStock = summaryData?.lowStock ?? []

    const renderSkeleton = () => (
        <div className="space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )

    const emptyState = (text: string, accent: string, icon: React.ReactNode) => (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}12`, color: accent }}
            >
                {icon}
            </div>
            <span className="text-sm text-muted-foreground">{text}</span>
        </div>
    )

    const itemBase =
        'flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border/70 hover:bg-muted/40'

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── 最近使用 ── */}
            <div className={panelBase}>
                <ColumnHeader title="最近使用" count={usedRecords.length} icon={<History size={15} />} />
                {loading ? (
                    renderSkeleton()
                ) : usedRecords.length === 0 ? (
                    emptyState('暂无最近使用的耗材', '#0ea5e9', <History size={18} />)
                ) : (
                    <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto p-2.5">
                        {usedRecords.map((item) => (
                            <div
                                key={item.id ?? item.spoolId}
                                className={itemBase}
                                onClick={() => goToSpoolDetail(item.spoolId)}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/15">
                                    {item.coverUrl ? (
                                        <img src={item.coverUrl} alt={item.spoolName} className="h-full w-full object-cover" />
                                    ) : (
                                        <History size={17} />
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-foreground" title={item.spoolName}>
                                            {item.spoolName}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                            <FormattedTime time={item.createTime} />
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={item.title || '-'}>
                                            {item.title || '-'}
                                        </span>
                                        <span className="shrink-0 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                                            {item.actualWeight} g
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── 最近添加 ── */}
            <div className={panelBase}>
                <ColumnHeader title="最近添加" count={recentlyAdded.length} icon={<PlusCircle size={15} />} />
                {loading ? (
                    renderSkeleton()
                ) : recentlyAdded.length === 0 ? (
                    emptyState('暂无最近添加的耗材', '#10b981', <PlusCircle size={18} />)
                ) : (
                    <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto p-2.5">
                        {recentlyAdded.map((item) => {
                            const brandLogo = getBrandLogo(item.brand)
                            return (
                                <div
                                    key={item.id}
                                    className={itemBase}
                                    onClick={() => goToSpoolDetail(item.id)}
                                >
                                    <div
                                        className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1',
                                            brandLogo
                                                ? 'bg-background ring-border/60'
                                                : 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/15',
                                        )}
                                    >
                                        {brandLogo ? (
                                            <img src={brandLogo} alt={item.brand || item.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <PlusCircle size={17} />
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-foreground" title={item.name}>
                                                {item.name}
                                            </span>
                                            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                                <FormattedTime time={item.createTime} />
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs text-muted-foreground">{item.materialType}</span>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {item.color && (
                                                    <span
                                                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border/60"
                                                        style={{ backgroundColor: item.color }}
                                                        title={item.color}
                                                    />
                                                )}
                                                {item.appearance != null && (
                                                    <SpoolAppearanceTag appearanceId={item.appearance} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── 库存不足 ── */}
            <div className={panelBase}>
                <ColumnHeader title="库存不足" count={lowStock.length} icon={<AlertTriangle size={15} />} />
                {loading ? (
                    renderSkeleton()
                ) : lowStock.length === 0 ? (
                    emptyState('暂无库存不足的耗材', '#10b981', <AlertTriangle size={18} />)
                ) : (
                    <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto p-2.5">
                        {lowStock.map((item) => {
                            const brandLogo = getBrandLogo(item.brand)
                            const percent = Math.min(item.remainingPercentage ?? 0, 100)
                            const barColor = getRemainingColor(item.remainingPercentage ?? 0)
                            return (
                                <div
                                    key={item.id}
                                    className={itemBase}
                                    onClick={() => goToSpoolDetail(item.id)}
                                >
                                    <div
                                        className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1',
                                            brandLogo
                                                ? 'bg-background ring-border/60'
                                                : 'bg-red-500/10 text-red-500 ring-red-500/15',
                                        )}
                                    >
                                        {brandLogo ? (
                                            <img src={brandLogo} alt={item.brand || item.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <AlertTriangle size={17} />
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-foreground" title={item.name}>
                                                {item.name}
                                            </span>
                                            <span
                                                className="shrink-0 text-sm font-semibold tabular-nums"
                                                style={{ color: barColor }}
                                            >
                                                {item.remainingWeight ?? 0}g
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="truncate text-xs text-muted-foreground">{item.materialType}</span>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: barColor,
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    className="w-8 text-right text-[11px] font-medium tabular-nums"
                                                    style={{ color: barColor }}
                                                >
                                                    {percent}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
