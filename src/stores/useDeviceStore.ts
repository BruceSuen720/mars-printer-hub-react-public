import { create } from 'zustand'

interface DeviceState {
    screenWidth: number
    isMobile: boolean
    init: () => void
    cleanup: () => void
}

const MOBILE_BREAKPOINT = 768

export const useDeviceStore = create<DeviceState>((set) => {
    const handleResize = () => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth
            set({ screenWidth: width, isMobile: width < MOBILE_BREAKPOINT })
        }
    }

    return {
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,

        init: () => {
            if (typeof window !== 'undefined') {
                handleResize()
                window.addEventListener('resize', handleResize)
            }
        },

        cleanup: () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize)
            }
        },
    }
})
