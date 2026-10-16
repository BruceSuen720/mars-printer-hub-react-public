import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export interface ComboboxOption {
    label: string
    value: string
    renderOption?: React.ReactNode
    renderValue?: React.ReactNode
}

interface ComboboxProps {
    options: ComboboxOption[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    /** If true, allows typing a custom value not in options */
    allowCustom?: boolean
    className?: string
    disabled?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** On mobile, scroll the trigger upward before opening so the list can expand below it. */
    preferBottomOnMobile?: boolean
}

export function Combobox({
    options,
    value = '',
    onChange,
    placeholder = '请选择...',
    searchPlaceholder = '搜索...',
    emptyText = '未找到匹配项',
    allowCustom = false,
    className,
    disabled = false,
    open: openProp,
    onOpenChange,
    preferBottomOnMobile = false,
}: ComboboxProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const open = openProp ?? internalOpen

    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            if (nextOpen && preferBottomOnMobile && window.matchMedia('(max-width: 767px)').matches) {
                triggerRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
            }
            if (openProp == null) {
                setInternalOpen(nextOpen)
            }
            onOpenChange?.(nextOpen)
        },
        [onOpenChange, openProp, preferBottomOnMobile],
    )

    const selectedLabel = React.useMemo(() => {
        const found = options.find((o) => o.value === value)
        return found?.label ?? (value || '')
    }, [options, value])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    ref={triggerRef}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'h-10 w-full min-w-0 justify-between overflow-hidden font-normal',
                        !value && 'text-muted-foreground',
                        className,
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {value ? (options.find((o) => o.value === value)?.renderValue ?? selectedLabel) : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="max-w-[calc(100vw-2rem)] overflow-hidden p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                align="start"
                side="bottom"
                avoidCollisions
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={true} className="min-w-0">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList className="hide-scrollbar">
                        <CommandEmpty>
                            {allowCustom && search ? (
                                <button
                                    type="button"
                                    className="w-full cursor-pointer px-2 py-1 text-sm hover:bg-accent"
                                    onClick={() => {
                                        onChange(search)
                                        setSearch('')
                                        setOpen(false)
                                    }}
                                >
                                    使用 "{search}"
                                </button>
                            ) : (
                                emptyText
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {allowCustom && search && !options.some((o) => o.value === search) && (
                                <CommandItem
                                    value={`__custom__${search}`}
                                    onSelect={() => {
                                        onChange(search)
                                        setSearch('')
                                        setOpen(false)
                                    }}
                                >
                                    <Check className="mr-2 h-4 w-4 opacity-0" />
                                    使用 "{search}"
                                </CommandItem>
                            )}
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    className="min-w-0 overflow-hidden"
                                    onSelect={() => {
                                        onChange(option.value === value ? '' : option.value)
                                        setSearch('')
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === option.value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    {option.renderOption ?? option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
