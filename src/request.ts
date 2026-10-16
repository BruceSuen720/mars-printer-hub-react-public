import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

type BizEnvelope = {
    code?: number
    message?: string
}

type ErrorPayload = {
    message?: unknown
    msg?: unknown
    error?: unknown
}

type RequestConfigExt = InternalAxiosRequestConfig & {
    skipBizErrorHandler?: boolean
}

const isBizEnvelope = (data: unknown): data is BizEnvelope => {
    return typeof data === 'object' && data !== null && 'code' in data
}

export class BizError extends Error {
    code: number
    response?: AxiosResponse

    constructor(code: number, message: string, response?: AxiosResponse) {
        super(message)
        this.name = 'BizError'
        this.code = code
        this.response = response
    }
}

const getMessageFromPayload = (payload: unknown): string | undefined => {
    if (typeof payload === 'string' && payload.trim()) {
        return payload
    }

    if (!payload || typeof payload !== 'object') {
        return undefined
    }

    const candidate = payload as ErrorPayload
    for (const value of [candidate.message, candidate.msg, candidate.error]) {
        if (typeof value === 'string' && value.trim()) {
            return value
        }
    }

    return undefined
}

export const getErrorMessage = (error: unknown, fallback = '请求失败'): string => {
    if (error instanceof BizError && error.message.trim()) {
        return error.message
    }

    if (axios.isAxiosError(error)) {
        const responseMessage = getMessageFromPayload(error.response?.data)
        if (responseMessage) {
            return responseMessage
        }

        if (error.message?.trim()) {
            return error.message
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message
    }

    return fallback
}

export const showRequestError = (error: unknown, fallback = '请求失败') => {
    toast.error(getErrorMessage(error, fallback))
}

// 创建 Axios 实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 60000,
    withCredentials: true,
    // 配置数组参数序列化，支持后端期望的格式
    paramsSerializer: {
        serialize: (params: Record<string, unknown>) => {
            const searchParams = new URLSearchParams()

            Object.keys(params).forEach(key => {
                const value = params[key]
                if (value === null || value === undefined) {
                    return // 跳过 null 和 undefined 值
                }

                if (Array.isArray(value)) {
                    // 对于数组，使用多个同名参数
                    value.forEach(item => {
                        if (item !== null && item !== undefined) {
                            searchParams.append(key, String(item))
                        }
                    })
                } else {
                    // 非数组值直接添加
                    searchParams.append(key, String(value))
                }
            })

            return searchParams.toString()
        }
    }
})

// 全局请求拦截器
request.interceptors.request.use(
    function (config) {
        return config
    },
    function (error) {
        return Promise.reject(new BizError(-1, getErrorMessage(error), error.response))
    },
)

// 全局响应拦截器
request.interceptors.response.use(
    function (response) {
        const { data } = response
        const config = response.config as RequestConfigExt
        if (!isBizEnvelope(data)) {
            return response
        }

        // 未登录
        if (data.code === 40100) {
            // 不是获取用户信息的请求，并且用户目前不是已经在用户登录页面或初始化页面，则跳转到登录页面
            if (
                !response.request.responseURL.includes('user/get/login') &&
                !window.location.pathname.includes('/user/login') &&
                !window.location.pathname.includes('/user/register') &&
                !window.location.pathname.includes('/setup')
            ) {
                toast.warning('请先登录')
                const currentPath = window.location.pathname + window.location.search
                window.location.href = `/user/login?redirect=${encodeURIComponent(currentPath)}`
            }
            if (!config.skipBizErrorHandler) {
                return Promise.reject(new BizError(data.code, data.message || '请先登录', response))
            }
        }
        // 未授权
        if (data.code === 9999) {
            if (!window.location.pathname.includes('/license')) {
                toast.error('系统未授权，请激活')
                window.location.href = `/license`
            }
            if (!config.skipBizErrorHandler) {
                return Promise.reject(new BizError(data.code, data.message || '系统未授权', response))
            }
        }

        if (data.code !== undefined && data.code !== 0 && !config.skipBizErrorHandler) {
            return Promise.reject(new BizError(data.code, data.message || '请求失败', response))
        }
        return response
    },
    function (error) {
        return Promise.reject(error)
    },
)

export default request
