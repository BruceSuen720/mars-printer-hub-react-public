import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMachineCode, activate } from '@/api/license'
import { copyToClipboard } from '@/utils/clipboard'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Copy, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import AuthLayout from '@/layouts/AuthLayout'
import { showRequestError } from '@/request'

export default function LicenseView() {
    const [machineCode, setMachineCode] = useState('')
    const [licenseKey, setLicenseKey] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchMachineCode = async () => {
            try {
                const res = await getMachineCode()
                if (res.data?.data) {
                    setMachineCode(res.data.data)
                }
            } catch (error) {
                console.error('获取机器码失败', error)
                showRequestError(error, '获取机器码失败')
            }
        }
        fetchMachineCode()
    }, [])

    const handleCopy = () => {
        if (!machineCode) return
        copyToClipboard(machineCode, '机器码已复制', '复制失败，请手动复制')
    }

    const handleActivate = async () => {
        if (!licenseKey) {
            toast.warning('请输入授权码')
            return
        }

        setLoading(true)
        try {
            await activate({ license: licenseKey })
            toast.success('激活成功')
            setTimeout(() => {
                navigate('/', { replace: true })
            }, 1500)
        } catch (error: unknown) {
            console.error('激活失败', error)
            toast.error(error instanceof Error ? error.message : '激活失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            {/* Header */}
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-primary">
                    <ShieldCheck size={20} />
                    <h1 className="text-xl font-semibold">系统授权</h1>
                </div>
            </div>

            {/* Warning alert */}
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="mb-1 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        系统未激活
                    </span>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                    当前系统处于未授权状态，请复制下方机器码以及购买记录发送给管理员以获取 License。
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/80 px-3 py-1.5 dark:bg-amber-900/30">
                    <span className="text-xs text-muted-foreground">联系邮箱：</span>
                    <span className="font-mono text-xs font-medium text-amber-700 dark:text-amber-300">
                        marsss816@gmail.com
                    </span>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="machineCode">机器码 (Machine Code)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="machineCode"
                            value={machineCode}
                            readOnly
                            className="font-mono text-xs"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0 cursor-pointer"
                            onClick={handleCopy}
                            title="复制机器码"
                        >
                            <Copy size={16} />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        请将此机器码发送给管理员以获取授权码
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="licenseKey">
                        授权码 (License Key) <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="licenseKey"
                        placeholder="请输入授权码"
                        rows={4}
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        className="font-mono text-xs"
                    />
                </div>

                <Button
                    type="button"
                    className="w-full cursor-pointer"
                    disabled={!licenseKey || loading}
                    onClick={handleActivate}
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        '激活系统'
                    )}
                </Button>
            </div>
        </AuthLayout>
    )
}
