import { create } from 'zustand'
import { toast } from 'sonner'
import { getCurrentUserConfig, saveCurrentUserConfig } from '@/api/userConfig'
import { isCustomBackgroundEnabled } from '@/config/featureFlags'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { DEFAULT_TABLE_PAGE_SIZE, normalizeTablePageSize } from '@/utils/tablePageSize'
import {
    DEFAULT_DESKTOP_LAYOUT,
    DEFAULT_DESKTOP_THEME,
    DEFAULT_MOBILE_THEME,
    getStoredAppFontFamily,
    getStoredCornerStyle,
    getStoredMobileBackgroundUrl,
    getStoredDesktopLayout,
    getStoredDesktopTheme,
    getStoredMobileTheme,
    getStoredWebBackgroundUrl,
    normalizeBackgroundUrl,
    normalizeAppFontFamily,
    normalizeCornerStyle,
    normalizeDesktopLayoutMode,
    normalizeThemeMode,
    persistAppearancePreferences,
} from '@/utils/appearancePreferences'

export type UserConfigWithAppearance = API.UserConfigDTO & {
    cornerStyle?: string
}

interface UserConfigState {
    userConfig: UserConfigWithAppearance
    loaded: boolean
    fetchUserConfig: () => Promise<void>
    setUserConfig: (config: Partial<UserConfigWithAppearance>) => void
    saveUserConfig: (config: Partial<UserConfigWithAppearance>) => Promise<boolean>
    clearUserConfig: () => void
}

function createDefaultUserConfig(): UserConfigWithAppearance {
    return {
        pageSize: DEFAULT_TABLE_PAGE_SIZE,
        spoolDefaultStatus: '1',
        spoolRecordDefaultStatus: 'all',
        orderDefaultStatus: '1',
        desktopTheme: getStoredDesktopTheme(),
        mobileTheme: getStoredMobileTheme(),
        desktopLayout: getStoredDesktopLayout(),
        cornerStyle: getStoredCornerStyle(),
        font: getStoredAppFontFamily(),
        webBackgroundUrl: isCustomBackgroundEnabled ? getStoredWebBackgroundUrl() : '',
        mobileBackgroundUrl: isCustomBackgroundEnabled ? getStoredMobileBackgroundUrl() : '',
    }
}

function normalizeUserConfig(data?: Partial<UserConfigWithAppearance>): UserConfigWithAppearance {
    const defaults = createDefaultUserConfig()
    const normalized = {
        ...defaults,
        ...data,
        pageSize: normalizeTablePageSize(data?.pageSize ?? defaults.pageSize),
        desktopTheme: normalizeThemeMode(data?.desktopTheme ?? defaults.desktopTheme ?? DEFAULT_DESKTOP_THEME),
        mobileTheme: normalizeThemeMode(data?.mobileTheme ?? defaults.mobileTheme ?? DEFAULT_MOBILE_THEME),
        desktopLayout: normalizeDesktopLayoutMode(
            data?.desktopLayout ?? defaults.desktopLayout ?? DEFAULT_DESKTOP_LAYOUT,
        ),
        cornerStyle: normalizeCornerStyle(data?.cornerStyle ?? defaults.cornerStyle),
        font: normalizeAppFontFamily(data?.font ?? defaults.font),
        webBackgroundUrl: isCustomBackgroundEnabled
            ? normalizeBackgroundUrl(data?.webBackgroundUrl ?? defaults.webBackgroundUrl)
            : '',
        mobileBackgroundUrl: isCustomBackgroundEnabled
            ? normalizeBackgroundUrl(data?.mobileBackgroundUrl ?? defaults.mobileBackgroundUrl)
            : '',
    }

    persistAppearancePreferences(normalized)
    return normalized
}

let userConfigSaveQueue: Promise<void> = Promise.resolve()
let latestUserConfigSaveRevision = 0

async function enqueueUserConfigSave(
    nextConfig: UserConfigWithAppearance,
    previousConfig: UserConfigWithAppearance,
    setUserConfig: (config: UserConfigWithAppearance) => void,
): Promise<boolean> {
    const revision = ++latestUserConfigSaveRevision
    let saved = false

    const operation = userConfigSaveQueue.then(async () => {
        if (revision !== latestUserConfigSaveRevision) {
            return
        }
        try {
            await saveCurrentUserConfig(nextConfig)
            saved = true
        } catch (error) {
            if (revision === latestUserConfigSaveRevision) {
                setUserConfig(previousConfig)
                toast.error(error instanceof Error ? error.message : '保存偏好设置失败')
            }
        }
    })

    userConfigSaveQueue = operation
    await operation
    return saved
}

export const useUserConfigStore = create<UserConfigState>((set, get) => ({
    userConfig: createDefaultUserConfig(),
    loaded: false,

    fetchUserConfig: async () => {
        try {
            const res = await getCurrentUserConfig()
            const data = res.data?.data
            set({
                userConfig: normalizeUserConfig(data),
                loaded: true,
            })
        } catch (error) {
            console.error('获取用户配置失败:', error)
            set({ userConfig: createDefaultUserConfig(), loaded: true })
        }
    },

    setUserConfig: (config) => {
        set((state) => ({
            userConfig: normalizeUserConfig({
                ...state.userConfig,
                ...config,
            }),
        }))
    },

    saveUserConfig: async (config) => {
        const previousConfig = get().userConfig
        const nextConfig = normalizeUserConfig({
            ...previousConfig,
            ...config,
        })

        set({ userConfig: nextConfig })

        if (!useLoginUserStore.getState().isLoggedIn) {
            return true
        }

        return enqueueUserConfigSave(nextConfig, previousConfig, (userConfig) => {
            set({ userConfig: normalizeUserConfig(userConfig) })
        })
    },

    clearUserConfig: () => {
        latestUserConfigSaveRevision += 1
        set({ userConfig: createDefaultUserConfig(), loaded: false })
    },
}))
