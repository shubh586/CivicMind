import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getStatusColor(status) {
    const colors = {
        pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        assigned: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        in_progress: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
        resolved: 'bg-green-500/20 text-green-500 border-green-500/30',
        escalated: 'bg-red-500/20 text-red-500 border-red-500/30',
        closed: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    };
    return colors[status] || colors.pending;
}

export function getUrgencyColor(urgency) {
    const colors = {
        low: 'bg-gray-500/20 text-gray-400',
        medium: 'bg-blue-500/20 text-blue-400',
        high: 'bg-orange-500/20 text-orange-400',
        critical: 'bg-red-500/20 text-red-400',
    };
    return colors[urgency] || colors.medium;
}
