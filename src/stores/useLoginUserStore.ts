import { create } from 'zustand'
import { getCurrentUser } from '@/api/user'

const anonymousUser: API.UserVO = {
    username: '未登录',
}

interface LoginUserState {
    loginUser: API.UserVO
    isLoggedIn: boolean
    hasCheckedAuth: boolean
    fetchLoginUser: () => Promise<void>
    setLoginUser: (user: Partial<API.UserVO>) => void
    resetLoginUser: () => void
}

export const useLoginUserStore = create<LoginUserState>((set) => ({
    loginUser: anonymousUser,
    isLoggedIn: false,
    hasCheckedAuth: false,

    fetchLoginUser: async () => {
        try {
            const res = await getCurrentUser()
            if (res.data.data) {
                set({ loginUser: res.data.data, isLoggedIn: true, hasCheckedAuth: true })
                return
            }
        } catch (error) {
            console.error('获取用户信息失败:', error)
        }
        set({ loginUser: anonymousUser, isLoggedIn: false, hasCheckedAuth: true })
    },

    setLoginUser: (user) => {
        set({
            loginUser: user as API.UserVO,
            isLoggedIn: !!user.username && user.username !== anonymousUser.username,
            hasCheckedAuth: true,
        })
    },

    resetLoginUser: () => {
        set({ loginUser: anonymousUser, isLoggedIn: false, hasCheckedAuth: true })
    },
}))
