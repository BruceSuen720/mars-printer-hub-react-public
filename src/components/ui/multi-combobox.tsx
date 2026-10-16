import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDeviceStore } from '@/stores/useDeviceStore'
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
import type { ComboboxOption } from '@/components/ui/combobox'

interface MultiComboboxProps {
    options: ComboboxOption[]
    values: string[]
    onChange: (values: string[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    allowCustom?: boolean
    className?: string
    disabled?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function MultiCombobox({
    options,
    values,
    onChange,
    placeholder = '请选择...',
    searchPlaceholder = '搜索...',
    emptyText = '未找到匹配项',
    allowCustom = false,
    className,
    disabled = false,
    open: openProp,
    onOpenChange,
}: MultiComboboxProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const isMobile = useDeviceStore((state) => state.isMobile)
    const open = openProp ?? internalOpen

    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            if (openProp == null) {
                setInternalOpen(nextOpen)
            }
            onOpenChange?.(nextOpen)
        },
        [onOpenChange, openProp],
    )

    const selectedOptions = React.useMemo(
        () => values.map((value) => options.find((option) => option.value === value) ?? { label: value, value }),
        [options, values],
    )

    const toggleValue = React.useCallback(
        (value: string) => {
            onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
        },
        [onChange, values],
    )

    const addCustomValue = React.useCallback(() => {
        const nextValue = search.trim()
        if (!nextValue) return
        if (!values.includes(nextValue)) {
            onChange([...values, nextValue])
        }
        setSearch('')
    }, [onChange, search, values])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'h-10 w-full min-w-0 justify-between gap-2 px-3 py-2 font-normal',
                        values.length === 0 && 'text-muted-foreground',
                        className,
                    )}
                    disabled={disabled}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="max-w-[140px] shrink-0 gap-1 pr-1"
                                >
                                    <span className="truncate">{option.renderValue ?? option.label}</span>
                                    <span
                                        role="button"
                                        tabIndex={-1}
                                        className="inline-flex cursor-pointer rounded-sm p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            toggleValue(option.value)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="truncate">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="max-w-[calc(100vw-2rem)] overflow-hidden p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                align="start"
                side="bottom"
                avoidCollisions={!isMobile}
                onWheel={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                <Command shouldFilter={true} className="min-w-0">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList className="hide-scrollbar">
                        <CommandEmpty>
                            {allowCustom && search.trim() ? (
                                <button
                                    type="button"
                                    className="w-full cursor-pointer px-2 py-1 text-sm hover:bg-accent"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={addCustomValue}
                                >
                                    使用 "{search.trim()}"
                                </button>
                            ) : (
                                emptyText
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    className="min-w-0 overflow-hidden"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onSelect={() => {
                                        toggleValue(option.value)
                                        setSearch('')
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            values.includes(option.value) ? 'opacity-100' : 'opacity-0',
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
