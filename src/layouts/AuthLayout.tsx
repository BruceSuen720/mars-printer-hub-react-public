import type { ReactNode } from 'react'
import logoImg from '@/assets/images/logo-2.webp'
import ThemeToggle from '@/components/ThemeToggle'

interface AuthLayoutProps {
    children: ReactNode
}

/**
 * Shared layout for auth pages (Login, Register, Setup)
 * Clean minimalist design that respects light/dark theme
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="layout-desktop relative flex min-h-screen items-center justify-center p-4">
            {/* Theme toggle - top right */}
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>

            {/* Content */}
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                        <img src={logoImg} alt="Mars Printer Hub" className="h-10" />
                        <span className="text-lg font-semibold tracking-tight text-foreground">
                            Mars Printer Hub
                        </span>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-xl border border-border bg-card px-8 py-8 shadow-sm">
                    {children}
                </div>

                {/* Footer */}
                <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
                    <div>© 2026 Mars Printer Hub</div>
                </div>
            </div>
        </div>
    )
}
