'use client';

import { cn, getStatusColor, getUrgencyColor } from '@/lib/utils';

export function Badge({ variant = 'default', className, children }) {
    const variants = {
        default: 'bg-gray-700 text-gray-200',
        success: 'bg-green-500/20 text-green-400',
        warning: 'bg-yellow-500/20 text-yellow-400',
        error: 'bg-red-500/20 text-red-400',
        info: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}

export function StatusBadge({ status }) {
    const statusLabels = {
        pending: 'Pending',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        escalated: 'Escalated',
        closed: 'Closed',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                getStatusColor(status)
            )}
        >
            {statusLabels[status] || status}
        </span>
    );
}

export function UrgencyBadge({ urgency }) {
    const urgencyLabels = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getUrgencyColor(urgency)
            )}
        >
            {urgencyLabels[urgency] || urgency}
        </span>
    );
}
