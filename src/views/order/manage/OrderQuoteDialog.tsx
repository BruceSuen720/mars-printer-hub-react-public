import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { addDraft, deleteDraft, listDraft } from '@/api/orderInfo'
import { getAllAvailableSpools } from '@/api/spool'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { copyToClipboard } from '@/utils/clipboard'
import { defaultQuoteSettings, saveQuoteSettings } from '@/utils/quoteSettings'
import { resolveQuoteSettings } from '@/utils/userConfigQuote'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { showRequestError } from '@/request'


type QuoteForm = {
    orderName: string
    customerName: string
    printDuration: number | undefined
    power: number | undefined
    electricityPrice: number | undefined
    laborHourlyRate: number | undefined
    consumables: API.Consumable[]
    finalQuote: API.FinalQuote
    totalIncome: number | undefined
}

type QuoteCreatePayload = QuoteForm & {
    printCost: number
    electricityCost: number
    laborCost: number
    totalPrice: number
}

const createDefaultForm = (): QuoteForm => ({
    orderName: '',
    customerName: '',
    printDuration: undefined,
    power: defaultQuoteSettings.power,
    electricityPrice: defaultQuoteSettings.electricityPrice,
    laborHourlyRate: defaultQuoteSettings.laborHourlyRate,
    consumables: [],
    finalQuote: {
        logistics: undefined,
        design: undefined,
        other: undefined,
    },
    totalIncome: undefined,
})

const toFixed2 = (v: number) => Number(v.toFixed(2))

export default function OrderQuoteDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreate: (payload: QuoteCreatePayload) => Promise<boolean> | boolean
}) {
    const { loginUser } = useLoginUserStore()
    const isIntranet = loginUser?.isIntranet === true

    const [form, setForm] = useState<QuoteForm>(createDefaultForm())
    const [spools, setSpools] = useState<API.SpoolVO[]>([])
    const [drafts, setDrafts] = useState<API.OrderQuoteDraftDTO[]>([])
    const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(undefined)
    const [savingDraft, setSavingDraft] = useState(false)
    const [creating, setCreating] = useState(false)
    const [tempSpoolId, setTempSpoolId] = useState('')

    const resetForm = useCallback(async () => {
        const defaults = createDefaultForm()
        const settings = await resolveQuoteSettings()
        defaults.power = settings.power
        defaults.electricityPrice = settings.electricityPrice
        defaults.laborHourlyRate = settings.laborHourlyRate
        setForm(defaults)
    }, [])

    const loadSpools = useCallback(async () => {
        try {
            const res = await getAllAvailableSpools()
            setSpools(res.data.data ?? [])
        } catch (error) {
            showRequestError(error, '获取耗材列表失败')
        }
    }, [])

    const loadDrafts = useCallback(async () => {
        if (!isIntranet) return
        try {
            const res = await listDraft()
            setDrafts(res.data.data ?? [])
        } catch (error) {
            showRequestError(error, '获取草稿失败')
        }
    }, [isIntranet])

    useEffect(() => {
        if (!open) return
        void resetForm()
        setSelectedDraftId(undefined)
        setTempSpoolId('')
        loadSpools()
        loadDrafts()
    }, [open, resetForm, loadSpools, loadDrafts])

    useEffect(() => {
        if (!open) return
        saveQuoteSettings({
            power: Number(form.power) || 0,
            electricityPrice: Number(form.electricityPrice) || 0,
            laborHourlyRate: Number(form.laborHourlyRate) || 0,
        })
    }, [open, form.power, form.electricityPrice, form.laborHourlyRate])

    const calculatedPrintCost = useMemo(
        () =>
            toFixed2(
                form.consumables.reduce((sum, item) => {
                    const weight = Number(item.weight) || 0
                    const price = Number(item.price) || 0
                    return sum + weight * price
                }, 0),
            ),
        [form.consumables],
    )

    const calculatedElectricityCost = useMemo(() => {
        const duration = Number(form.printDuration) || 0
        const power = Number(form.power) || 0
        const price = Number(form.electricityPrice) || 0
        return toFixed2((duration * power / 1000) * price)
    }, [form.printDuration, form.power, form.electricityPrice])

    const calculatedLaborCost = useMemo(() => {
        const duration = Number(form.printDuration) || 0
        const rate = Number(form.laborHourlyRate) || 0
        return toFixed2(duration * rate)
    }, [form.printDuration, form.laborHourlyRate])

    const calculatedTotalPrice = useMemo(() => {
        const logistics = Number(form.finalQuote.logistics) || 0
        const design = Number(form.finalQuote.design) || 0
        const other = Number(form.finalQuote.other) || 0
        return toFixed2(calculatedPrintCost + calculatedElectricityCost + calculatedLaborCost + logistics + design + other)
    }, [calculatedPrintCost, calculatedElectricityCost, calculatedLaborCost, form.finalQuote])

    const spoolOptions = useMemo(
        () =>
            spools.map((spool) => ({
                value: String(spool.id),
                label: [spool.name, spool.materialType, spool.brand].filter(Boolean).join(' '),
                renderOption: (
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                            style={{ backgroundColor: spool.color || '#ccc' }}
                        />
                        <span className="truncate">
                            {spool.name || `耗材-${spool.id}`} · 剩余 {spool.remainingWeight ?? '-'}g
                        </span>
                    </div>
                ),
                renderValue: spool.name || `耗材-${spool.id}`,
            })),
        [spools],
    )

    const findSpoolName = useCallback(
        (id?: number) => {
            if (!id) return '未知耗材'
            const spool = spools.find((s) => s.id === id)
            if (!spool) return '未知耗材'
            const raw = spool.name || '未知耗材'
            return spool.brand ? raw.replace(spool.brand, '').trim() : raw
        },
        [spools],
    )

    const selectDraft = useCallback(
        (id: string) => {
            const draft = drafts.find((d) => String(d.id) === id)
            if (!draft) return
            setSelectedDraftId(id)
            setForm((prev) => ({
                orderName: draft.orderName || '',
                customerName: draft.customerName || '',
                printDuration: draft.printDuration,
                power: prev.power,
                electricityPrice: prev.electricityPrice,
                laborHourlyRate: prev.laborHourlyRate,
                consumables: (draft.consumables || []).map((c) => ({
                    material: c.material,
                    weight: c.weight,
                    price: c.price,
                })),
                finalQuote: {
                    logistics: draft.finalQuote?.logistics,
                    design: draft.finalQuote?.design,
                    other: draft.finalQuote?.other,
                },
                totalIncome: draft.totalIncome,
            }))
            toast.success('已加载草稿')
        },
        [drafts],
    )

    const updateForm = (patch: Partial<QuoteForm>) => setForm((p) => ({ ...p, ...patch }))

    const updateConsumable = (index: number, patch: Partial<API.Consumable>) => {
        setForm((prev) => ({
            ...prev,
            consumables: prev.consumables.map((c, i) => (i === index ? { ...c, ...patch } : c)),
        }))
    }

    const removeConsumable = (index: number) => {
        setForm((prev) => ({
            ...prev,
            consumables: prev.consumables.filter((_, i) => i !== index),
        }))
    }

    const addConsumable = (spoolId: number) => {
        setForm((prev) => ({
            ...prev,
            consumables: [...prev.consumables, { material: spoolId, weight: undefined, price: undefined }],
        }))
        setTempSpoolId('')
    }

    const handleDeleteDraft = useCallback(async () => {
        if (!selectedDraftId) {
            toast.warning('请先选择草稿')
            return
        }
        try {
            await deleteDraft({ id: selectedDraftId })
            toast.success('草稿已删除')
            setSelectedDraftId(undefined)
            await loadDrafts()
        } catch (error) {
            showRequestError(error, '删除草稿失败')
        }
    }, [selectedDraftId, loadDrafts])

    const handleSaveDraft = useCallback(async () => {
        setSavingDraft(true)
        try {
            const payload: API.OrderQuoteDraftDTO = {
                timestamp: Date.now(),
                orderName: form.orderName,
                customerName: form.customerName,
                printDuration: form.printDuration,
                power: form.power,
                electricityPrice: form.electricityPrice,
                laborHourlyRate: form.laborHourlyRate,
                consumables: form.consumables.map((c) => ({
                    material: c.material,
                    weight: c.weight,
                    price: c.price,
                })),
                finalQuote: {
                    logistics: form.finalQuote.logistics,
                    design: form.finalQuote.design,
                    other: form.finalQuote.other,
                },
                totalIncome: form.totalIncome,
            }
            await addDraft(payload)
            toast.success('草稿已保存')
            await loadDrafts()
        } catch (error) {
            showRequestError(error, '保存草稿失败')
        } finally {
            setSavingDraft(false)
        }
    }, [form, loadDrafts])

    const handleGenerateQuoteText = useCallback(async () => {
        const lines: string[] = []
        if (form.orderName) lines.push(`订单名称：${form.orderName}`)
        if (form.customerName) lines.push(`客户名称：${form.customerName}`)
        lines.push('------------------------')
        lines.push(`打印时长：${form.printDuration ?? 0} 小时`)
        lines.push(`功率：${form.power ?? 0} W`)
        lines.push(`电费：${form.electricityPrice ?? 0} 元/度`)
        lines.push(`人工：${form.laborHourlyRate ?? 0} 元/时`)
        lines.push('------------------------')
        lines.push('所需耗材：')
        form.consumables.forEach((item) => {
            lines.push(`  • ${findSpoolName(item.material)} ${item.weight ?? 0}g ${item.price ?? 0}元/g`)
        })
        lines.push('------------------------')
        lines.push('最终报价：')
        lines.push(`打印：¥${calculatedPrintCost.toFixed(2)}`)
        lines.push(`电费：¥${calculatedElectricityCost.toFixed(2)}`)
        lines.push(`人工：¥${calculatedLaborCost.toFixed(2)}`)
        if (form.finalQuote.logistics) lines.push(`物流：¥${Number(form.finalQuote.logistics).toFixed(2)}`)
        if (form.finalQuote.design) lines.push(`设计：¥${Number(form.finalQuote.design).toFixed(2)}`)
        if (form.finalQuote.other) lines.push(`其他：¥${Number(form.finalQuote.other).toFixed(2)}`)
        lines.push('------------------------')
        lines.push(`总价：¥${calculatedTotalPrice.toFixed(2)}`)
        await copyToClipboard(lines.join('\n'), '报价已复制到剪贴板')
    }, [form, findSpoolName, calculatedPrintCost, calculatedElectricityCost, calculatedLaborCost, calculatedTotalPrice])

    const handleCreate = useCallback(async () => {
        if (!form.orderName.trim() || !form.customerName.trim()) {
            toast.warning('请填写订单名称和客户名称')
            return
        }
        setCreating(true)
        try {
            if (selectedDraftId) {
                try {
                    await deleteDraft({ id: selectedDraftId })
                } catch {
                    // keep creating even if draft cleanup fails
                }
            }
            const ok = await onCreate({
                ...form,
                printCost: calculatedPrintCost,
                electricityCost: calculatedElectricityCost,
                laborCost: calculatedLaborCost,
                totalPrice: calculatedTotalPrice,
            })
            if (ok) onOpenChange(false)
        } finally {
            setCreating(false)
        }
    }, [form, selectedDraftId, onCreate, calculatedPrintCost, calculatedElectricityCost, calculatedLaborCost, calculatedTotalPrice, onOpenChange])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>预报价</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {isIntranet && drafts.length > 0 && (
                        <div className="space-y-2">
                            <Label>草稿列表</Label>
                            <div className="flex gap-2">
                                <Combobox
                                    className="max-w-xs"
                                    options={drafts.map((draft) => ({
                                        value: String(draft.id),
                                        label: `${draft.orderName || '未命名'} - ${draft.customerName || '未知客户'}`,
                                    }))}
                                    value={selectedDraftId ?? ''}
                                    onChange={(value) => {
                                        if (value) selectDraft(value)
                                    }}
                                    placeholder="请选择草稿以加载"
                                    searchPlaceholder="搜索草稿..."
                                    emptyText="未找到草稿"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={handleDeleteDraft}
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    删除草稿
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>订单名称</Label>
                            <Input
                                value={form.orderName}
                                onChange={(e) => updateForm({ orderName: e.target.value })}
                                placeholder="请输入订单名称"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>客户名称</Label>
                            <Input
                                value={form.customerName}
                                onChange={(e) => updateForm({ customerName: e.target.value })}
                                placeholder="请输入客户名称"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>打印时长(小时)</Label>
                            <DecimalInput
                                min={0}
                                value={form.printDuration ?? ''}
                                onValueChange={(val) => updateForm({ printDuration: val })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>功率(W)</Label>
                            <Input
                                value={form.power ?? ''}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>电费(元/度)</Label>
                            <Input
                                value={form.electricityPrice ?? ''}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>人工(元/时)</Label>
                            <Input
                                value={form.laborHourlyRate ?? ''}
                                disabled
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        功率、电费、人工参数仅可在「偏好设置」中修改。
                    </p>

                    <div className="space-y-2">
                        <Label>所需耗材</Label>
                        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                            {form.consumables.map((item, index) => (
                                <div
                                    key={`${item.material ?? 'm'}-${index}`}
                                    className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_88px_88px_40px] lg:grid-cols-[minmax(0,1fr)_100px_100px_40px] xl:grid-cols-[minmax(0,1fr)_112px_112px_44px]"
                                >
                                    <Combobox
                                        options={spoolOptions}
                                        value={item.material ? String(item.material) : ''}
                                        onChange={(value) => updateConsumable(index, { material: value ? Number(value) : undefined })}
                                        placeholder="选择耗材"
                                        searchPlaceholder="按名称/品牌/材料搜索"
                                        emptyText="未找到耗材"
                                    />
                                    <DecimalInput
                                        min={0}
                                        placeholder="克重"
                                        value={item.weight ?? ''}
                                        onValueChange={(val) => updateConsumable(index, { weight: val })}
                                    />
                                    <DecimalInput
                                        min={0}
                                        placeholder="单价"
                                        value={item.price ?? ''}
                                        onValueChange={(val) => updateConsumable(index, { price: val })}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="删除耗材"
                                        title="删除耗材"
                                        className="cursor-pointer self-center text-destructive hover:text-destructive"
                                        onClick={() => removeConsumable(index)}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            ))}
                            <Combobox
                                options={spoolOptions}
                                value={tempSpoolId}
                                onChange={(value) => {
                                    if (!value) return
                                    addConsumable(Number(value))
                                }}
                                placeholder="请选择耗材以添加"
                                searchPlaceholder="按名称/品牌/材料搜索"
                                emptyText="未找到耗材"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border/70 bg-card/70 p-4">
                        <h3 className="text-sm font-semibold">最终报价</h3>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">打印</Label>
                                <Input value={calculatedPrintCost.toFixed(2)} disabled />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">电费</Label>
                                <Input value={calculatedElectricityCost.toFixed(2)} disabled />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">人工</Label>
                                <Input value={calculatedLaborCost.toFixed(2)} disabled />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">物流</Label>
                                <DecimalInput
                                    min={0}
                                    value={form.finalQuote.logistics ?? ''}
                                    onValueChange={(val) => setForm((p) => ({ ...p, finalQuote: { ...p.finalQuote, logistics: val } }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">设计</Label>
                                <DecimalInput
                                    min={0}
                                    value={form.finalQuote.design ?? ''}
                                    onValueChange={(val) => setForm((p) => ({ ...p, finalQuote: { ...p.finalQuote, design: val } }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">其他</Label>
                                <DecimalInput
                                    min={0}
                                    value={form.finalQuote.other ?? ''}
                                    onValueChange={(val) => setForm((p) => ({ ...p, finalQuote: { ...p.finalQuote, other: val } }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end">
                            <span className="text-sm text-muted-foreground">总价</span>
                            <span className="ml-2 text-lg font-semibold text-primary">¥{calculatedTotalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>总收入</Label>
                            <DecimalInput
                                min={0}
                                step={0.01}
                                value={form.totalIncome ?? ''}
                                onValueChange={(val) => updateForm({ totalIncome: val })}
                                placeholder="请输入总收入"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        {isIntranet && (
                            <Button type="button" variant="outline" className="cursor-pointer" onClick={handleSaveDraft} disabled={savingDraft}>
                                {savingDraft ? '保存中...' : '保存草稿'}
                            </Button>
                        )}
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={handleGenerateQuoteText}>
                            生成报价
                        </Button>
                        <Button type="button" className="cursor-pointer" onClick={handleCreate} disabled={creating}>
                            {creating ? '生成中...' : '生成订单'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
