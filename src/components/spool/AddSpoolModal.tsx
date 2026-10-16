import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, HelpCircle, Loader2 } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { FormattedTime } from '@/components/ui/formatted-time'
import { addSpool, getOptions, listLatest5Spools, updateSpool } from '@/api/spool'
import {
    useRemoteColorConfig,
    useRemoteSpoolConfig,
    useRemoteFilamentsConfig,
} from '@/hooks/useRemoteConfig'
import { showRequestError } from '@/request'
import { SpoolAppearanceTag } from './SpoolAppearanceTag'

export interface SpoolFormData {
    id?: number
    name: string
    materialType: string
    color: string
    brand: string
    num?: number
    price?: number
    netWeight: number
    spoolWeight?: number
    usedWeight?: number
    totalWeightWithSpool?: number
    isBrandNew: boolean
    appearance?: number
    remark: string
}

const defaultFormData: SpoolFormData = {
    name: '',
    materialType: '',
    color: '',
    brand: '',
    num: 1,
    price: undefined,
    netWeight: 1000,
    spoolWeight: undefined,
    usedWeight: undefined,
    totalWeightWithSpool: undefined,
    isBrandNew: true,
    appearance: undefined,
    remark: '',
}

import { DecimalInput } from '@/components/ui/decimal-input'

/** Number input that correctly handles decimal point input in controlled mode */


export interface AddSpoolModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: 'add' | 'edit' | 'clone'
    initialData?: API.SpoolVO | null
    onSuccess?: () => void
}

export default function AddSpoolModal({
    open,
    onOpenChange,
    mode = 'add',
    initialData,
    onSuccess,
}: AddSpoolModalProps) {
    const isClone = mode === 'clone'
    const isEdit = mode === 'edit'
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<SpoolFormData>({ ...defaultFormData })
    const isNameManuallyEdited = useRef(false)

    // Latest spools
    const [latestSpools, setLatestSpools] = useState<API.SpoolVO[]>([])
    const [latestSpoolsLoading, setLatestSpoolsLoading] = useState(false)
    const [showLatestSpools, setShowLatestSpools] = useState(false)

    // API Options
    const [apiOptions, setApiOptions] = useState<API.SpoolQueryOptionsVO | null>(null)

    const fetchApiOptions = useCallback(async () => {
        try {
            const res = await getOptions()
            setApiOptions(res.data?.data ?? null)
        } catch {
            // Ignore prefetch error
        }
    }, [])

    const fetchLatestSpools = useCallback(async () => {
        setLatestSpoolsLoading(true)
        try {
            const res = await listLatest5Spools()
            setLatestSpools(res.data?.data ?? [])
        } catch (error) {
            showRequestError(error, '获取最近新增耗材失败')
        } finally {
            setLatestSpoolsLoading(false)
        }
    }, [])

    // Remote configs
    const { colorConfig, ensureColorConfigLoaded } = useRemoteColorConfig()
    const { spoolConfig, ensureSpoolConfigLoaded } = useRemoteSpoolConfig()
    const { ensureFilamentsConfigLoaded } = useRemoteFilamentsConfig()

    useEffect(() => {
        if (open) {
            fetchApiOptions()
            ensureColorConfigLoaded()
            ensureSpoolConfigLoaded()
            ensureFilamentsConfigLoaded()

            if (!isEdit) {
                setShowLatestSpools(false)
                fetchLatestSpools()
            }

            isNameManuallyEdited.current = false
            if (initialData && (isClone || isEdit)) {
                setFormData({
                    id: isEdit ? initialData.id : undefined,
                    name: initialData.name ?? '',
                    materialType: initialData.materialType ?? '',
                    color: initialData.color ?? '',
                    brand: initialData.brand ?? '',
                    num: 1,
                    price: initialData.price,
                    netWeight: initialData.netWeight ?? 1000,
                    spoolWeight: initialData.spoolWeight,
                    usedWeight: isEdit ? (initialData.usedWeight ?? 0) : 0,
                    totalWeightWithSpool: undefined,
                    isBrandNew: isEdit ? (initialData.usedWeight === 0 || initialData.usedWeight == null) : true,
                    appearance: initialData.appearance,
                    remark: initialData.remark ?? '',
                })
            } else {
                setFormData({ ...defaultFormData })
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode, initialData])

    const materialTypeOptions = useMemo(() => {
        const set = new Set<string>(apiOptions?.materialTypes ?? [])
        if (spoolConfig?.materialTypes) {
            spoolConfig.materialTypes.forEach((t) => set.add(t))
        }
        return Array.from(set).map((label) => ({ label, value: label }))
    }, [apiOptions, spoolConfig])

    const brandOptions = useMemo(() => {
        const set = new Set<string>(apiOptions?.brand ?? [])
        if (spoolConfig?.brands) {
            spoolConfig.brands.forEach((b) => set.add(b.name))
        }
        return Array.from(set).map((label) => ({ label, value: label }))
    }, [apiOptions, spoolConfig])

    const { brandSpoolWeightMap, brandSpoolTooltipMap } = useMemo(() => {
        const weightMap: Record<string, number> = {}
        const tooltipMap: Record<string, string> = {}
        if (spoolConfig?.brands) {
            for (const brand of spoolConfig.brands) {
                if (brand.spoolWeight != null) {
                    weightMap[brand.name] = brand.spoolWeight
                }
                if (brand.description) {
                    tooltipMap[brand.name] = brand.description
                }
            }
        }
        return { brandSpoolWeightMap: weightMap, brandSpoolTooltipMap: tooltipMap }
    }, [spoolConfig])

    const spoolWeightTip = brandSpoolTooltipMap[formData.brand] || ''

    const handleBrandChange = useCallback(
        (brand: string) => {
            if (brandSpoolWeightMap[brand] != null) {
                setFormData((prev) => ({ ...prev, spoolWeight: brandSpoolWeightMap[brand] }))
            }
        },
        [brandSpoolWeightMap],
    )

    const colorOptionsItems = useMemo(() => {
        const seen = new Set<string>()
        const result: { key: string; label: string; value: string; hex: string; brand?: string }[] = []
        for (const c of colorConfig || []) {
            const hex = c.hex.toLowerCase()
            const dedupeKey = `${c.brand?.trim() || ''}::${c.name}::${hex}`
            if (!seen.has(dedupeKey)) {
                seen.add(dedupeKey)
                result.push({ key: dedupeKey, label: c.name, value: hex, hex, brand: c.brand })
            }
        }
        return result
    }, [colorConfig])

    const appearanceOptionsItems = useMemo(() => {
        return (spoolConfig?.appearances ?? []).map((a) => ({
            label: a.label,
            value: a.id,
            renderOption: <SpoolAppearanceTag appearanceId={a.id} />,
            renderValue: <SpoolAppearanceTag appearanceId={a.id} />,
        }))
    }, [spoolConfig])

    const generateAutoName = useCallback(
        (data: SpoolFormData): string => {
            const parts: string[] = []
            if (data.brand) parts.push(data.brand)
            if (data.materialType) parts.push(data.materialType)
            if (data.appearance != null && spoolConfig?.appearances) {
                const appearanceName = spoolConfig.appearances.find((a) => a.id === data.appearance)?.label
                if (appearanceName) parts.push(appearanceName)
            }
            if (data.color) {
                const colorName = colorConfig?.find(
                    (c) => c.hex.toLowerCase() === data.color.toLowerCase(),
                )?.name
                parts.push(colorName || data.color)
            }
            return parts.join(' ')
        },
        [colorConfig, spoolConfig],
    )

    const handleSubmit = useCallback(async () => {
        if (!formData.name || !formData.materialType || !formData.netWeight) {
            toast.warning('请填写必填字段')
            return
        }
        if (!isEdit && (formData.num == null || formData.num < 1 || formData.num > 10)) {
            toast.warning('请输入 1-10 的数量')
            return
        }
        setLoading(true)
        try {
            if (isEdit) {
                await updateSpool(formData as unknown as API.SpoolUpdateDTO)
                toast.success('更新耗材成功')
            } else {
                await addSpool(formData as unknown as API.SpoolCreateDTO)
                toast.success(isClone ? '克隆耗材成功' : '添加耗材成功')
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            showRequestError(error, isEdit ? '更新耗材失败' : (isClone ? '克隆耗材失败' : '添加耗材失败'))
        } finally {
            setLoading(false)
        }
    }, [formData, isEdit, isClone, onOpenChange, onSuccess])

    const update = useCallback(
        (patch: Partial<SpoolFormData>) => {
            setFormData((prev) => ({ ...prev, ...patch }))
        },
        [],
    )

    const autoName = useCallback(() => {
        if (isClone || isEdit || isNameManuallyEdited.current) return
        setFormData((prev) => {
            const name = generateAutoName(prev)
            if (name !== prev.name) return { ...prev, name }
            return prev
        })
    }, [isClone, isEdit, generateAutoName])

    useEffect(() => {
        if (formData.isBrandNew) {
            if (formData.usedWeight !== 0) update({ usedWeight: 0 })
            return
        }
        const { totalWeightWithSpool, netWeight, spoolWeight } = formData
        if (totalWeightWithSpool != null && netWeight != null && spoolWeight != null) {
            const used = netWeight + spoolWeight - totalWeightWithSpool
            const clamped = Math.min(Math.max(used, 0), netWeight)
            if (formData.usedWeight !== clamped) update({ usedWeight: clamped })
        }
    }, [formData, update])

    const canToggleBrandNew = formData.netWeight != null && formData.spoolWeight != null

    const [colorOpen, setColorOpen] = useState(false)
    const [colorSearch, setColorSearch] = useState('')

    const filteredColors = useMemo(() => {
        if (!colorOptionsItems) return []
        if (!colorSearch) return colorOptionsItems
        const q = colorSearch.toLowerCase()
        return colorOptionsItems.filter(
            (c) => c.label.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q),
        )
    }, [colorOptionsItems, colorSearch])

    useEffect(() => {
        if (!colorOpen) setColorSearch('')
    }, [colorOpen])

    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerColor, setPickerColor] = useState('#ffffff')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '编辑耗材' : isClone ? '克隆耗材' : '添加耗材'}</DialogTitle>
                    <DialogDescription className="sr-only">
                        填写耗材信息以{isEdit ? '编辑' : isClone ? '克隆' : '添加'}新的耗材
                    </DialogDescription>
                </DialogHeader>

                {!isEdit && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">最近新增耗材</span>
                                <span className="text-xs text-muted-foreground">避免重复添加</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowLatestSpools((prev) => !prev)}
                                className="h-7 cursor-pointer px-2 text-xs"
                            >
                                {showLatestSpools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {showLatestSpools ? '收起' : '展开'}
                            </Button>
                        </div>
                        {showLatestSpools && (
                            <div className="mt-3 space-y-2">
                                {latestSpoolsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-8 w-full" />
                                        ))}
                                    </div>
                                ) : latestSpools.length === 0 ? (
                                    <p className="py-2 text-center text-xs text-muted-foreground">
                                        暂无最近新增记录
                                    </p>
                                ) : (
                                    latestSpools.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between rounded-md border border-border/50 bg-card px-3 py-1.5 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{item.name || '-'}</span>
                                                {item.color && (
                                                    <span
                                                        className="h-3.5 w-3.5 rounded-full border border-border"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                <FormattedTime time={item.createTime} />
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>品牌</Label>
                        <Combobox
                            options={brandOptions}
                            value={formData.brand}
                            onChange={(val) => {
                                update({ brand: val })
                                handleBrandChange(val)
                                setTimeout(autoName, 0)
                            }}
                            placeholder="请选择或输入品牌"
                            searchPlaceholder="搜索品牌..."
                            emptyText="未找到匹配品牌"
                            allowCustom
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>
                            材料类型 <span className="text-destructive">*</span>
                        </Label>
                        <Combobox
                            options={materialTypeOptions}
                            value={formData.materialType}
                            onChange={(val) => {
                                update({ materialType: val })
                                setTimeout(autoName, 0)
                            }}
                            placeholder="请选择或输入材料类型"
                            searchPlaceholder="搜索材料类型..."
                            emptyText="未找到匹配类型"
                            allowCustom
                            preferBottomOnMobile
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>外观</Label>
                        <Combobox
                            options={(appearanceOptionsItems ?? []).map((o) => ({ label: o.label, value: String(o.value) }))}
                            value={formData.appearance != null ? String(formData.appearance) : ''}
                            onChange={(val) => {
                                update({ appearance: val ? Number(val) : undefined })
                                setTimeout(autoName, 0)
                            }}
                            placeholder="请选择外观类型"
                            searchPlaceholder="搜索外观..."
                            emptyText="未找到匹配外观"
                            preferBottomOnMobile
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>颜色</Label>
                        <div className="flex items-center gap-2">
                            <Popover open={colorOpen} onOpenChange={setColorOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="h-10 flex-1 justify-between font-normal"
                                    >
                                        {formData.color ? (
                                            <span className="flex items-center gap-2 truncate">
                                                <span
                                                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                                                    style={{ backgroundColor: formData.color }}
                                                />
                                                {colorOptionsItems?.find((c) => c.hex.toLowerCase() === formData.color.toLowerCase())?.label || formData.color}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">请选择颜色</span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] p-0"
                                    align="start"
                                    sideOffset={4}
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            value={colorSearch}
                                            onValueChange={setColorSearch}
                                            placeholder="搜索颜色名称或HEX..."
                                        />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>未找到匹配颜色</CommandEmpty>
                                            <CommandGroup>
                                                {filteredColors.map((c) => (
                                                    <CommandItem
                                                        key={c.key}
                                                        value={c.key}
                                                        onSelect={() => {
                                                            update({ color: c.hex })
                                                            setColorOpen(false)
                                                            setTimeout(autoName, 0)
                                                        }}
                                                        className="gap-2"
                                                    >
                                                        <Check
                                                            className={`h-4 w-4 ${formData.color === c.hex ? 'opacity-100' : 'opacity-0'}`}
                                                        />
                                                        <span
                                                            className="h-4 w-4 shrink-0 rounded-full border border-border"
                                                            style={{ backgroundColor: c.hex }}
                                                        />
                                                        <span className="flex-1 text-left">
                                                            {c.label}
                                                            {c.brand && (
                                                                <span className="ml-1.5 text-xs text-muted-foreground">{c.brand}</span>
                                                            )}
                                                        </span>
                                                        <span className="font-mono text-xs text-muted-foreground">{c.hex.toUpperCase()}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Popover open={pickerOpen} onOpenChange={(open) => {
                                if (!formData.color) return
                                if (open) {
                                    setPickerColor(
                                        /^#[0-9A-Fa-f]{6}$/i.test(formData.color)
                                            ? formData.color
                                            : '#ffffff',
                                    )
                                } else {
                                    update({ color: pickerColor })
                                }
                                setPickerOpen(open)
                            }}>
                                <PopoverTrigger asChild disabled={!formData.color}>
                                    <span className="inline-block">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={`h-10 w-10 shrink-0 p-0.5 ${!formData.color ? 'pointer-events-auto cursor-not-allowed opacity-50' : ''}`}
                                                        disabled={!formData.color}
                                                    >
                                                        <span
                                                            className="block h-full w-full rounded-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    formData.color && /^#[0-9A-Fa-f]{6}$/i.test(formData.color)
                                                                        ? formData.color
                                                                        : '#f4f4f5',
                                                            }}
                                                        />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    <p>{formData.color ? '微调颜色' : '请先选择颜色'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </span>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="end">
                                    <HexColorPicker color={pickerColor} onChange={setPickerColor} />
                                    <Input
                                        value={pickerColor.toUpperCase()}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                                                setPickerColor(v.toLowerCase())
                                            }
                                        }}
                                        className="mt-2 h-8 text-center font-mono text-xs"
                                        maxLength={7}
                                        placeholder="#000000"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            名称 <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                className="flex-1"
                                value={formData.name}
                                onChange={(e) => {
                                    isNameManuallyEdited.current = true
                                    update({ name: e.target.value })
                                }}
                                placeholder="请输入耗材名称"
                            />
                            {(isClone || isEdit) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 cursor-pointer"
                                    onClick={() => {
                                        isNameManuallyEdited.current = false
                                        const name = generateAutoName(formData)
                                        update({ name })
                                    }}
                                >
                                    生成
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>价格(元)</Label>
                        <DecimalInput
                            min={0}
                            step={0.01}
                            value={formData.price ?? ''}
                            onValueChange={(val) => update({ price: val })}
                            placeholder="请输入价格"
                        />
                    </div>

                    {!isEdit && (
                        <div className="space-y-2">
                            <Label>数量</Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                step={1}
                                value={formData.num ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '') {
                                        update({ num: undefined })
                                        return
                                    }
                                    const num = Number(value)
                                    if (Number.isInteger(num)) {
                                        update({ num })
                                    }
                                }}
                                onBlur={() => {
                                    if (formData.num == null) {
                                        update({ num: 1 })
                                        return
                                    }
                                    update({ num: Math.max(1, Math.min(10, formData.num)) })
                                }}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>
                            净重(克) <span className="text-destructive">*</span>
                        </Label>
                        <DecimalInput
                            min={0}
                            value={formData.netWeight}
                            onValueChange={(val) => update({ netWeight: val ?? 0 })}
                            placeholder="请输入净重"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            料盘重量(克)
                            {spoolWeightTip && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p>{spoolWeightTip}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </Label>
                        <DecimalInput
                            min={0}
                            value={formData.spoolWeight ?? ''}
                            onValueChange={(val) => update({ spoolWeight: val })}
                            placeholder="请输入料盘重量"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Label>全新耗材</Label>
                        <Switch
                            checked={formData.isBrandNew}
                            onCheckedChange={(checked) => update({ isBrandNew: checked })}
                            disabled={!canToggleBrandNew}
                        />
                        {!canToggleBrandNew && (
                            <span className="text-xs text-muted-foreground">(需填写净重和料盘重量)</span>
                        )}
                    </div>

                    {!formData.isBrandNew && (
                        <>
                            <div className="space-y-2">
                                <Label>已使用重量(克)</Label>
                                <DecimalInput
                                    min={0}
                                    value={formData.usedWeight ?? ''}
                                    onValueChange={(val) => update({ usedWeight: val })}
                                    placeholder="请输入已使用重量"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>含料盘重量(克)</Label>
                                <DecimalInput
                                    min={0}
                                    value={formData.totalWeightWithSpool ?? ''}
                                    onValueChange={(val) => update({ totalWeightWithSpool: val })}
                                    placeholder="请输入当前含料盘总重量（可选）"
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>备注</Label>
                        <Textarea
                            value={formData.remark}
                            onChange={(e) => update({ remark: e.target.value })}
                            placeholder="请输入备注信息"
                            className="min-h-[60px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        确定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
