'use client';

import { cn } from '@/lib/utils';

export function Button({
    children,
    variant = 'default',
    size = 'default',
    className,
    disabled,
    ...props
}) {
    const variants = {
        default: 'bg-white text-black hover:bg-gray-200',
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-600 bg-transparent hover:bg-gray-800',
        ghost: 'bg-transparent hover:bg-gray-800',
    };

    const sizes = {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-6 py-3 text-lg',
        icon: 'p-2',
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
