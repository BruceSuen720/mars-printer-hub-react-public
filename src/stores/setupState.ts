/**
 * System initialization state management
 * Replaces Vue's stores/setupState.ts
 */

let systemInitialized: boolean | null = null

export function getSystemInitialized(): boolean | null {
    return systemInitialized
}

export function setSystemInitialized(value: boolean): void {
    systemInitialized = value
}
