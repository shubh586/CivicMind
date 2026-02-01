'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <p className="text-gray-400">Manage system users and roles</p>
            </div>

            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-white font-medium">Coming Soon</p>
                        <p className="text-gray-400 mt-1">User management features will be available in a future update</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
