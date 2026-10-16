import { DecimalInput } from '@/components/ui/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { isCustomBackgroundEnabled, isDepreciationEnabled } from '@/config/featureFlags'
import { TABLE_PAGE_SIZE_OPTIONS } from '@/utils/tablePageSize'
import {
    Circle,
    Code2,
    Filter,
    LayoutDashboard,
    Loader2,
    Maximize2,
    Minimize2,
    Monitor,
    Moon,
    Palette,
    Square,
    Sun,
    Type as TypeIcon,
    Wallet,
} from 'lucide-react'
import { useUserPreferences } from './useUserPreferences'
import type { AppFontFamily, CornerStyle, DesktopLayoutMode, ThemeMode } from '@/utils/appearancePreferences'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { cn } from '@/lib/utils'

const spoolStatusOptions = [
    { label: '所有', value: '-1' },
    { label: '未使用', value: '0' },
    { label: '使用中', value: '1' },
    { label: '消耗完', value: '2' },
    { label: '可使用', value: '3' },
]

const spoolRecordStatusOptions = [
    { label: '所有', value: 'all' },
    { label: '成功', value: '2' },
    { label: '已取消', value: '3' },
    { label: '正在打印', value: '4' },
]

const orderStatusOptions = [
    { label: '所有', value: 'all' },
    { label: '进行中', value: '1' },
    { label: '库存中', value: '4' },
    { label: '已完成', value: '2' },
    { label: '已取消', value: '3' },
]

const themeOptions: Array<{ label: string; value: ThemeMode; icon: typeof Sun }> = [
    { label: '自动', value: 'system', icon: Monitor },
    { label: '浅色', value: 'light', icon: Sun },
    { label: '深色', value: 'dark', icon: Moon },
]

const desktopLayoutOptions: Array<{ label: string; value: DesktopLayoutMode; icon: typeof Sun }> = [
    { label: '居中', value: 'centered', icon: Minimize2 },
    { label: '通栏', value: 'fullwidth', icon: Maximize2 },
]

const cornerStyleOptions: Array<{ label: string; value: CornerStyle; icon: typeof Sun }> = [
    { label: '圆角', value: 'rounded', icon: Circle },
    { label: '直角', value: 'sharp', icon: Square },
]

const appFontFamilyOptions: Array<{ label: string; value: AppFontFamily; icon: typeof Sun }> = [
    { label: '系统默认', value: 'system', icon: TypeIcon },
    { label: '系统等宽', value: 'system-mono', icon: Code2 },
    { label: 'JetBrains', value: 'jetbrains-mono', icon: Code2 },
]

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Sun
    title: string
    children: React.ReactNode
}) {
    return (
        <section className={cn(cardBase, 'flex flex-col')}>
            <header className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
                <Icon size={15} className="shrink-0 text-primary/70" />
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            </header>
            <div className="p-5">{children}</div>
        </section>
    )
}

function SegmentedOptionGroup<T extends string>({
    value,
    options,
    onChange,
}: {
    value?: T
    options: Array<{ label: string; value: T; icon?: typeof Sun }>
    onChange: (value: T) => void
}) {
    return (
        <div
            role="radiogroup"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1"
        >
            {options.map((option) => {
                const active = value === option.value
                return (
                    <button
                        key={option.value}
                        role="radio"
                        aria-checked={active}
                        type="button"
                        className={cn(
                            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                            active
                                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-card'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => onChange(option.value)}
                    >
                        {option.icon && <option.icon size={13} />}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

function StatusOptionGroup({
    value,
    options,
    onChange,
}: {
    value?: string
    options: Array<{ label: string; value: string }>
    onChange: (value: string) => void
}) {
    return (
        <div
            role="radiogroup"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1"
        >
            {options.map((option) => {
                const active = value === option.value
                return (
                    <button
                        key={option.value}
                        role="radio"
                        aria-checked={active}
                        type="button"
                        className={cn(
                            'inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-xs font-medium transition-colors',
                            active
                                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-card'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

function FieldRow({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            </div>
            {children}
        </div>
    )
}

export default function UserPreferencesView() {
    const {
        userConfigForm,
        userConfigLoading,
        userConfigSaving,
        updateAndSave,
        updateNumericField,
        commitNumericField,
        updateTextField,
        commitTextField,
        updatePageSize,
    } = useUserPreferences()

    const isMobile = useDeviceStore((s) => s.isMobile)

    if (userConfigLoading) {
        return (
            <div className={isMobile ? 'space-y-6 p-4 pb-10' : 'space-y-6 p-6 pb-12'}>
                <div className="border-b border-border/50 pb-4">
                    <Skeleton className="h-8 w-32" />
                </div>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn(cardBase, 'p-5')}>
                        <Skeleton className="mb-4 h-5 w-40" />
                        <div className="space-y-4">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={isMobile ? 'space-y-6 p-4 pb-10' : 'space-y-6 p-6 pb-12'}>
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">偏好设置</h1>
                {userConfigSaving && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 size={12} className="animate-spin" />
                        正在保存
                    </div>
                )}
            </div>

            {/* ── Cost & Quote ── */}
            <SectionCard icon={Wallet} title="成本与报价">
                <div className="grid gap-5 sm:grid-cols-2">
                    <FieldRow label="设备功率" hint="瓦特 (W)">
                        <DecimalInput
                            min={0}
                            step={1}
                            value={userConfigForm.powerWatt ?? ''}
                            onValueChange={(value) => updateNumericField('powerWatt', value)}
                            onBlur={() => void commitNumericField('powerWatt')}
                            placeholder="例如 300"
                        />
                    </FieldRow>
                    <FieldRow label="电价" hint="元 / kWh">
                        <DecimalInput
                            min={0}
                            step={0.01}
                            value={userConfigForm.electricityPricePerKwh ?? ''}
                            onValueChange={(value) => updateNumericField('electricityPricePerKwh', value)}
                            onBlur={() => void commitNumericField('electricityPricePerKwh')}
                            placeholder="例如 0.50"
                        />
                    </FieldRow>
                    {isDepreciationEnabled && (
                        <FieldRow label="折旧成本" hint="元 / 小时">
                            <DecimalInput
                                min={0}
                                step={0.01}
                                value={userConfigForm.depreciationPerHour ?? ''}
                                onValueChange={(value) => updateNumericField('depreciationPerHour', value)}
                                onBlur={() => void commitNumericField('depreciationPerHour')}
                                placeholder="例如 2.00"
                            />
                        </FieldRow>
                    )}
                    <FieldRow label="人工成本" hint="元 / 小时">
                        <DecimalInput
                            min={0}
                            step={0.01}
                            value={userConfigForm.laborCostPerHour ?? ''}
                            onValueChange={(value) => updateNumericField('laborCostPerHour', value)}
                            onBlur={() => void commitNumericField('laborCostPerHour')}
                            placeholder="例如 8.00"
                        />
                    </FieldRow>
                </div>
            </SectionCard>

            {/* ── Appearance ── */}
            <SectionCard icon={Palette} title="界面外观">
                <div className="grid gap-5">
                    <FieldRow label="桌面端主题">
                        <SegmentedOptionGroup
                            value={userConfigForm.desktopTheme as ThemeMode | undefined}
                            options={themeOptions}
                            onChange={(value) => void updateAndSave({ desktopTheme: value })}
                        />
                    </FieldRow>
                    <FieldRow label="移动端主题">
                        <SegmentedOptionGroup
                            value={userConfigForm.mobileTheme as ThemeMode | undefined}
                            options={themeOptions}
                            onChange={(value) => void updateAndSave({ mobileTheme: value })}
                        />
                    </FieldRow>
                    <FieldRow label="桌面端布局">
                        <SegmentedOptionGroup
                            value={userConfigForm.desktopLayout as DesktopLayoutMode | undefined}
                            options={desktopLayoutOptions}
                            onChange={(value) => void updateAndSave({ desktopLayout: value })}
                        />
                    </FieldRow>
                    <FieldRow label="界面圆角">
                        <SegmentedOptionGroup
                            value={userConfigForm.cornerStyle as CornerStyle | undefined}
                            options={cornerStyleOptions}
                            onChange={(value) => void updateAndSave({ cornerStyle: value })}
                        />
                    </FieldRow>
                    <FieldRow label="界面字体" hint="等宽字体可能影响换行">
                        <SegmentedOptionGroup
                            value={userConfigForm.font as AppFontFamily | undefined}
                            options={appFontFamilyOptions}
                            onChange={(value) => void updateAndSave({ font: value })}
                        />
                    </FieldRow>
                    {isCustomBackgroundEnabled && (
                        <>
                            <FieldRow label="桌面端背景图 URL" hint="留空使用默认">
                                <Input
                                    value={userConfigForm.webBackgroundUrl ?? ''}
                                    onChange={(event) => updateTextField('webBackgroundUrl', event.target.value)}
                                    onBlur={() => void commitTextField('webBackgroundUrl')}
                                    placeholder="https://example.com/bg-desktop.jpg"
                                    inputMode="url"
                                />
                            </FieldRow>
                            <FieldRow label="移动端背景图 URL" hint="留空使用默认">
                                <Input
                                    value={userConfigForm.mobileBackgroundUrl ?? ''}
                                    onChange={(event) => updateTextField('mobileBackgroundUrl', event.target.value)}
                                    onBlur={() => void commitTextField('mobileBackgroundUrl')}
                                    placeholder="https://example.com/bg-mobile.jpg"
                                    inputMode="url"
                                />
                            </FieldRow>
                        </>
                    )}
                </div>
            </SectionCard>

            {/* ── Display ── */}
            <SectionCard icon={LayoutDashboard} title="页面展示">
                <div className="grid gap-5 sm:grid-cols-2">
                    <FieldRow label="表格每页条数">
                        <Select
                            value={String(userConfigForm.pageSize ?? TABLE_PAGE_SIZE_OPTIONS[0])}
                            onValueChange={(value) => void updatePageSize(Number(value))}
                        >
                            <SelectTrigger className="w-full cursor-pointer">
                                <SelectValue placeholder="选择每页条数" />
                            </SelectTrigger>
                            <SelectContent>
                                {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size} 条/页
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldRow>
                </div>
            </SectionCard>

            {/* ── Default filters ── */}
            <SectionCard icon={Filter} title="默认状态筛选">
                <div className="grid gap-5">
                    <FieldRow label="耗材默认状态">
                        <StatusOptionGroup
                            value={userConfigForm.spoolDefaultStatus}
                            options={spoolStatusOptions}
                            onChange={(value) => void updateAndSave({ spoolDefaultStatus: value })}
                        />
                    </FieldRow>
                    <FieldRow label="打印记录默认状态">
                        <StatusOptionGroup
                            value={userConfigForm.spoolRecordDefaultStatus}
                            options={spoolRecordStatusOptions}
                            onChange={(value) => void updateAndSave({ spoolRecordDefaultStatus: value })}
                        />
                    </FieldRow>
                    <FieldRow label="订单默认状态">
                        <StatusOptionGroup
                            value={userConfigForm.orderDefaultStatus}
                            options={orderStatusOptions}
                            onChange={(value) => void updateAndSave({ orderDefaultStatus: value })}
                        />
                    </FieldRow>
                </div>
            </SectionCard>
        </div>
    )
}
