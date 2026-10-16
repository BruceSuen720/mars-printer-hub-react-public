export {}

declare global {
    interface Window {
        __APP_CONFIG__?: {
            [key: string]: boolean | string | undefined
        }
    }
}
