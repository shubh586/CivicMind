'use client';

import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }) {
    return (
        <div
            className={cn(
                'rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children }) {
    return (
        <div className={cn('p-6 border-b border-gray-800', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children }) {
    return (
        <h3 className={cn('text-lg font-semibold text-white', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ className, children }) {
    return (
        <p className={cn('text-sm text-gray-400 mt-1', className)}>
            {children}
        </p>
    );
}

export function CardContent({ className, children }) {
    return (
        <div className={cn('p-6', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children }) {
    return (
        <div className={cn('p-6 border-t border-gray-800', className)}>
            {children}
        </div>
    );
}
