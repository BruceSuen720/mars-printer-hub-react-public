import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { Bell, Cloud, FileText, Settings, KeyRound } from 'lucide-react'
import NotificationConfigPanel from './notify/NotificationConfigPanel'
import DeviceConfigPanel from './device/DeviceConfigPanel'
import LogViewerPanel from '@/views/system/log/LogViewerPanel'
import RemoteConfigPanel from './remote/RemoteConfigPanel'
import SystemGeneralConfigPanel from './config/SystemGeneralConfigPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type TabKey = 'notification' | 'device' | 'sysconfig' | 'logs' | 'remote'

const menus: Array<{
    key: TabKey
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}> = [
    { key: 'notification', label: '通知配置', icon: Bell },
    { key: 'device', label: '设备配置', icon: Settings },
    { key: 'sysconfig', label: '系统配置', icon: KeyRound },
    { key: 'logs', label: '系统日志', icon: FileText },
    { key: 'remote', label: '远程配置', icon: Cloud },
]

export default function SystemConfigView() {
    const [active, setActive] = useState<TabKey>('notification')
    const isMobile = useDeviceStore((s) => s.isMobile)
    const isIntranet = useLoginUserStore((s) => s.loginUser.isIntranet === true)

    if (!isIntranet) {
        return <Navigate to="/" replace />
    }

    return (
        <div className={isMobile ? 'space-y-6 p-4 pb-10' : 'space-y-6 p-6 pb-12'}>
            {/* ── Page Header ── */}
            <div className="border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">系统设置</h1>
            </div>

            <Tabs
                value={active}
                onValueChange={(value) => setActive(value as TabKey)}
                orientation="vertical"
                className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"
            >
                <aside className="rounded-xl border bg-card text-card-foreground shadow-xs h-fit p-2">
                    <TabsList className="h-auto w-full flex-col items-stretch gap-0.5 bg-transparent p-0">
                        {menus.map((menu) => {
                            const Icon = menu.icon
                            const isActive = active === menu.key
                            return (
                                <TabsTrigger
                                    key={menu.key}
                                    value={menu.key}
                                    className={cn(
                                        'group relative w-full cursor-pointer justify-start rounded-lg px-3 py-2 text-sm font-normal transition-colors after:hidden',
                                        'hover:bg-muted/60',
                                        'data-[state=active]:bg-muted data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none',
                                    )}
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                                            isActive ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="flex items-center gap-2.5">
                                        <Icon
                                            size={14}
                                            className={cn(
                                                'shrink-0 transition-colors',
                                                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                                            )}
                                        />
                                        {menu.label}
                                    </span>
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>
                </aside>

                <section className="rounded-xl border bg-card text-card-foreground shadow-xs min-h-[640px]">
                    <TabsContent value="notification" className="m-0">
                        <NotificationConfigPanel />
                    </TabsContent>
                    <TabsContent value="device" className="m-0">
                        <DeviceConfigPanel />
                    </TabsContent>
                    <TabsContent value="logs" className="m-0">
                        <LogViewerPanel />
                    </TabsContent>
                    <TabsContent value="sysconfig" className="m-0">
                        <SystemGeneralConfigPanel />
                    </TabsContent>
                    <TabsContent value="remote" className="m-0">
                        <RemoteConfigPanel />
                    </TabsContent>
                </section>
            </Tabs>
        </div>
    )
}
