import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// ============================================
// BADGE
// ============================================
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
    const variants = {
        default: 'bg-primary/10 text-primary',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        secondary: 'bg-gray-100 text-gray-700',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                variants[variant],
                className
            )}
            {...props}
        />
    );
}

// ============================================
// MODAL / DIALOG
// ============================================
interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-white rounded-lg shadow-xl mx-4">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}

// ============================================
// TOAST SYSTEM
// ============================================
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const ToastContext = React.createContext<{
    addToast: (message: string, type?: Toast['type']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = (message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            'px-4 py-3 rounded-lg shadow-lg text-white min-w-[250px] animate-in slide-in-from-right',
                            toast.type === 'success' && 'bg-green-600',
                            toast.type === 'error' && 'bg-red-600',
                            toast.type === 'info' && 'bg-blue-600'
                        )}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

// ============================================
// PROGRESS BAR
// ============================================
interface ProgressBarProps {
    value: number;
    max: number;
    label?: string;
    showWarning?: boolean;
}

export function ProgressBar({ value, max, label, showWarning }: ProgressBarProps) {
    const percentage = Math.min((value / max) * 100, 100);
    const isLow = percentage < 20;

    return (
        <div className="space-y-1">
            {label && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value} / {max}</span>
                </div>
            )}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all duration-300',
                        isLow && showWarning ? 'bg-amber-500' : 'bg-primary'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isLow && showWarning && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Low balance warning</p>
            )}
        </div>
    );
}

// ============================================
// DATA TABLE
// ============================================
interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({ data, columns, onRowClick }: DataTableProps<T>) {
    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        {columns.map((col) => (
                            <th key={String(col.key)} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.map((row) => (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick?.(row)}
                            className={cn('hover:bg-gray-50', onRowClick && 'cursor-pointer')}
                        >
                            {columns.map((col) => (
                                <td key={String(col.key)} className="px-4 py-3 text-sm">
                                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================
// STAT CARD
// ============================================
interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: { value: number; label: string };
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {trend && (
                        <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                        </p>
                    )}
                </div>
                {icon && <div className="text-primary opacity-80">{icon}</div>}
            </div>
        </div>
    );
}

// ============================================
// TABS
// ============================================
interface TabsProps {
    tabs: { id: string; label: string; content: React.ReactNode }[];
    defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
    const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

    return (
        <div>
            <div className="border-b flex gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                            activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="py-4">
                {tabs.find((t) => t.id === activeTab)?.content}
            </div>
        </div>
    );
}
