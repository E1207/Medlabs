import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function OtpInput({ length = 6, value, onChange, disabled }: OtpInputProps) {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, char: string) => {
        if (!/^\d*$/.test(char)) return;

        const newValue = value.split('');
        newValue[index] = char.slice(-1);
        const result = newValue.join('').slice(0, length);
        onChange(result);

        // Auto-focus next input
        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange(pasted);
        inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={cn(
                        "w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 border-gray-300",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                        "transition-all duration-150",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
}
