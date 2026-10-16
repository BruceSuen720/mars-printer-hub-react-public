import {create} from 'zustand'
import {toast as message} from 'sonner'
import {useLoginUserStore} from '@/stores/useLoginUserStore'
import type {SseMessage} from '@/types/sse'

const getDefaultSseUrl = () => {
    const protocol = window.location.protocol
    const host = window.location.host
    return `${protocol}//${host}/api/sse/connect`
}

interface SseStore {
    isConnected: boolean
    isConnecting: boolean
    eventSource: EventSource | null
    onDataUpdateMap: Map<string, (deviceId?: string) => void>

    init: () => void
    disconnect: () => void
    subscribe: (key: string, callback: (deviceId?: string) => void) => void
    unsubscribe: (key: string) => void
}

export const useSseStore = create<SseStore>((set, get) => {
    const checkUserLogin = () => useLoginUserStore.getState().isLoggedIn

    const isIntranetDeployment = () => {
        const state = useLoginUserStore.getState()
        return state.loginUser?.isIntranet === true
    }

    const handleMessage = (msg: SseMessage) => {
        const type = String(msg.type || '').toLowerCase()

        if (type === 'system' && msg.action === 'heartbeat') {
            return
        }

        if (type === 'notification' && msg.action === 'device_update') {
            const deviceId = msg.data?.deviceId
            get().onDataUpdateMap.forEach(callback => callback(deviceId))
            return
        }

        if (type === 'notification' && msg.action === 'notification' && msg.data) {
            const {content, type: level} = msg.data
            if (!content) return

            switch (level) {
                case 'success':
                    message.success(content)
                    break
                case 'warning':
                    message.warning(content)
                    break
                case 'error':
                    message.error(content)
                    break
                default:
                    message.info(content)
            }
        }
    }

    return {
        isConnected: false,
        isConnecting: false,
        eventSource: null,
        onDataUpdateMap: new Map(),

        subscribe: (key, callback) => {
            const map = get().onDataUpdateMap
            map.set(key, callback)
            set({onDataUpdateMap: map})
        },

        unsubscribe: (key) => {
            const map = get().onDataUpdateMap
            map.delete(key)
            set({onDataUpdateMap: map})
        },

        init: () => {
            const state = get()
            if (!checkUserLogin() || state.eventSource) return
            if (!isIntranetDeployment()) return

            try {
                set({isConnecting: true})

                const eventSource = new EventSource(getDefaultSseUrl(), {
                    withCredentials: true,
                })
                set({eventSource})

                eventSource.onopen = () => {
                    set({eventSource, isConnected: true, isConnecting: false})
                }

                eventSource.addEventListener('message', (event) => {
                    try {
                        const messageData: SseMessage = JSON.parse(event.data)
                        handleMessage(messageData)
                    } catch (error) {
                        console.error('解析SSE消息失败:', error)
                    }
                })

                eventSource.onerror = () => {
                    const current = get().eventSource
                    const isClosed = current?.readyState === EventSource.CLOSED

                    set({
                        isConnected: false,
                        isConnecting: current?.readyState === EventSource.CONNECTING
                    })

                    if (isClosed) {
                        current?.close()
                        set({eventSource: null, isConnecting: false})
                        if (checkUserLogin()) {
                            message.error('SSE连接已关闭')
                        }
                    }
                }
            } catch (error) {
                console.error('创建SSE连接失败:', error)
                set({isConnecting: false})
                if (checkUserLogin()) {
                    message.error('建立SSE连接失败')
                }
            }
        },

        disconnect: () => {
            const state = get()
            if (state.eventSource) {
                state.eventSource.close()
            }

            set({
                eventSource: null,
                isConnected: false,
                isConnecting: false
            })
        }
    }
})
