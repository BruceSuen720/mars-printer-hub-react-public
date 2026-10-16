import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getCurrentUserConfig } from '@/api/userConfig'
import { isCustomBackgroundEnabled } from '@/config/featureFlags'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { type UserConfigWithAppearance, useUserConfigStore } from '@/stores/useUserConfigStore'
import {
    DEFAULT_CORNER_STYLE,
    DEFAULT_APP_FONT_FAMILY,
    DEFAULT_DESKTOP_LAYOUT,
    DEFAULT_DESKTOP_THEME,
    DEFAULT_MOBILE_THEME,
    normalizeAppFontFamily,
    normalizeBackgroundUrl,
    normalizeCornerStyle,
    normalizeDesktopLayoutMode,
    normalizeThemeMode,
} from '@/utils/appearancePreferences'
import { DEFAULT_TABLE_PAGE_SIZE, normalizeTablePageSize } from '@/utils/tablePageSize'
import {
    DEFAULT_ORDER_STATUS,
    DEFAULT_SPOOL_RECORD_STATUS,
    DEFAULT_SPOOL_STATUS,
    normalizeOrderStatus,
    normalizeSpoolRecordStatus,
    normalizeSpoolStatus,
} from '@/utils/userPreferences'

const DEFAULT_USER_CONFIG: UserConfigWithAppearance = {
    powerWatt: 300,
    electricityPricePerKwh: 0.5,
    depreciationPerHour: 0,
    laborCostPerHour: 0,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    spoolDefaultStatus: DEFAULT_SPOOL_STATUS,
    spoolRecordDefaultStatus: DEFAULT_SPOOL_RECORD_STATUS,
    orderDefaultStatus: DEFAULT_ORDER_STATUS,
    desktopTheme: DEFAULT_DESKTOP_THEME,
    mobileTheme: DEFAULT_MOBILE_THEME,
    desktopLayout: DEFAULT_DESKTOP_LAYOUT,
    cornerStyle: DEFAULT_CORNER_STYLE,
    font: DEFAULT_APP_FONT_FAMILY,
    webBackgroundUrl: '',
    mobileBackgroundUrl: '',
}

type NumericFieldKey =
    | 'powerWatt'
    | 'electricityPricePerKwh'
    | 'depreciationPerHour'
    | 'laborCostPerHour'

type TextFieldKey = 'webBackgroundUrl' | 'mobileBackgroundUrl'

function normalizeFormConfig(data?: Partial<UserConfigWithAppearance>): UserConfigWithAppearance {
    return {
        powerWatt: data?.powerWatt ?? DEFAULT_USER_CONFIG.powerWatt,
        electricityPricePerKwh: data?.electricityPricePerKwh ?? DEFAULT_USER_CONFIG.electricityPricePerKwh,
        depreciationPerHour: data?.depreciationPerHour ?? DEFAULT_USER_CONFIG.depreciationPerHour,
        laborCostPerHour: data?.laborCostPerHour ?? DEFAULT_USER_CONFIG.laborCostPerHour,
        pageSize: normalizeTablePageSize(data?.pageSize),
        spoolDefaultStatus: normalizeSpoolStatus(data?.spoolDefaultStatus),
        spoolRecordDefaultStatus: normalizeSpoolRecordStatus(data?.spoolRecordDefaultStatus),
        orderDefaultStatus: normalizeOrderStatus(data?.orderDefaultStatus),
        desktopTheme: normalizeThemeMode(data?.desktopTheme),
        mobileTheme: normalizeThemeMode(data?.mobileTheme),
        desktopLayout: normalizeDesktopLayoutMode(data?.desktopLayout),
        cornerStyle: normalizeCornerStyle(data?.cornerStyle),
        font: normalizeAppFontFamily(data?.font),
        webBackgroundUrl: isCustomBackgroundEnabled ? normalizeBackgroundUrl(data?.webBackgroundUrl) : '',
        mobileBackgroundUrl: isCustomBackgroundEnabled ? normalizeBackgroundUrl(data?.mobileBackgroundUrl) : '',
    }
}

export function useUserPreferences() {
    const { loginUser } = useLoginUserStore()
    const storedUserConfig = useUserConfigStore((s) => s.userConfig)
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const setUserConfig = useUserConfigStore((s) => s.setUserConfig)
    const saveUserConfig = useUserConfigStore((s) => s.saveUserConfig)

    const [userConfigForm, setUserConfigForm] = useState<UserConfigWithAppearance>(normalizeFormConfig(storedUserConfig))
    const [userConfigLoading, setUserConfigLoading] = useState(false)
    const [userConfigSaving, setUserConfigSaving] = useState(false)

    const syncFormFromStore = useCallback(() => {
        setUserConfigForm(normalizeFormConfig(useUserConfigStore.getState().userConfig))
    }, [])

    const fetchUserConfig = useCallback(async () => {
        if (!loginUser.username || loginUser.username === '未登录') return
        if (userConfigLoaded) {
            setUserConfigForm(normalizeFormConfig(storedUserConfig))
            return
        }
        setUserConfigLoading(true)
        try {
            const res = await getCurrentUserConfig()
            const normalized = normalizeFormConfig(res.data?.data)
            setUserConfigForm(normalized)
            setUserConfig(normalized)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '获取偏好设置失败')
        } finally {
            setUserConfigLoading(false)
        }
    }, [loginUser.username, setUserConfig, storedUserConfig, userConfigLoaded])

    useEffect(() => {
        fetchUserConfig()
    }, [fetchUserConfig])

    const persistForm = useCallback(
        async (nextForm: UserConfigWithAppearance) => {
            setUserConfigSaving(true)
            try {
                const ok = await saveUserConfig(normalizeFormConfig(nextForm))
                if (!ok) {
                    syncFormFromStore()
                }
                return ok
            } finally {
                setUserConfigSaving(false)
            }
        },
        [saveUserConfig, syncFormFromStore],
    )

    const updateAndSave = useCallback(
        async (patch: Partial<UserConfigWithAppearance>) => {
            const nextForm = normalizeFormConfig({ ...userConfigForm, ...patch })
            setUserConfigForm(nextForm)
            await persistForm(nextForm)
        },
        [persistForm, userConfigForm],
    )

    const updateNumericField = useCallback((field: NumericFieldKey, value: number | undefined) => {
        setUserConfigForm((prev) => ({ ...prev, [field]: value }))
    }, [])

    const updateTextField = useCallback((field: TextFieldKey, value: string) => {
        setUserConfigForm((prev) => ({ ...prev, [field]: value }))
    }, [])

    const commitNumericField = useCallback(
        async (field: NumericFieldKey) => {
            const currentValue = userConfigForm[field]
            if (currentValue === undefined || Number.isNaN(currentValue) || currentValue < 0) {
                toast.error('报价参数必须是大于等于 0 的数字')
                syncFormFromStore()
                return false
            }

            const nextForm = normalizeFormConfig(userConfigForm)
            setUserConfigForm(nextForm)
            return await persistForm(nextForm)
        },
        [persistForm, syncFormFromStore, userConfigForm],
    )

    const updatePageSize = useCallback(
        async (pageSize: number) => {
            if (!Number.isInteger(pageSize) || pageSize <= 0) {
                toast.error('每页条数必须是大于 0 的整数')
                syncFormFromStore()
                return false
            }
            return await updateAndSave({ pageSize })
        },
        [syncFormFromStore, updateAndSave],
    )

    const commitTextField = useCallback(
        async (field: TextFieldKey) => {
            const nextForm = normalizeFormConfig({
                ...userConfigForm,
                [field]: normalizeBackgroundUrl(userConfigForm[field]),
            })
            setUserConfigForm(nextForm)
            return await persistForm(nextForm)
        },
        [persistForm, userConfigForm],
    )

    return {
        userConfigForm,
        userConfigLoading,
        userConfigSaving,
        updateAndSave,
        updateNumericField,
        updateTextField,
        commitNumericField,
        commitTextField,
        updatePageSize,
    }
}
