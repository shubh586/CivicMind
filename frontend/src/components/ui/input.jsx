'use client';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                'w-full px-4 py-2 rounded-lg',
                'bg-gray-800 border border-gray-700',
                'text-white placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            {...props}
        />
    );
}

export function Textarea({ className, ...props }) {
    return (
        <textarea
            className={cn(
                'w-full px-4 py-3 rounded-lg resize-none',
                'bg-gray-800 border border-gray-700',
                'text-white placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            {...props}
        />
    );
}

export function Label({ className, children, ...props }) {
    return (
        <label
            className={cn('block text-sm font-medium text-gray-300 mb-1.5', className)}
            {...props}
        >
            {children}
        </label>
    );
}

export function Select({ className, children, ...props }) {
    return (
        <select
            className={cn(
                'w-full px-4 py-2 rounded-lg appearance-none',
                'bg-gray-800 border border-gray-700',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                className
            )}
            {...props}
        >
            {children}
        </select>
    );
}
