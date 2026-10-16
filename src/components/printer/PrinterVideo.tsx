import React, { useEffect, useRef, useState, useCallback } from 'react'
import type Hls from 'hls.js'
import { getStreamInfo, disconnectStream } from '@/api/device'
import { Loader2, Play, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PrinterVideoProps {
    deviceId: string
    autoPlay?: boolean
    active?: boolean
}

const getStreamDisconnectUrl = (deviceId: string) => {
    const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
    const endpoint = `${apiBaseUrl}/device/stream/disconnect/${encodeURIComponent(deviceId)}?type=auto`
    return new URL(endpoint, window.location.origin).toString()
}

export const PrinterVideo: React.FC<PrinterVideoProps> = ({ deviceId, autoPlay = true, active = true }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const playAbortControllerRef = useRef<AbortController | null>(null)
    const hlsInitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const playerGenerationRef = useRef(0)
    const streamSessionActiveRef = useRef(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [streamType, setStreamType] = useState<string | null>(null)
    const [streamUrl, setStreamUrl] = useState<string | null>(null)

    const normalizeStreamUrl = useCallback((url?: string) => {
        if (!url) return null
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        return url.startsWith('/api') ? url : `/api${url}`
    }, [])

    const handleStop = useCallback(async () => {
        playerGenerationRef.current += 1
        playAbortControllerRef.current?.abort()
        playAbortControllerRef.current = null

        if (hlsInitTimerRef.current) {
            clearTimeout(hlsInitTimerRef.current)
            hlsInitTimerRef.current = null
        }

        setIsPlaying(false)
        setStreamType(null)
        setStreamUrl(null)

        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        const video = videoRef.current
        if (video) {
            video.onloadedmetadata = null
            video.removeAttribute('src')
            video.load()
        }

        if (streamSessionActiveRef.current) {
            try {
                await disconnectStream({ deviceId, type: 'auto' })
                streamSessionActiveRef.current = false
            } catch (err) {
                // Keep the session marked active so pagehide can retry with Beacon.
                console.error('Failed to disconnect stream', err)
            }
        }
    }, [deviceId])

    const disconnectOnPageHide = useCallback(() => {
        if (!streamSessionActiveRef.current) return

        const url = getStreamDisconnectUrl(deviceId)
        const beaconSent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)
        if (!beaconSent) {
            void fetch(url, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
            }).catch(() => undefined)
        }
        streamSessionActiveRef.current = false
    }, [deviceId])

    const initPlayer = useCallback(async (url: string, generation: number) => {
        const video = videoRef.current
        if (!video || generation !== playerGenerationRef.current) return

        try {
            const { default: Hls } = await import('hls.js')
            if (generation !== playerGenerationRef.current || !videoRef.current) return

            if (!Hls.isSupported()) {
                if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Use native HLS only when MediaSource playback is unavailable.
                    video.src = url
                    video.onloadedmetadata = () => {
                        video.play().catch(() => { })
                    }
                    return
                }

                console.error('HLS playback is not supported by this browser')
                await handleStop()
                setError(true)
                return
            }

            const hls = new Hls()
            hlsRef.current = hls

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                if (generation === playerGenerationRef.current) {
                    hls.loadSource(url)
                }
            })

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => { })
            })

            hls.on(Hls.Events.ERROR, (_event, data) => {
                console.error('HLS playback error', data.type, data.details, data.error)
                if (data.fatal) {
                    void handleStop()
                    setError(true)
                }
            })

            hls.attachMedia(video)
        } catch (err) {
            if (generation !== playerGenerationRef.current) return
            console.error('Failed to initialize HLS player', err)
            await handleStop()
            setError(true)
        }
    }, [handleStop])

    const startMjpeg = useCallback((url: string) => {
        playerGenerationRef.current += 1
        setStreamType('MJPEG')
        setStreamUrl(url)
        setIsPlaying(true)
    }, [])

    const startHls = useCallback((url: string) => {
        const generation = ++playerGenerationRef.current
        setStreamType('HLS')
        setStreamUrl(url)
        setIsPlaying(true)
        // Need a tiny delay to ensure the video element is mounted before attaching HLS
        if (hlsInitTimerRef.current) {
            clearTimeout(hlsInitTimerRef.current)
        }
        hlsInitTimerRef.current = setTimeout(() => {
            hlsInitTimerRef.current = null
            void initPlayer(url, generation)
        }, 50)
    }, [initPlayer])

    const handlePlay = useCallback(async () => {
        if (!deviceId) return

        playAbortControllerRef.current?.abort()
        const abortController = new AbortController()
        playAbortControllerRef.current = abortController
        streamSessionActiveRef.current = true

        setLoading(true)
        setError(false)

        try {
            const res = await getStreamInfo({ deviceId }, { signal: abortController.signal })
            if (abortController.signal.aborted || playAbortControllerRef.current !== abortController) {
                return
            }
            const info = res.data?.data
            const type = info?.streamType?.toUpperCase()
            const url = normalizeStreamUrl(info?.url)

            if (!type || !url) {
                await handleStop()
                setError(true)
                return
            }

            if (type === 'HLS') {
                startHls(url)
                return
            }

            if (type === 'MJPEG') {
                startMjpeg(url)
                return
            }

            await handleStop()
            setError(true)
        } catch (err) {
            if (abortController.signal.aborted) {
                return
            }
            console.error('Failed to get stream:', err)
            await handleStop()
            setError(true)
        } finally {
            if (playAbortControllerRef.current === abortController) {
                playAbortControllerRef.current = null
                setLoading(false)
            }
        }
    }, [deviceId, handleStop, normalizeStreamUrl, startHls, startMjpeg])

    // Cleanup on unmount or deviceId change
    useEffect(() => {
        return () => {
            void handleStop()
        }
    }, [handleStop])

    useEffect(() => {
        const handlePageHide = () => disconnectOnPageHide()
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && active && autoPlay && deviceId) {
                void handlePlay()
            }
        }

        window.addEventListener('pagehide', handlePageHide)
        window.addEventListener('pageshow', handlePageShow)
        return () => {
            window.removeEventListener('pagehide', handlePageHide)
            window.removeEventListener('pageshow', handlePageShow)
        }
    }, [active, autoPlay, deviceId, disconnectOnPageHide, handlePlay])

    // Stop stream immediately when dialog closes
    useEffect(() => {
        if (!active) {
            void handleStop()
        }
    }, [active, handleStop])

    // Auto-play if requested
    useEffect(() => {
        if (active && autoPlay && deviceId) {
            void handlePlay()
        }
    }, [active, autoPlay, deviceId, handlePlay])


    if (error) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <AlertCircle className="mb-2 h-8 w-8" />
                <p className="mb-4 text-sm font-medium">画面加载失败</p>
                <Button variant="outline" size="sm" onClick={handlePlay} className="border-destructive/30 text-destructive hover:bg-destructive/20">
                    点击重试
                </Button>
            </div>
        )
    }

    if (!isPlaying || loading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/20 text-muted-foreground rounded-lg border border-border/50">
                {loading ? (
                    <>
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium animate-pulse">正在连接摄像头流...</p>
                    </>
                ) : (
                    <Button variant="secondary" onClick={handlePlay} className="gap-2">
                        <Play className="h-4 w-4" />
                        查看实时画面
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
            {streamType === 'MJPEG' && streamUrl ? (
                <img
                    src={streamUrl}
                    alt="实时画面"
                    className="h-full w-full object-contain"
                />
            ) : (
                <video
                    ref={videoRef}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    muted
                />
            )}
        </div>
    )
}
