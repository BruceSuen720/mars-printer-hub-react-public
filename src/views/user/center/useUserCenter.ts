import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import {
    updateCurrentUserBambuRegion,
    updateUserInfo,
    changePassword,
    deletePasskey,
    finishPasskeyRegistration,
    listPasskeys,
    startPasskeyRegistration,
} from '@/api/user'
import {
    createCurrentUserApiKey,
    disableCurrentUserApiKey,
    enableCurrentUserApiKey,
    getCurrentUserApiKey,
    resetCurrentUserApiKey,
    updateCurrentUserApiKey,
} from '@/api/userApiKey'
import { loginWithCode, sendSmsCode, unbind } from '@/api/bambuCloud'
import { uploadFile } from '@/api/objectStorage'
import { syncPrinters } from '@/api/printer'
import { createPasskeyCredential, isPasskeySupported } from '@/utils/webauthn'
import { toast } from 'sonner'

type PasskeyCredentialItem = API.UserPasskeyCredentialVO
type UserApiKeyCreateResponse = API.UserApiKeyCreateVO
type UserApiKeyItem = API.UserApiKeyVO

const normalizeApiKeyForm = (item: UserApiKeyItem | null) => ({
    name: item?.name || '',
})

type SyncPrintersToast = {
    type: 'success' | 'error'
    title: string
    description?: string
}

const isValidPhoneNumber = (value: string) => /^1[3-9]\d{9}$/.test(value)

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const isValidBambuAccount = (value: string) => isValidPhoneNumber(value) || isValidEmail(value)

const formatSyncPrintersMessage = (message?: string): SyncPrintersToast => {
    const text = message?.trim()
    if (!text) {
        return { type: 'success', title: '同步成功' }
    }

    const [resultText, ...detailParts] = text.split('。').map(part => part.trim()).filter(Boolean)
    const detailText = detailParts.join('。')

    if (resultText === '同步成功') {
        return {
            type: 'success',
            title: '同步成功',
            description: detailText || undefined,
        }
    }

    if (resultText.startsWith('同步成功：')) {
        const printerNames = resultText.replace('同步成功：', '').trim()
        return {
            type: 'success',
            title: '同步成功',
            description: [`已同步：${printerNames}`, detailText].filter(Boolean).join('\n'),
        }
    }

    if (resultText === '未同步成功') {
        return {
            type: 'error',
            title: '未同步成功',
            description: detailText || undefined,
        }
    }

    return {
        type: text.startsWith('未同步成功') ? 'error' : 'success',
        title: resultText || text,
        description: detailText || undefined,
    }
}

export function useUserCenter() {
    const { loginUser, fetchLoginUser } = useLoginUserStore()

    // ── Profile form ──
    const [userForm, setUserForm] = useState({
        username: '',
        nickname: '',
        email: '',
        phone: '',
        avatar: '',
    })
    const [loading, setLoading] = useState(false)
    const [avatarLoading, setAvatarLoading] = useState(false)

    useEffect(() => {
        setUserForm({
            username: loginUser.username || '',
            nickname: loginUser.nickname || '',
            email: loginUser.email || '',
            phone: loginUser.phone || '',
            avatar: loginUser.avatar || '',
        })
    }, [loginUser])

    const getInitials = useCallback((name?: string) => {
        if (!name) return ''
        return name.charAt(0).toUpperCase()
    }, [])

    const handleAvatarUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
            if (!isJpgOrPng) {
                toast.error('只能上传 JPG/PNG 格式的图片！')
                return
            }
            if (file.size / 1024 / 1024 > 2) {
                toast.error('图片大小不能超过 2MB！')
                return
            }

            const formData = new FormData()
            formData.append('file', file)
            setAvatarLoading(true)
            try {
                const res = await uploadFile(formData)
                if (!res.data.data) {
                    toast.error('上传失败')
                    return
                }
                setUserForm((prev) => ({ ...prev, avatar: res.data.data! }))
                toast.success('头像上传成功')
            } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : '头像上传失败')
            } finally {
                setAvatarLoading(false)
            }
        },
        [],
    )

    const handleSubmit = useCallback(async () => {
        if (!userForm.nickname || userForm.nickname.length < 2 || userForm.nickname.length > 12) {
            toast.error('昵称长度必须在 2-12 个字符之间')
            return
        }
        if (userForm.email && !isValidEmail(userForm.email)) {
            toast.error('请输入正确的邮箱地址')
            return
        }
        if (userForm.phone && !isValidPhoneNumber(userForm.phone)) {
            toast.error('请输入正确的手机号')
            return
        }

        setLoading(true)
        try {
            await updateUserInfo({
                nickname: userForm.nickname,
                email: userForm.email,
                phone: userForm.phone,
                avatar: userForm.avatar,
            })
            toast.success('保存成功')
            await fetchLoginUser()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '保存失败')
        } finally {
            setLoading(false)
        }
    }, [userForm, fetchLoginUser])

    // ── Bambu account binding ──
    const [bindModalOpen, setBindModalOpen] = useState(false)
    const [bindForm, setBindForm] = useState({ account: '', code: '' })
    const [sendingCode, setSendingCode] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [syncAllLoading, setSyncAllLoading] = useState(false)
    const [bambuRegion, setBambuRegion] = useState<'CHINA' | 'OTHER'>('CHINA')
    const [bambuRegionSaving, setBambuRegionSaving] = useState(false)

    useEffect(() => {
        setBambuRegion(loginUser.bambuRegion || 'CHINA')
    }, [loginUser.bambuRegion])

    useEffect(() => {
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current)
        }
    }, [])

    const sendVerificationCode = useCallback(async () => {
        if (!bindForm.account) {
            toast.error('请输入拓竹账号')
            return
        }
        if (!isValidBambuAccount(bindForm.account)) {
            toast.error('请输入正确的手机号或邮箱')
            return
        }

        setSendingCode(true)
        try {
            await sendSmsCode({ account: bindForm.account })
            toast.success('验证码已发送')
            setCountdown(60)
            if (countdownRef.current) clearInterval(countdownRef.current)
            countdownRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current)
                        countdownRef.current = null
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '发送验证码失败')
        } finally {
            setSendingCode(false)
        }
    }, [bindForm.account])

    const handleBindBambu = useCallback(async () => {
        if (!bindForm.account || !bindForm.code) {
            toast.error('请输入拓竹账号和验证码')
            return
        }
        if (!isValidBambuAccount(bindForm.account)) {
            toast.error('请输入正确的手机号或邮箱')
            return
        }
        if (bindForm.code.length !== 6) {
            toast.error('请输入6位验证码')
            return
        }

        try {
            await loginWithCode({ account: bindForm.account, code: bindForm.code })
            toast.success('绑定拓竹账号成功')
            setBindModalOpen(false)
            setBindForm({ account: '', code: '' })
            if (countdownRef.current) {
                clearInterval(countdownRef.current)
                countdownRef.current = null
            }
            setCountdown(0)
            await fetchLoginUser()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '绑定拓竹账号失败')
        }
    }, [bindForm, fetchLoginUser])

    const handleUnbind = useCallback(async () => {
        try {
            await unbind()
            await fetchLoginUser()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '解绑失败')
        }
    }, [fetchLoginUser])

    const handleBambuRegionSubmit = useCallback(async () => {
        setBambuRegionSaving(true)
        try {
            await updateCurrentUserBambuRegion({ bambuRegion })
            toast.success('拓竹区域已更新')
            await fetchLoginUser()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '拓竹区域更新失败')
        } finally {
            setBambuRegionSaving(false)
        }
    }, [bambuRegion, fetchLoginUser])

    const handleSyncAll = useCallback(async () => {
        setSyncAllLoading(true)
        try {
            const res = await syncPrinters()
            const toastMessage = formatSyncPrintersMessage(res.data.message)
            toast[toastMessage.type](toastMessage.title, {
                description: toastMessage.description,
                duration: toastMessage.description ? 6000 : 4000,
            })
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '同步失败')
        } finally {
            setSyncAllLoading(false)
        }
    }, [])

    // ── Change Password ──
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [passwordLoading, setPasswordLoading] = useState(false)

    const handlePasswordSubmit = useCallback(async () => {
        if (!passwordForm.oldPassword) {
            toast.error('请输入旧密码')
            return
        }
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
            toast.error('新密码不能少于 8 位')
            return
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('两次输入的新密码不一致')
            return
        }

        setPasswordLoading(true)
        try {
            await changePassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword,
            })
            toast.success('密码修改成功')
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '密码修改失败')
        } finally {
            setPasswordLoading(false)
        }
    }, [passwordForm])

    // ── Passkey ──
    const passkeySupported = useMemo(() => isPasskeySupported(), [])
    const [passkeyList, setPasskeyList] = useState<PasskeyCredentialItem[]>([])
    const [passkeyLoading, setPasskeyLoading] = useState(false)
    const [passkeyCreating, setPasskeyCreating] = useState(false)
    const [passkeyDeletingId, setPasskeyDeletingId] = useState<number | null>(null)
    const [passkeyNickname, setPasskeyNickname] = useState('')

    const fetchPasskeys = useCallback(async () => {
        if (!loginUser.username || loginUser.username === '未登录') {
            setPasskeyList([])
            return
        }

        setPasskeyLoading(true)
        try {
            const res = await listPasskeys()
            setPasskeyList(res.data.data || [])
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '获取 Passkey 列表失败')
        } finally {
            setPasskeyLoading(false)
        }
    }, [loginUser.username])

    useEffect(() => {
        void fetchPasskeys()
    }, [fetchPasskeys])

    const handleCreatePasskey = useCallback(async () => {
        if (!passkeySupported) {
            toast.error('当前浏览器或设备不支持 Passkey')
            return
        }

        setPasskeyCreating(true)
        try {
            const startRes = await startPasskeyRegistration({
                nickname: passkeyNickname.trim() || undefined,
            })
            const payload = startRes.data.data
            if (!payload?.requestId || !payload.options) {
                toast.error('Passkey 注册参数无效')
                return
            }

            const credential = await createPasskeyCredential(payload.options as never)
            await finishPasskeyRegistration(
                { requestId: payload.requestId },
                {
                    credential,
                    nickname: passkeyNickname.trim() || undefined,
                },
            )

            toast.success('Passkey 添加成功')
            setPasskeyNickname('')
            await fetchPasskeys()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '添加 Passkey 失败'
            if (message.includes('The operation either timed out') || message.includes('cancel')) {
                toast.warning('Passkey 注册已取消')
                return
            }
            toast.error(message)
        } finally {
            setPasskeyCreating(false)
        }
    }, [fetchPasskeys, passkeyNickname, passkeySupported])

    const handleDeletePasskey = useCallback(async (credentialId: number) => {
        if (!credentialId) {
            toast.error('Passkey ID 无效')
            return
        }

        setPasskeyDeletingId(credentialId)
        try {
            await deletePasskey({ credentialId })
            toast.success('Passkey 已删除')
            await fetchPasskeys()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '删除 Passkey 失败')
        } finally {
            setPasskeyDeletingId(null)
        }
    }, [fetchPasskeys])

    // ── API Key ──
    const [apiKeyItem, setApiKeyItem] = useState<UserApiKeyItem | null>(null)
    const [apiKeyLoading, setApiKeyLoading] = useState(false)
    const [apiKeySaving, setApiKeySaving] = useState(false)
    const [apiKeyActionLoading, setApiKeyActionLoading] = useState(false)
    const [latestCreatedApiKey, setLatestCreatedApiKey] = useState<UserApiKeyCreateResponse | null>(null)
    const [apiKeyForm, setApiKeyForm] = useState({
        name: '',
    })

    const fetchCurrentApiKey = useCallback(async () => {
        if (!loginUser.username || loginUser.username === '未登录') {
            setApiKeyItem(null)
            setLatestCreatedApiKey(null)
            setApiKeyForm({ name: '' })
            return
        }

        setApiKeyLoading(true)
        try {
            const res = await getCurrentUserApiKey()
            const item = res.data.data || null
            setApiKeyItem(item)
            setApiKeyForm(normalizeApiKeyForm(item))
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '获取 API Key 失败')
        } finally {
            setApiKeyLoading(false)
        }
    }, [loginUser.username])

    useEffect(() => {
        void fetchCurrentApiKey()
    }, [fetchCurrentApiKey])

    const validateApiKeyName = useCallback(() => {
        const name = apiKeyForm.name.trim()
        if (!name) {
            toast.error('请输入 API Key 名称')
            return null
        }
        if (name.length > 100) {
            toast.error('API Key 名称不能超过 100 个字符')
            return null
        }
        return name
    }, [apiKeyForm.name])

    const handleCreateApiKey = useCallback(async () => {
        const name = validateApiKeyName()
        if (!name) return

        setApiKeySaving(true)
        try {
            const res = await createCurrentUserApiKey({ name })
            const item = res.data.data
            setLatestCreatedApiKey(item || null)
            toast.success('API Key 创建成功')
            await fetchCurrentApiKey()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '创建 API Key 失败')
        } finally {
            setApiKeySaving(false)
        }
    }, [fetchCurrentApiKey, validateApiKeyName])

    const handleUpdateApiKey = useCallback(async () => {
        if (!apiKeyItem) {
            toast.error('当前没有可更新的 API Key')
            return
        }
        const name = validateApiKeyName()
        if (!name) return

        setApiKeySaving(true)
        try {
            await updateCurrentUserApiKey({ name })
            toast.success('API Key 已更新')
            await fetchCurrentApiKey()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '更新 API Key 失败')
        } finally {
            setApiKeySaving(false)
        }
    }, [apiKeyItem, fetchCurrentApiKey, validateApiKeyName])

    const handleEnableApiKey = useCallback(async () => {
        setApiKeyActionLoading(true)
        try {
            await enableCurrentUserApiKey()
            toast.success('API Key 已启用')
            await fetchCurrentApiKey()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '启用 API Key 失败')
        } finally {
            setApiKeyActionLoading(false)
        }
    }, [fetchCurrentApiKey])

    const handleDisableApiKey = useCallback(async () => {
        setApiKeyActionLoading(true)
        try {
            await disableCurrentUserApiKey()
            toast.success('API Key 已禁用')
            await fetchCurrentApiKey()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '禁用 API Key 失败')
        } finally {
            setApiKeyActionLoading(false)
        }
    }, [fetchCurrentApiKey])

    const handleResetApiKey = useCallback(async () => {
        setApiKeyActionLoading(true)
        try {
            const res = await resetCurrentUserApiKey()
            setLatestCreatedApiKey(res.data.data || null)
            toast.success('API Key 已重置')
            await fetchCurrentApiKey()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '重置 API Key 失败')
        } finally {
            setApiKeyActionLoading(false)
        }
    }, [fetchCurrentApiKey])

    // ── VIP ──
    const [vipModalOpen, setVipModalOpen] = useState(false)
    const isVip = useMemo(() => {
        if (!loginUser.vipExpireTime) return false
        return new Date(loginUser.vipExpireTime) > new Date()
    }, [loginUser.vipExpireTime])

    // ── Sponsor ──
    const [payModalOpen, setPayModalOpen] = useState(false)

    const copyEmail = useCallback(() => {
        navigator.clipboard.writeText('marsss816@gmail.com').then(() => {
            toast.success('邮箱已复制到剪贴板')
        })
    }, [])

    const showPayModal = useCallback(() => {
        setPayModalOpen(true)
    }, [])

    return {
        // user store
        loginUser,
        // profile
        userForm,
        setUserForm,
        loading,
        avatarLoading,
        getInitials,
        handleAvatarUpload,
        handleSubmit,
        // bambu
        bindModalOpen,
        setBindModalOpen,
        bindForm,
        setBindForm,
        bambuRegion,
        setBambuRegion,
        bambuRegionSaving,
        sendingCode,
        countdown,
        sendVerificationCode,
        handleBindBambu,
        handleBambuRegionSubmit,
        handleUnbind,
        handleSyncAll,
        syncAllLoading,
        // vip
        isVip,
        vipModalOpen,
        setVipModalOpen,
        // password
        passwordForm,
        setPasswordForm,
        passwordLoading,
        handlePasswordSubmit,
        // passkey
        passkeySupported,
        passkeyList,
        passkeyLoading,
        passkeyCreating,
        passkeyDeletingId,
        passkeyNickname,
        setPasskeyNickname,
        handleCreatePasskey,
        handleDeletePasskey,
        // api key
        apiKeyItem,
        apiKeyLoading,
        apiKeySaving,
        apiKeyActionLoading,
        apiKeyForm,
        setApiKeyForm,
        latestCreatedApiKey,
        fetchCurrentApiKey,
        handleCreateApiKey,
        handleUpdateApiKey,
        handleEnableApiKey,
        handleDisableApiKey,
        handleResetApiKey,
        // sponsor
        payModalOpen,
        setPayModalOpen,
        copyEmail,
        showPayModal,
    }
}
