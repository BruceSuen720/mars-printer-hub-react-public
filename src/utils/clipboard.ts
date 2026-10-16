import { toast } from 'sonner'

/**
 * Copy text to clipboard with fallback for non-secure contexts (HTTP)
 * @param text The text to copy
 * @param successMsg Message to show on success (default: "复制成功")
 * @param errorMsg Message to show on error (default: "复制失败，请重试")
 * @returns Promise<boolean> true if successful, false otherwise
 */
export const copyToClipboard = async (
    text: string,
    successMsg: string = '复制成功',
    errorMsg: string = '复制失败，请重试',
): Promise<boolean> => {
    const fallbackCopy = (): boolean => {
        const textArea = document.createElement('textarea')
        textArea.value = text

        const container = (document.activeElement?.parentNode as HTMLElement) || document.body

        // Ensure it's not visible but part of DOM
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '0'
        textArea.setAttribute('readonly', '')

        container.appendChild(textArea)
        textArea.focus()
        textArea.select()

        let success = false
        try {
            success = document.execCommand('copy')
        } catch (err) {
            console.error('Fallback copy error:', err)
            success = false
        }

        container.removeChild(textArea)
        return success
    }

    let success = false
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            success = true
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback:', err)
            success = fallbackCopy()
        }
    } else {
        success = fallbackCopy()
    }

    if (success) {
        toast.success(successMsg)
    } else {
        toast.error(errorMsg)
    }

    return success
}
