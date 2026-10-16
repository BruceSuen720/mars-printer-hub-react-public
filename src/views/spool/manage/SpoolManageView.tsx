import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    Plus,
    Search,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    BarChart3,
    Copy,
    Crosshair,
    Trash2,
    SlidersHorizontal,
} from 'lucide-react'
import {Button, iconTextUniformWidthClass} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Combobox} from '@/components/ui/combobox'
import {MultiCombobox} from '@/components/ui/multi-combobox'
import {Skeleton} from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
import {useSpoolManage} from './useSpoolManage'
import {useDeviceStore} from '@/stores/useDeviceStore'
import AddSpoolModal from '@/components/spool/AddSpoolModal'
import CalibrateModal from '@/components/spool/CalibrateModal'
import {FormattedTime} from '@/components/ui/formatted-time'
import {SpoolAppearanceTag} from '@/components/spool/SpoolAppearanceTag'
import {DecimalInput} from '@/components/ui/decimal-input'
import {Kbd, KbdGroup} from '@/components/ui/kbd'
import {CommandDialog, CommandInput} from '@/components/ui/command'
import {useUserConfigStore} from '@/stores/useUserConfigStore'
import {getTablePageSizeOptions, normalizeTablePageSize} from '@/utils/tablePageSize'
import {cn} from '@/lib/utils'

/* ── Card style (matches home / summary pages) ── */
const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'
const desktopFilterSelectWidth = 'w-[180px]'

/* ── Sortable header ── */
function SortHeader({
                        label,
                        field,
                        currentField,
                        currentOrder,
                        onSort,
                    }: {
    label: string
    field: string
    currentField: string
    currentOrder: string
    onSort: (field: string, order: 'asc' | 'desc' | '') => void
}) {
    const active = currentField === field
    const nextOrder = !active ? 'asc' : currentOrder === 'asc' ? 'desc' : ''

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto cursor-pointer items-center gap-1 p-0 text-left font-medium hover:bg-transparent"
            onClick={() => onSort(field, nextOrder as 'asc' | 'desc' | '')}
        >
            {label}
            <ArrowUpDown
                size={13}
                className={active ? 'text-primary' : 'text-muted-foreground/50'}
            />
        </Button>
    )
}

function MobileFilterTag({
    selected,
    onClick,
    children,
}: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs transition-colors',
                selected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-muted/40 text-muted-foreground',
            )}
        >
            {children}
        </button>
    )
}

function RemainingWeightBar({
    percentage,
    color,
    className,
}: {
    percentage: number
    color: string
    className?: string
}) {
    const clamped = Math.max(0, Math.min(100, percentage))

    return (
        <div className={cn('overflow-hidden rounded-full bg-muted', className)}>
            <div
                className="h-full rounded-full transition-[width,background-color]"
                style={{
                    width: `${clamped}%`,
                    backgroundColor: color,
                }}
            />
        </div>
    )
}

export default function SpoolManageView() {
    const hook = useSpoolManage()
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const pageSizeOptions = useMemo(() => getTablePageSizeOptions(preferredPageSize), [preferredPageSize])
    const {
        loading,
        spoolList,
        pagination,
        sortInfo,
        searchForm,
        setSearchForm,
        materialTypeOptions,
        brandOptions,
        appearanceOptions,
        handleSearch,
        handleSearchWithPatch,
        handleReset,
        handleStatusChange,
        handlePageChange,
        handleSortChange,
        handleDelete,
        showAddModal,
        handleClone,
        showDetail,
        showSummary,
        getRemainingColor,
        isLightHexColor,
        addModalOpen,
        setAddModalOpen,
        cloneRecord,
        handleAddSuccess,
        // Calibrate
        calibrateOpen,
        setCalibrateOpen,
        calibrateLoading,
        calibrateReadingWeight,
        calibrateScaleWeight,
        currentSpool,
        calibrateForm,
        showCalibrateModal,
        handleCalibrateTotalWeightChange,
        handleCalibrateSubmit,
        handleUseScaleWeightSubmit,
        statusOptions,
    } = hook

    const updateSearch = useCallback(
        (patch: Partial<typeof searchForm>) => setSearchForm((prev) => ({...prev, ...patch})),
        [setSearchForm],
    )

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
        [pagination.total, pagination.pageSize],
    )

    const getColorTagStyle = useCallback(
        (color: string) => {
            if (!color) return {}
            const isLight = isLightHexColor(color)
            return isLight
                ? {color: '#000', border: '1px solid #d9d9d9'}
                : {color: '#fff'}
        },
        [isLightHexColor],
    )

    const isMobile = useDeviceStore((s) => s.isMobile)
    const [filterOpen, setFilterOpen] = useState(false)
    const [keywordFilterCommandOpen, setKeywordFilterCommandOpen] = useState(false)
    const [commandKeywordFilter, setCommandKeywordFilter] = useState(searchForm.keyword)
    const isMacOS = useMemo(() => {
        if (typeof window === 'undefined') return false
        const platform =
            ((window.navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform)
            || window.navigator.platform
            || ''
        return /mac/i.test(platform)
    }, [])
    const [brandComboboxOpen, setBrandComboboxOpen] = useState(false)
    const [materialTypeComboboxOpen, setMaterialTypeComboboxOpen] = useState(false)
    const [appearanceComboboxOpen, setAppearanceComboboxOpen] = useState(false)

    const handleKeywordFilterCommandOpenChange = useCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setCommandKeywordFilter(searchForm.keyword)
        }
        setKeywordFilterCommandOpen(nextOpen)
    }, [searchForm.keyword])

    const toggleKeywordFilterCommand = useCallback(() => {
        handleKeywordFilterCommandOpenChange(!keywordFilterCommandOpen)
    }, [handleKeywordFilterCommandOpenChange, keywordFilterCommandOpen])

    useEffect(() => {
        if (isMobile) return

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                toggleKeywordFilterCommand()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isMobile, toggleKeywordFilterCommand])

    const handleDesktopFilterEnter = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Enter') return

            const target = event.target as HTMLElement | null
            if (!target) return

            const anyComboboxOpen =
                brandComboboxOpen || materialTypeComboboxOpen || appearanceComboboxOpen

            if (anyComboboxOpen) return
            if (target instanceof HTMLButtonElement) return

            event.preventDefault()
            handleSearch()
        },
        [appearanceComboboxOpen, brandComboboxOpen, handleSearch, materialTypeComboboxOpen],
    )

    const toggleArrayFilter = useCallback(
        (field: 'appearance' | 'materialType', value: string) => {
            const currentValues = searchForm[field]
            const nextValues = currentValues.includes(value)
                ? currentValues.filter((item) => item !== value)
                : [...currentValues, value]
            updateSearch({[field]: nextValues})
        },
        [searchForm, updateSearch],
    )

    const renderMobileTagRow = useCallback(
        (label: string, items: React.ReactNode[]) => (
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max gap-2">
                        {items}
                    </div>
                </div>
            </div>
        ),
        [],
    )

    const mobileFilterFields = (
        <>
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">关键字</Label>
                <Input
                    value={searchForm.keyword}
                    onChange={(e) => updateSearch({keyword: e.target.value})}
                    placeholder="耗材 ID 或名称"
                    className="h-9"
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">价格范围</Label>
                <div className="flex items-center gap-2">
                    <DecimalInput
                        min={0}
                        step={0.01}
                        value={searchForm.minPrice ?? ''}
                        onValueChange={(val) =>
                            updateSearch({minPrice: val})
                        }
                        placeholder="最低"
                        className="h-9"
                    />
                    <span className="text-muted-foreground">-</span>
                    <DecimalInput
                        min={0}
                        step={0.01}
                        value={searchForm.maxPrice ?? ''}
                        onValueChange={(val) =>
                            updateSearch({maxPrice: val})
                        }
                        placeholder="最高"
                        className="h-9"
                    />
                </div>
            </div>
            {renderMobileTagRow('品牌', [
                <MobileFilterTag
                    key="brand-all"
                    selected={!searchForm.brand}
                    onClick={() => updateSearch({brand: ''})}
                >
                    全部
                </MobileFilterTag>,
                ...brandOptions.map((option) => (
                    <MobileFilterTag
                        key={option.value}
                        selected={searchForm.brand === option.value}
                        onClick={() => updateSearch({brand: searchForm.brand === option.value ? '' : option.value})}
                    >
                        {option.label}
                    </MobileFilterTag>
                )),
            ])}
            {renderMobileTagRow('外观', [
                <MobileFilterTag
                    key="appearance-all"
                    selected={searchForm.appearance.length === 0}
                    onClick={() => updateSearch({appearance: []})}
                >
                    全部
                </MobileFilterTag>,
                ...(appearanceOptions ?? []).map((option) => {
                    const value = String(option.value)
                    return (
                        <button
                            type="button"
                            key={value}
                            onClick={() => toggleArrayFilter('appearance', value)}
                            className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                            <SpoolAppearanceTag
                                appearanceId={option.value}
                                className={cn(
                                    'cursor-pointer',
                                    searchForm.appearance.includes(value)
                                        ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background'
                                        : 'opacity-75',
                                )}
                            />
                        </button>
                    )
                }),
            ])}
            {renderMobileTagRow('类型', [
                <MobileFilterTag
                    key="materialType-all"
                    selected={searchForm.materialType.length === 0}
                    onClick={() => updateSearch({materialType: []})}
                >
                    全部
                </MobileFilterTag>,
                ...materialTypeOptions.map((option) => (
                    <MobileFilterTag
                        key={option.value}
                        selected={searchForm.materialType.includes(option.value)}
                        onClick={() => toggleArrayFilter('materialType', option.value)}
                    >
                        {option.label}
                    </MobileFilterTag>
                )),
            ])}
        </>
    )

    const desktopFilterFields = (
        <>
            <div className={desktopFilterSelectWidth}>
                <Label className="mb-1 block text-xs text-muted-foreground">品牌</Label>
                <Combobox
                    options={brandOptions}
                    value={searchForm.brand}
                    onChange={(val) => updateSearch({brand: val})}
                    open={brandComboboxOpen}
                    onOpenChange={setBrandComboboxOpen}
                    placeholder="品牌"
                    searchPlaceholder="搜索品牌..."
                    emptyText="未找到匹配品牌"
                    allowCustom
                    className="h-9"
                />
            </div>
            <div className={desktopFilterSelectWidth}>
                <Label className="mb-1 block text-xs text-muted-foreground">类型</Label>
                <MultiCombobox
                    options={materialTypeOptions}
                    values={searchForm.materialType}
                    onChange={(values) => updateSearch({materialType: values})}
                    open={materialTypeComboboxOpen}
                    onOpenChange={setMaterialTypeComboboxOpen}
                    placeholder="PLA, PETG..."
                    searchPlaceholder="搜索材料类型..."
                    emptyText="未找到匹配类型"
                    allowCustom
                    className="h-9"
                />
            </div>
            <div className={desktopFilterSelectWidth}>
                <Label className="mb-1 block text-xs text-muted-foreground">外观</Label>
                <MultiCombobox
                    options={(appearanceOptions ?? []).map((o) => ({
                        label: o.label,
                        value: String(o.value),
                        renderOption: <SpoolAppearanceTag appearanceId={o.value}/>,
                        renderValue: <SpoolAppearanceTag appearanceId={o.value}/>
                    }))}
                    values={searchForm.appearance}
                    onChange={(values) => updateSearch({appearance: values})}
                    open={appearanceComboboxOpen}
                    onOpenChange={setAppearanceComboboxOpen}
                    placeholder="哑光, 丝绸..."
                    searchPlaceholder="搜索外观..."
                    emptyText="未找到匹配外观"
                    allowCustom
                    className="h-9"
                />
            </div>
        </>
    )

    /* ── Mobile layout ── */
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Header + actions */}
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-foreground">耗材管理</h1>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={showAddModal} className="cursor-pointer">
                            <Plus size={14} className="mr-1"/>
                            添加
                        </Button>
                        <Button size="sm" variant="outline" onClick={showSummary} className="cursor-pointer">
                            <BarChart3 size={14} className="mr-1"/>
                            汇总
                        </Button>
                    </div>
                </div>

                {/* Status tabs + filter button */}
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
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 cursor-pointer px-2.5"
                        onClick={() => setFilterOpen(true)}
                    >
                        <SlidersHorizontal size={14}/>
                    </Button>
                </div>

                {/* Filter Sheet */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetContent side="top" className="max-h-[80vh] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>筛选条件</SheetTitle>
                            <SheetDescription>设置筛选条件来查找耗材</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 px-4">
                            {mobileFilterFields}
                        </div>
                        <SheetFooter className="flex-row gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                    handleReset()
                                    setFilterOpen(false)
                                }}
                            >
                                <RotateCcw size={14} className="mr-1"/>
                                重置
                            </Button>
                            <Button
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                    handleSearch()
                                    setFilterOpen(false)
                                }}
                            >
                                <Search size={14} className="mr-1"/>
                                搜索
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Card list */}
                <div className="space-y-3">
                    {loading
                        ? Array.from({length: 5}).map((_, i) => (
                            <div key={i} className={`${cardBase} space-y-3 p-4`}>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-24"/>
                                    <Skeleton className="h-5 w-12 rounded"/>
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-3 w-16"/>
                                    <Skeleton className="h-3 w-12"/>
                                </div>
                                <Skeleton className="h-1.5 w-full rounded"/>
                            </div>
                        ))
                        : spoolList.length === 0 ? (
                            <div className={`${cardBase} py-16 text-center text-muted-foreground`}>
                                暂无耗材数据
                            </div>
                        ) : (
                            spoolList.map((record) => {
                                const pct = record.remainingPercentage ?? 100
                                return (
                                    <div
                                        key={record.id}
                                        className={cn(cardBase, 'cursor-pointer p-4 transition-colors active:bg-muted/40')}
                                        onClick={() => showDetail(record)}
                                    >
                                        {/* Row 1: ID + Name / Color + Appearance */}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="shrink-0 text-xs text-muted-foreground">#{record.id}</span>
                                                <span className="truncate font-medium text-foreground">
                                                    {record.name}
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {record.color && (
                                                    <span
                                                        className="inline-block h-4 w-4 rounded-full border border-border"
                                                        style={{backgroundColor: record.color}}
                                                    />
                                                )}
                                                <SpoolAppearanceTag appearanceId={record.appearance}/>
                                            </div>
                                        </div>

                                        {/* Row 2: Material + Price */}
                                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{record.materialType}</span>
                                            {record.brand && (
                                                <>
                                                    <span>·</span>
                                                    <span>{record.brand}</span>
                                                </>
                                            )}
                                            {record.price != null && (
                                                <>
                                                    <span>·</span>
                                                    <span className="text-foreground">¥{record.price.toFixed(2)}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Row 3: Remaining weight bar */}
                                        <div className="mt-2 flex items-center gap-2">
                                            <RemainingWeightBar
                                                percentage={pct}
                                                color={getRemainingColor(pct)}
                                                className="h-1.5 flex-1"
                                            />
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {record.remainingWeight ?? record.netWeight}g
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-muted-foreground">
                            共 {pagination.total} 条
                        </span>
                        <div className="flex items-center gap-2">
                            <Select value={String(pagination.pageSize)}
                                    onValueChange={(value) => handlePageChange(1, Number(value))}>
                                <SelectTrigger className="h-7 w-[96px] text-xs">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} / 页
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                disabled={pagination.current <= 1}
                                onClick={() => handlePageChange(pagination.current - 1, pagination.pageSize)}
                            >
                                <ChevronLeft size={14}/>
                            </Button>
                            <span className="text-xs text-foreground">
                                {pagination.current} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1, pagination.pageSize)}
                            >
                                <ChevronRight size={14}/>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <AddSpoolModal
                    open={addModalOpen}
                    onOpenChange={setAddModalOpen}
                    mode={cloneRecord ? 'clone' : 'add'}
                    initialData={cloneRecord}
                    onSuccess={handleAddSuccess}
                />
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
            </div>
        )
    }

    /* ── Desktop layout ── */
    return (
        <div className="space-y-6 p-6">
            {/* ── Header ── */}
            <div className="border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">耗材管理</h1>
            </div>

            {/* ── Action bar ── */}
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={showAddModal} className={cn('cursor-pointer', iconTextUniformWidthClass)}>
                    <Plus size={16} className="mr-1"/>
                    添加耗材
                </Button>
                <Button variant="outline" onClick={showSummary} className="cursor-pointer">
                    <BarChart3 size={16} className="mr-1"/>
                    查看汇总
                </Button>
            </div>

            {/* ── Search bar ── */}
            <div className={`${cardBase} space-y-4 p-5`}>
                {/* Status segmented */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">状态</span>
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

                {/* Filter fields */}
                <div className="flex flex-wrap items-end gap-3" onKeyDownCapture={handleDesktopFilterEnter}>
                    <div className="w-[220px]">
                        <Label className="mb-1 block text-xs text-muted-foreground">关键字</Label>
                        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                            <Input
                                value={searchForm.keyword}
                                onChange={(e) => updateSearch({keyword: e.target.value})}
                                placeholder="耗材 ID 或名称"
                                className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                            />
                            <KbdGroup className="shrink-0">
                                {isMacOS ? (
                                    <>
                                        <Kbd>⌘</Kbd>
                                        <Kbd>K</Kbd>
                                    </>
                                ) : (
                                    <>
                                        <Kbd className="px-1.5">Ctrl</Kbd>
                                        <Kbd>K</Kbd>
                                    </>
                                )}
                            </KbdGroup>
                        </div>
                    </div>
                    {desktopFilterFields}
                    <div className="flex items-end gap-1">
                        <div className="w-[100px]">
                            <Label className="mb-1 block text-xs text-muted-foreground">最低价格</Label>
                            <DecimalInput
                                min={0}
                                step={0.01}
                                value={searchForm.minPrice ?? ''}
                                onValueChange={(val) =>
                                    updateSearch({minPrice: val})
                                }
                                placeholder="¥"
                                className="h-9"
                            />
                        </div>
                        <span className="pb-2 text-muted-foreground">-</span>
                        <div className="w-[100px]">
                            <Label className="mb-1 block text-xs text-muted-foreground">最高价格</Label>
                            <DecimalInput
                                min={0}
                                step={0.01}
                                value={searchForm.maxPrice ?? ''}
                                onValueChange={(val) =>
                                    updateSearch({maxPrice: val})
                                }
                                placeholder="¥"
                                className="h-9"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSearch} className="h-9 cursor-pointer">
                            <Search size={14} className="mr-1"/>
                            搜索
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleReset} className="h-9 cursor-pointer">
                            <RotateCcw size={14} className="mr-1"/>
                            重置
                        </Button>
                    </div>
                </div>
            </div>

            <CommandDialog
                open={keywordFilterCommandOpen}
                onOpenChange={handleKeywordFilterCommandOpenChange}
                contentClassName="max-w-md p-0"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSearchWithPatch({keyword: commandKeywordFilter})
                        setKeywordFilterCommandOpen(false)
                    }}
                >
                    <CommandInput
                        value={commandKeywordFilter}
                        onValueChange={setCommandKeywordFilter}
                        placeholder="输入耗材 ID 或名称"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSearchWithPatch({keyword: commandKeywordFilter})
                                setKeywordFilterCommandOpen(false)
                            }
                        }}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <span>按</span>
                        <Kbd className="h-4 px-1 text-[10px]">Enter</Kbd>
                        <span>过滤结果</span>
                    </div>
                </form>
            </CommandDialog>

            {/* ── Data table ── */}
            <div className={`${cardBase} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b hover:bg-transparent">
                                {[
                                    {label: 'ID', field: 'id', w: 'w-[60px]'},
                                    {label: '名称', field: 'name', w: 'min-w-[150px]'},
                                    {label: '类型', field: 'materialType', w: 'w-[100px]'},
                                    {label: '颜色', field: '', w: 'w-[100px]'},
                                    {label: '外观', field: 'appearance', w: 'w-[100px]'},
                                    {label: '价格', field: 'price', w: 'w-[80px]'},
                                    {label: '剩余', field: 'remainingWeight', w: 'w-[160px]'},
                                    {label: '使用时间', field: '', w: 'w-[200px]'},
                                    {label: '操作', field: '', w: 'w-[150px]'},
                                ].map((col) => (
                                    <TableHead
                                        key={col.label}
                                        className={`${col.w} px-4 py-3 text-left text-xs font-semibold text-muted-foreground`}
                                    >
                                        {col.field ? (
                                            <SortHeader
                                                label={col.label}
                                                field={col.field}
                                                currentField={sortInfo.field}
                                                currentOrder={sortInfo.order}
                                                onSort={handleSortChange}
                                            />
                                        ) : (
                                            col.label
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading
                                ? Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i} className="border-b hover:bg-transparent">
                                        {Array.from({length: 9}).map((_, j) => (
                                            <TableCell key={j} className="px-4 py-3">
                                                <Skeleton className="h-4 w-full"/>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : spoolList.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={9}
                                                   className="px-4 py-12 text-center text-muted-foreground h-24">
                                            暂无耗材数据
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    spoolList.map((record) => (
                                        <TableRow
                                            key={record.id}
                                            className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                                            onClick={() => showDetail(record)}
                                        >
                                            {/* ID */}
                                            <TableCell
                                                className="px-4 py-3 text-muted-foreground">{record.id}</TableCell>

                                            {/* Name */}
                                            <TableCell
                                                className="max-w-[200px] truncate px-4 py-3 font-medium text-foreground">
                                                {record.name}
                                            </TableCell>

                                            {/* Material */}
                                            <TableCell
                                                className="px-4 py-3 text-foreground">{record.materialType}</TableCell>

                                            {/* Color */}
                                            <TableCell className="px-4 py-3">
                                                {record.color ? (
                                                    <span
                                                        className="inline-block rounded px-2 py-0.5 font-mono text-xs"
                                                        style={{
                                                            backgroundColor: record.color,
                                                            ...getColorTagStyle(record.color),
                                                        }}
                                                    >
                                                        {record.color}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>

                                            {/* Appearance */}
                                            <TableCell className="px-4 py-3">
                                                <SpoolAppearanceTag appearanceId={record.appearance}/>
                                            </TableCell>

                                            {/* Price */}
                                            <TableCell className="px-4 py-3 text-foreground">
                                                {record.price != null ? `¥${record.price.toFixed(2)}` : '-'}
                                            </TableCell>

                                            {/* Remaining weight */}
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-foreground">
                                                        {record.remainingWeight ?? record.netWeight}g
                                                    </span>
                                                    <RemainingWeightBar
                                                        percentage={record.remainingPercentage ?? 100}
                                                        color={getRemainingColor(record.remainingPercentage ?? 100)}
                                                        className="h-1.5 w-[108px]"
                                                    />
                                                </div>
                                            </TableCell>

                                            {/* Time */}
                                            <TableCell className="px-4 py-3 text-xs">
                                                {record.firstUsedTime ? (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                            <span className="text-muted-foreground">首次</span>
                                                            <span className="text-foreground">
                                                                <FormattedTime time={record.firstUsedTime}/>
                                                            </span>
                                                        </div>
                                                        {record.lastUsedTime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                <span className="text-muted-foreground">最后</span>
                                                                <span className="text-foreground">
                                                                    <FormattedTime time={record.lastUsedTime}/>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">未使用</span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 cursor-pointer px-2 text-xs text-primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleClone(record)
                                                        }}
                                                    >
                                                        <Copy size={14} className="mr-1"/>
                                                        克隆
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 cursor-pointer px-2 text-xs text-primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            showCalibrateModal(record)
                                                        }}
                                                    >
                                                        <Crosshair size={14} className="mr-1"/>
                                                        校准
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 cursor-pointer px-2 text-xs text-destructive hover:text-destructive"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Trash2 size={14} className="mr-1"/>
                                                                删除
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>确定要删除这个耗材吗？</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    删除后无法恢复，请确认操作。
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel
                                                                    className="cursor-pointer">取消</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleDelete(record.id!)
                                                                    }}
                                                                    className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
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
                        <span className="text-sm text-muted-foreground">
                            共 {pagination.total} 条记录
                        </span>
                        <div className="flex items-center gap-2">
                            <Select value={String(pagination.pageSize)}
                                    onValueChange={(value) => handlePageChange(1, Number(value))}>
                                <SelectTrigger className="h-8 w-[108px]">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} / 页
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={pagination.current <= 1}
                                onClick={() => handlePageChange(pagination.current - 1, pagination.pageSize)}
                            >
                                <ChevronLeft size={14}/>
                            </Button>
                            <span className="text-sm text-foreground">
                                {pagination.current} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={pagination.current >= totalPages}
                                onClick={() => handlePageChange(pagination.current + 1, pagination.pageSize)}
                            >
                                <ChevronRight size={14}/>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            <AddSpoolModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                mode={cloneRecord ? 'clone' : 'add'}
                initialData={cloneRecord}
                onSuccess={handleAddSuccess}
            />

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
        </div>
    )
}
