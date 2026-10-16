import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Camera, Loader2, ScanLine, ZoomIn } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface HomeScanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onScanResult: (text: string) => void
    title?: string
    description?: string
}

export default function HomeScanDialog({
    open,
    onOpenChange,
    onScanResult,
    title = '扫码进入页面',
    description = '支持识别站内二维码，扫码后会在应用内直接跳转。',
}: HomeScanDialogProps) {
    const scannerId = useId().replace(/:/g, '')
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const handledResultRef = useRef(false)
    const [initializing, setInitializing] = useState(false)
    const [scanHint, setScanHint] = useState('将二维码放入取景框内')
    const [zoomSupported, setZoomSupported] = useState(false)
    const [zoomValue, setZoomValue] = useState(1)
    const [zoomMin, setZoomMin] = useState(1)
    const [zoomMax, setZoomMax] = useState(1)
    const [zoomStep, setZoomStep] = useState(0.1)

    const resetZoomState = useCallback(() => {
        setZoomSupported(false)
        setZoomValue(1)
        setZoomMin(1)
        setZoomMax(1)
        setZoomStep(0.1)
    }, [])

    const configureZoom = useCallback((scanner: Html5Qrcode) => {
        try {
            const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
                zoom?: { min?: number; max?: number; step?: number }
            }
            const zoom = capabilities.zoom

            if (!zoom || typeof zoom.min !== 'number' || typeof zoom.max !== 'number') {
                resetZoomState()
                return
            }

            const min = zoom.min
            const max = zoom.max
            const step = typeof zoom.step === 'number' && zoom.step > 0 ? zoom.step : 0.1
            const settings = scanner.getRunningTrackSettings() as MediaTrackSettings & { zoom?: number }
            const initialValue =
                typeof settings.zoom === 'number'
                    ? Math.min(Math.max(settings.zoom, min), max)
                    : min

            setZoomSupported(max > min)
            setZoomMin(min)
            setZoomMax(max)
            setZoomStep(step)
            setZoomValue(initialValue)
        } catch {
            resetZoomState()
        }
    }, [resetZoomState])

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current
        scannerRef.current = null
        resetZoomState()

        if (!scanner) return

        try {
            await scanner.stop()
        } catch {
            // Scanner may not have started yet.
        }

        try {
            await scanner.clear()
        } catch {
            // Clearing can fail if the container is already gone.
        }
    }, [resetZoomState])

    const handleZoomChange = useCallback(async (nextZoomRaw: string) => {
        const scanner = scannerRef.current
        const nextZoom = Number(nextZoomRaw)

        if (!scanner || Number.isNaN(nextZoom)) return

        setZoomValue(nextZoom)

        try {
            const zoomConstraints = {
                advanced: [{ zoom: nextZoom }],
            } as MediaTrackConstraints & {
                advanced: Array<MediaTrackConstraintSet & { zoom: number }>
            }
            await scanner.applyVideoConstraints({
                ...zoomConstraints,
            })
        } catch {
            setScanHint('当前设备不支持调整扫码倍率')
            resetZoomState()
        }
    }, [resetZoomState])

    useEffect(() => {
        if (!open) {
            handledResultRef.current = false
            setScanHint('将二维码放入取景框内')
            void stopScanner()
            return
        }

        let cancelled = false

        const startScanner = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setScanHint('当前环境不支持摄像头扫码，需配置 https')
                return
            }

            setInitializing(true)
            setScanHint('正在启动摄像头...')

            const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
            const scanner = new Html5Qrcode(scannerId, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            })
            scannerRef.current = scanner

            const handleSuccess = async (decodedText: string) => {
                if (handledResultRef.current) return
                handledResultRef.current = true
                setScanHint('已识别，正在处理...')
                await stopScanner()
                if (!cancelled) onScanResult(decodedText)
            }

            const startWithConfig = async (cameraConfig: string | MediaTrackConstraints) => {
                await scanner.start(
                    cameraConfig,
                    {
                        fps: 10,
                        qrbox: { width: 220, height: 220 },
                        aspectRatio: 1,
                    },
                    handleSuccess,
                    () => undefined
                )
                configureZoom(scanner)

                if (!cancelled) {
                    setScanHint('将二维码放入取景框内')
                }
            }

            try {
                await startWithConfig({ facingMode: 'environment' })
            } catch {
                try {
                    const cameras = await Html5Qrcode.getCameras()
                    const preferredCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label))
                    const fallbackCamera = preferredCamera ?? cameras[0]

                    if (!fallbackCamera) {
                        throw new Error('NO_CAMERA')
                    }

                    await startWithConfig(fallbackCamera.id)
                } catch {
                    if (!cancelled) {
                        setScanHint('无法打开摄像头，请检查权限或改用手动输入')
                    }
                }
            } finally {
                if (!cancelled) {
                    setInitializing(false)
                }
            }
        }

        void startScanner()

        return () => {
            cancelled = true
            void stopScanner()
        }
    }, [configureZoom, onScanResult, open, scannerId, stopScanner])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ScanLine size={18} />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border bg-black/5">
                        <div id={scannerId} className="min-h-[280px] w-full" />
                    </div>

                    {zoomSupported ? (
                        <div className="rounded-xl border bg-background/70 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2 text-foreground">
                                    <ZoomIn size={14} />
                                    <span>扫码倍率</span>
                                </div>
                                <span className="font-medium text-muted-foreground">{zoomValue.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min={zoomMin}
                                max={zoomMax}
                                step={zoomStep}
                                value={zoomValue}
                                onChange={(event) => void handleZoomChange(event.target.value)}
                                className={cn(
                                    'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary',
                                    'disabled:cursor-not-allowed disabled:opacity-50'
                                )}
                                aria-label="调整扫码摄像头倍率"
                            />
                        </div>
                    ) : null}

                    <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            {initializing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                            <span>{scanHint}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
