
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './ui-basic';

interface DropdownMenuProps {
    trigger?: React.ReactNode;
    children: React.ReactNode;
}

export function DropdownMenu({ trigger, children }: DropdownMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <div onClick={() => setOpen(!open)}>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
}

export function DropdownMenuItem({ children, icon, variant = 'default', className, onClick, ...props }: DropdownItemProps) {
    return (
        <div
            className={cn(
                "group flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors",
                variant === 'danger' ? "text-red-600 hover:bg-red-50" : "text-gray-700",
                className
            )}
            role="menuitem"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            {...props}
        >
            {icon && <span className={cn("mr-2 h-4 w-4", variant === 'danger' ? "text-red-500" : "text-gray-500")}>{icon}</span>}
            {children}
        </div>
    );
}
