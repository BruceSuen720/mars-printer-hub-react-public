import { useState, useCallback, useRef } from 'react'
import { getRemoteConfigUrls } from '@/api/device'

export interface RemoteColorConfigItem {
    name: string
    hex: string
    brand?: string
}

export interface RemoteSpoolBrand {
    name: string
    spoolWeight: number
    description: string
    logo: string
}

export interface RemoteSpoolAppearance {
    id: number
    label: string
    color: string
    style: Record<string, unknown>
}

export interface RemoteSpoolConfig {
    brands: RemoteSpoolBrand[]
    materialTypes: string[]
    appearances: RemoteSpoolAppearance[]
}

export interface RemoteFilamentInfo {
    name: string
    filament_type: string
    nozzle_temperature_range_high: number
    nozzle_temperature_range_low: number
}

export type RemoteFilamentConfig = Record<string, RemoteFilamentInfo>

// Default URLs (fallback if backend fails)
const DEFAULT_COLOR_URL = 'https://spool-r2.hcgl.top/color.json'
const DEFAULT_FILAMENTS_URL = 'https://spool-r2.hcgl.top/filaments.json'
const DEFAULT_SPOOL_URL = 'https://spool-r2.hcgl.top/spoolConfig.json'

// Global cache variables (kept outside React lifecycle to persist across components)
let configUrls: { colorUrl: string; filamentsUrl: string; spoolUrl: string } | null = null
let configUrlsPromise: Promise<{ colorUrl: string; filamentsUrl: string; spoolUrl: string }> | null = null

async function ensureConfigUrlsLoaded(): Promise<NonNullable<typeof configUrls>> {
    if (configUrls) return configUrls

    if (!configUrlsPromise) {
        configUrlsPromise = getRemoteConfigUrls()
            .then((res) => {
                if (res.data?.data) {
                    const data = res.data.data
                    configUrls = {
                        colorUrl: data.colorUrl || DEFAULT_COLOR_URL,
                        filamentsUrl: data.filamentsUrl || DEFAULT_FILAMENTS_URL,
                        spoolUrl: data.spoolUrl || DEFAULT_SPOOL_URL,
                    }
                } else {
                    configUrls = {
                        colorUrl: DEFAULT_COLOR_URL,
                        filamentsUrl: DEFAULT_FILAMENTS_URL,
                        spoolUrl: DEFAULT_SPOOL_URL,
                    }
                }
                return configUrls
            })
            .catch(() => {
                configUrls = {
                    colorUrl: DEFAULT_COLOR_URL,
                    filamentsUrl: DEFAULT_FILAMENTS_URL,
                    spoolUrl: DEFAULT_SPOOL_URL,
                }
                configUrlsPromise = null
                return configUrls
            })
    }

    return configUrlsPromise as Promise<NonNullable<typeof configUrls>>
}

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    return (await response.json()) as T
}

// Global state for color config
let cachedColorConfig: RemoteColorConfigItem[] | null = null
let colorConfigPromise: Promise<RemoteColorConfigItem[]> | null = null

async function loadColorConfig() {
    if (cachedColorConfig) return cachedColorConfig
    if (!colorConfigPromise) {
        colorConfigPromise = ensureConfigUrlsLoaded()
            .then((urls) => fetchJson<RemoteColorConfigItem[]>(urls.colorUrl))
            .then((data) => {
                cachedColorConfig = data
                return data
            })
            .catch((error) => {
                colorConfigPromise = null
                throw new Error(String(error))
            })
    }
    return colorConfigPromise
}

export function useRemoteColorConfig() {
    const [colorConfig, setColorConfig] = useState<RemoteColorConfigItem[] | null>(cachedColorConfig)
    const [colorConfigError, setColorConfigError] = useState<Error | null>(null)
    const isFetching = useRef(false)

    const ensureColorConfigLoaded = useCallback(async () => {
        if (cachedColorConfig) {
            if (colorConfig !== cachedColorConfig) setColorConfig(cachedColorConfig)
            return
        }
        if (isFetching.current) return
        isFetching.current = true
        try {
            const data = await loadColorConfig()
            setColorConfig(data)
            setColorConfigError(null)
        } catch (err) {
            setColorConfigError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            isFetching.current = false
        }
    }, [colorConfig])

    return { colorConfig, colorConfigError, ensureColorConfigLoaded }
}

// Global state for spool config
let cachedSpoolConfig: RemoteSpoolConfig | null = null
let spoolConfigPromise: Promise<RemoteSpoolConfig> | null = null

async function loadSpoolConfig() {
    if (cachedSpoolConfig) return cachedSpoolConfig
    if (!spoolConfigPromise) {
        spoolConfigPromise = ensureConfigUrlsLoaded()
            .then((urls) => fetchJson<RemoteSpoolConfig>(urls.spoolUrl))
            .then((data) => {
                cachedSpoolConfig = data
                return data
            })
            .catch((error) => {
                spoolConfigPromise = null
                throw new Error(String(error))
            })
    }
    return spoolConfigPromise
}

export function useRemoteSpoolConfig() {
    const [spoolConfig, setSpoolConfig] = useState<RemoteSpoolConfig | null>(cachedSpoolConfig)
    const [spoolConfigError, setSpoolConfigError] = useState<Error | null>(null)
    const isFetching = useRef(false)

    const ensureSpoolConfigLoaded = useCallback(async () => {
        if (cachedSpoolConfig) {
            if (spoolConfig !== cachedSpoolConfig) setSpoolConfig(cachedSpoolConfig)
            return
        }
        if (isFetching.current) return
        isFetching.current = true
        try {
            const data = await loadSpoolConfig()
            setSpoolConfig(data)
            setSpoolConfigError(null)
        } catch (err) {
            setSpoolConfigError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            isFetching.current = false
        }
    }, [spoolConfig])

    return { spoolConfig, spoolConfigError, ensureSpoolConfigLoaded }
}

// Global state for filaments config
let cachedFilamentsConfig: RemoteFilamentConfig | null = null
let filamentsConfigPromise: Promise<RemoteFilamentConfig> | null = null

async function loadFilamentsConfig() {
    if (cachedFilamentsConfig) return cachedFilamentsConfig
    if (!filamentsConfigPromise) {
        filamentsConfigPromise = ensureConfigUrlsLoaded()
            .then((urls) => fetchJson<RemoteFilamentConfig>(urls.filamentsUrl))
            .then((data) => {
                cachedFilamentsConfig = data
                return data
            })
            .catch((error) => {
                filamentsConfigPromise = null
                throw new Error(String(error))
            })
    }
    return filamentsConfigPromise
}

export function useRemoteFilamentsConfig() {
    const [filamentsConfig, setFilamentsConfig] = useState<RemoteFilamentConfig | null>(cachedFilamentsConfig)
    const [filamentsConfigError, setFilamentsConfigError] = useState<Error | null>(null)
    const isFetching = useRef(false)

    const ensureFilamentsConfigLoaded = useCallback(async () => {
        if (cachedFilamentsConfig) {
            if (filamentsConfig !== cachedFilamentsConfig) setFilamentsConfig(cachedFilamentsConfig)
            return
        }
        if (isFetching.current) return
        isFetching.current = true
        try {
            const data = await loadFilamentsConfig()
            setFilamentsConfig(data)
            setFilamentsConfigError(null)
        } catch (err) {
            setFilamentsConfigError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            isFetching.current = false
        }
    }, [filamentsConfig])

    return { filamentsConfig, filamentsConfigError, ensureFilamentsConfigLoaded }
}
