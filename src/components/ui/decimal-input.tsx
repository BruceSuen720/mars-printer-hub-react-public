import React, { useEffect, useRef, useState } from 'react'
import { Input } from './input'

/** Number input that correctly handles decimal point input in controlled mode */
export function DecimalInput({
    value,
    onValueChange,
    onFocus,
    onBlur,
    ...props
}: {
    value: number | undefined | ''
    onValueChange: (val: number | undefined) => void
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'>) {
    const [raw, setRaw] = useState(() =>
        value != null && value !== '' ? String(value) : '',
    )
    const isFocused = useRef(false)

    useEffect(() => {
        if (!isFocused.current) {
            setRaw(value != null && value !== '' ? String(value) : '')
        }
    }, [value])

    return (
        <Input
            {...props}
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\-?\d*\.?\d*$/.test(v)) {
                    setRaw(v)
                    const n = Number(v)
                    if (v !== '' && !v.endsWith('.') && v !== '-' && !isNaN(n)) {
                        onValueChange(n)
                    } else if (v === '') {
                        onValueChange(undefined)
                    }
                }
            }}
            onFocus={(e) => {
                isFocused.current = true
                onFocus?.(e)
            }}
            onBlur={(e) => {
                isFocused.current = false
                if (raw === '' || raw === '.' || raw === '-') {
                    onValueChange(undefined)
                    setRaw('')
                } else {
                    const n = Number(raw)
                    if (!isNaN(n)) {
                        onValueChange(n)
                        setRaw(String(n))
                    }
                }
                onBlur?.(e)
            }}
        />
    )
}
