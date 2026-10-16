import { version as getBackendVersion } from '@/api/health'

const REMOTE_VERSION_URL = 'https://spool-r2.hcgl.top/version.json'

type RemoteVersionPayload = {
    latest?: string
    publishedAt?: string
    title?: string
}

type VersionCheckResult = {
    backendVersion: string
    latestVersion: string
    publishedAt: string
    title: string
    hasUpdate: boolean
}

const FALLBACK_VERSION = 'v0.0.0'

const normalizeVersion = (value: unknown): string => {
    if (typeof value !== 'string') {
        return FALLBACK_VERSION
    }
    const trimmed = value.trim()
    if (!trimmed) {
        return FALLBACK_VERSION
    }
    return trimmed.startsWith('v') ? trimmed : `v${trimmed}`
}

const compareSemver = (a: string, b: string): number => {
    const left = a.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0)
    const right = b.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0)
    const length = Math.max(left.length, right.length)

    for (let i = 0; i < length; i += 1) {
        const x = left[i] ?? 0
        const y = right[i] ?? 0
        if (x > y) return 1
        if (x < y) return -1
    }
    return 0
}

const extractBackendVersion = (value: unknown): string => {
    if (typeof value === 'string') {
        return value
    }
    if (typeof value === 'object' && value !== null && 'data' in value) {
        const data = (value as { data?: unknown }).data
        if (typeof data === 'string') {
            return data
        }
    }
    return FALLBACK_VERSION
}

const getRemoteVersion = async (): Promise<RemoteVersionPayload> => {
    const remoteUrl = new URL(REMOTE_VERSION_URL)
    remoteUrl.searchParams.set('t', Date.now().toString())
    const response = await fetch(remoteUrl.toString(), { cache: 'no-store' })
    if (!response.ok) {
        throw new Error(`远端版本接口异常: ${response.status}`)
    }
    return (await response.json()) as RemoteVersionPayload
}

export const checkLatestVersion = async (): Promise<VersionCheckResult> => {
    const [remote, backendResponse] = await Promise.all([
        getRemoteVersion(),
        getBackendVersion(),
    ])

    const latestVersion = normalizeVersion(remote.latest)
    const backendVersion = normalizeVersion(extractBackendVersion(backendResponse.data))

    return {
        backendVersion,
        latestVersion,
        publishedAt: remote.publishedAt || '-',
        title: remote.title || '-',
        hasUpdate: compareSemver(backendVersion, latestVersion) < 0,
    }
}
