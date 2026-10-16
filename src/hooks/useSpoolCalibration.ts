import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { calibrateSpool, getCalibrateWeight } from '@/api/spool'
import { getErrorMessage, showRequestError } from '@/request'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

export interface CalibrateFormData {
    spoolId: number
    usedWeight?: number
    totalWeightWithSpool?: number
}

const roundTo2 = (value: number) => Math.round(value * 100) / 100

interface UseSpoolCalibrationOptions {
    onSuccess?: () => void | Promise<void>
}

export function useSpoolCalibration({ onSuccess }: UseSpoolCalibrationOptions = {}) {
    const isIntranet = useLoginUserStore((s) => s.loginUser.isIntranet === true)
    const [calibrateOpen, setCalibrateOpen] = useState(false)
    const [calibrateLoading, setCalibrateLoading] = useState(false)
    const [calibrateReadingWeight, setCalibrateReadingWeight] = useState(false)
    const [calibrateScaleWeight, setCalibrateScaleWeight] = useState<number | null>(null)
    const [currentSpool, setCurrentSpool] = useState<API.SpoolVO | null>(null)
    const [calibrateForm, setCalibrateForm] = useState<CalibrateFormData>({
        spoolId: 0,
        usedWeight: undefined,
        totalWeightWithSpool: undefined,
    })

    const readCalibrateWeight = useCallback(async () => {
        if (!isIntranet) {
            setCalibrateReadingWeight(false)
            setCalibrateScaleWeight(null)
            return
        }
        setCalibrateReadingWeight(true)
        setCalibrateScaleWeight(null)
        try {
            const res = await getCalibrateWeight()
            const state = res.data?.data?.state
            if (!state) return

            const weight = Number(state)
            if (Number.isNaN(weight)) return

            setCalibrateScaleWeight(roundTo2(weight))
        } catch (error) {
            const message = getErrorMessage(error, '读取电子秤失败')
            if (message.includes('电子秤实体未配置')) {
                return
            }
            showRequestError(error, '读取电子秤失败')
        } finally {
            setCalibrateReadingWeight(false)
        }
    }, [isIntranet])

    const openCalibrateModal = useCallback((record: API.SpoolVO) => {
        setCurrentSpool(record)
        const netWeight = Number(record.netWeight ?? 0)
        const usedWeight = Number(record.usedWeight ?? 0)
        const spoolWeight = Number(record.spoolWeight ?? 0)
        setCalibrateForm({
            spoolId: record.id!,
            usedWeight: roundTo2(usedWeight),
            totalWeightWithSpool: roundTo2(netWeight - usedWeight + spoolWeight),
        })
        setCalibrateScaleWeight(null)
        setCalibrateOpen(true)
        void readCalibrateWeight()
    }, [readCalibrateWeight])

    const handleCalibrateTotalWeightChange = useCallback(
        (value: number | undefined) => {
            if (!currentSpool) return
            if (value == null) {
                setCalibrateForm((prev) => ({
                    ...prev,
                    totalWeightWithSpool: undefined,
                    usedWeight: undefined,
                }))
                return
            }
            const netWeight = Number(currentSpool.netWeight ?? 0)
            const spoolWeight = Number(currentSpool.spoolWeight ?? 0)
            const normalizedTotalWeight = roundTo2(value)
            const usedWeight = roundTo2(Math.max(0, Math.min(netWeight + spoolWeight - normalizedTotalWeight, netWeight)))
            setCalibrateForm((prev) => ({
                ...prev,
                totalWeightWithSpool: normalizedTotalWeight,
                usedWeight,
            }))
        },
        [currentSpool],
    )

    const runCalibrate = useCallback(async (spoolId: number, usedWeight: number) => {
        setCalibrateLoading(true)
        try {
            await calibrateSpool({ spoolId, usedWeight })
            toast.success('校准耗材成功')
            setCalibrateOpen(false)
            await onSuccess?.()
        } catch (error) {
            showRequestError(error, '校准耗材失败')
        } finally {
            setCalibrateLoading(false)
        }
    }, [onSuccess])

    const handleCalibrateSubmit = useCallback(async () => {
        if (calibrateForm.totalWeightWithSpool == null) {
            toast.warning('请输入含料盘重量')
            return
        }
        if (!currentSpool) return

        const netWeight = Number(currentSpool.netWeight ?? 0)
        const spoolWeight = Number(currentSpool.spoolWeight ?? 0)
        const minVal = spoolWeight
        const maxVal = netWeight + spoolWeight

        if (calibrateForm.totalWeightWithSpool < minVal || calibrateForm.totalWeightWithSpool > maxVal) {
            toast.warning(`含料盘重量范围为: ${minVal}g ~ ${maxVal}g`)
            return
        }

        await runCalibrate(calibrateForm.spoolId, calibrateForm.usedWeight!)
    }, [calibrateForm, currentSpool, runCalibrate])

    const handleUseScaleWeightSubmit = useCallback(async () => {
        if (calibrateScaleWeight == null || !currentSpool) {
            toast.warning('暂无可用的电子秤读数')
            return
        }
        const spoolWeight = Number(currentSpool.spoolWeight ?? 0)
        const netWeight = Number(currentSpool.netWeight ?? 0)
        const clampedWeight = roundTo2(Math.max(spoolWeight, Math.min(calibrateScaleWeight, netWeight + spoolWeight)))
        const usedWeight = roundTo2(Math.max(0, Math.min(netWeight + spoolWeight - clampedWeight, netWeight)))

        setCalibrateForm((prev) => ({
            ...prev,
            totalWeightWithSpool: clampedWeight,
            usedWeight,
        }))

        await runCalibrate(currentSpool.id!, usedWeight)
    }, [calibrateScaleWeight, currentSpool, runCalibrate])

    return {
        calibrateOpen,
        setCalibrateOpen,
        calibrateLoading,
        calibrateReadingWeight,
        calibrateScaleWeight,
        currentSpool,
        calibrateForm,
        openCalibrateModal,
        handleCalibrateTotalWeightChange,
        handleCalibrateSubmit,
        handleUseScaleWeightSubmit,
    }
}
