export interface SseMessageData {
    deviceId?: string
    content?: string
    type?: string
    [key: string]: unknown
}

export interface SseMessage<T = SseMessageData> {
    type: string
    action: string
    data: T
    timestamp: number
}
