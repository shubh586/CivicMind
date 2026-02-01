'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FileText,
    ClipboardCheck,
    AlertTriangle,
    User,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
    { name: 'Dashboard', href: '/department/dashboard', icon: LayoutDashboard },
    { name: 'Complaints', href: '/department/complaints', icon: FileText },
    { name: 'Review Queue', href: '/department/review-queue', icon: ClipboardCheck },
    { name: 'Escalations', href: '/department/escalations', icon: AlertTriangle },
];

export default function DepartmentLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-950">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={cn(
                'fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800 transition-transform lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                        <Link href="/department/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">GI</span>
                            </div>
                            <span className="text-white font-semibold">Dept Panel</span>
                        </Link>
                        <button
                            className="lg:hidden text-gray-400 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-700 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-purple-200" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.name || 'Reviewer'}
                                </p>
                                <p className="text-xs text-gray-400 truncate capitalize">
                                    {user?.role}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 h-16 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
                    <div className="flex items-center justify-between h-full px-4">
                        <button
                            className="lg:hidden text-gray-400 hover:text-white"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex-1" />
                        <div className="flex items-center gap-4">
                            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
                                {user?.role?.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
