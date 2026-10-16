import { beforeEach, describe, expect, it, vi } from 'vitest'

const userConfigApi = vi.hoisted(() => ({
    getCurrentUserConfig: vi.fn(),
    saveCurrentUserConfig: vi.fn(),
}))

vi.mock('@/api/userConfig', () => userConfigApi)

import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useUserConfigStore } from '@/stores/useUserConfigStore'

describe('useUserConfigStore', () => {
    beforeEach(() => {
        userConfigApi.getCurrentUserConfig.mockReset()
        userConfigApi.saveCurrentUserConfig.mockReset()
        useUserConfigStore.getState().clearUserConfig()
        useLoginUserStore.setState({
            loginUser: { username: 'tester' },
            isLoggedIn: true,
            hasCheckedAuth: true,
        })
    })

    it('coalesces rapid updates and persists the latest complete config', async () => {
        userConfigApi.saveCurrentUserConfig.mockResolvedValue({ data: { code: 0 } })

        const firstSave = useUserConfigStore.getState().saveUserConfig({ desktopTheme: 'dark' })
        const secondSave = useUserConfigStore.getState().saveUserConfig({ desktopLayout: 'fullwidth' })

        await expect(firstSave).resolves.toBe(false)
        await expect(secondSave).resolves.toBe(true)
        expect(userConfigApi.saveCurrentUserConfig).toHaveBeenCalledTimes(1)
        expect(userConfigApi.saveCurrentUserConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                desktopTheme: 'dark',
                desktopLayout: 'fullwidth',
            }),
        )
    })

    it('persists font preference with backend-supported config', async () => {
        userConfigApi.saveCurrentUserConfig.mockResolvedValue({ data: { code: 0 } })

        await expect(useUserConfigStore.getState().saveUserConfig({ font: 'jetbrains-mono' })).resolves.toBe(true)

        expect(useUserConfigStore.getState().userConfig.font).toBe('jetbrains-mono')
        expect(userConfigApi.saveCurrentUserConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                font: 'jetbrains-mono',
            }),
        )
    })
})
