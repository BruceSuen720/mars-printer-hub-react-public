import { useCallback, useEffect, useState } from 'react'
import { Link2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getRemoteConfigUrls, updateRemoteConfigUrls } from '@/api/device'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showRequestError } from '@/request'
import { cn } from '@/lib/utils'

const DEFAULT_URLS = {
    colorUrl: 'https://spool-r2.hcgl.top/color.json',
    filamentsUrl: 'https://spool-r2.hcgl.top/filaments.json',
    spoolUrl: 'https://spool-r2.hcgl.top/spoolConfig.json',
}

type FormState = {
    colorUrl: string
    filamentsUrl: string
    spoolUrl: string
}

export default function RemoteConfigPanel() {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<FormState>({
        colorUrl: '',
        filamentsUrl: '',
        spoolUrl: '',
    })

    const updateForm = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }))

    const fetchConfig = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getRemoteConfigUrls()
            if (res.data?.data) {
                const data = res.data.data as Record<string, string | undefined>
                setForm({
                    colorUrl: data.colorUrl || DEFAULT_URLS.colorUrl,
                    filamentsUrl: data.filamentsUrl || DEFAULT_URLS.filamentsUrl,
                    spoolUrl: data.spoolUrl || DEFAULT_URLS.spoolUrl,
                })
            }
        } catch (error) {
            showRequestError(error, '获取远程配置失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const save = useCallback(async (next: FormState) => {
        setSaving(true)
        try {
            await updateRemoteConfigUrls(next)
            toast.success('配置保存成功，刷新页面后生效')
            return true
        } catch (error) {
            showRequestError(error, '保存失败')
            return false
        } finally {
            setSaving(false)
        }
    }, [])

    const resetToDefault = async () => {
        const next = { ...DEFAULT_URLS }
        setForm(next)
        await save(next)
    }

    const downloadUrl = async (url: string) => {
        if (!url) return
        try {
            const res = await fetch(url, { mode: 'cors' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const filename = url.split('/').pop()?.split('?')[0] || 'download.json'
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(blobUrl)
        } catch (error) {
            toast.error(`下载失败：${error instanceof Error ? error.message : '未知错误'}`)
        }
    }

    const fieldRow = (
        label: string,
        hint: string,
        value: string,
        key: keyof FormState,
    ) => (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <span className="text-[11px] text-muted-foreground">{hint}</span>
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Link2 size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        value={value}
                        disabled={saving}
                        onChange={(e) => updateForm({ [key]: e.target.value } as Partial<FormState>)}
                        placeholder={DEFAULT_URLS[key]}
                    />
                </div>
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => downloadUrl(value)}>
                    <Download size={14} /> 下载
                </Button>
            </div>
        </div>
    )

    return (
        <div className="space-y-5 p-5">
            <div className={cn('space-y-5 rounded-lg border border-border/60 bg-muted/20 p-4', loading && 'opacity-70')}>
                {fieldRow('颜色配置 URL', '耗材颜色列表', form.colorUrl, 'colorUrl')}
                {fieldRow('耗材配置 URL', '材料类型与温度参数', form.filamentsUrl, 'filamentsUrl')}
                {fieldRow('线盘配置 URL', '品牌、材料、外观配置', form.spoolUrl, 'spoolUrl')}
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={resetToDefault} disabled={saving || loading}>
                    恢复默认
                </Button>
                <Button type="button" size="sm" className="cursor-pointer" onClick={() => save(form)} disabled={saving || loading}>
                    {saving ? '保存中...' : '保存配置'}
                </Button>
            </div>
        </div>
    )
}
