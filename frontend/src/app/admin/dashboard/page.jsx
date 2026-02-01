'use client';

import { useState, useEffect } from 'react';
import { complaintsAPI, escalationsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [escalationStats, setEscalationStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, escRes] = await Promise.all([
                complaintsAPI.getStats(),
                escalationsAPI.getStats(),
            ]);
            console.log('Stats response:', statsRes.data);
            setStats(statsRes.data.data);
            setEscalationStats(escRes.data.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    // Extract values from backend response structure
    const overview = stats?.overview || {};
    const totalComplaints = parseInt(overview.total_complaints) || 0;
    const pendingCount = parseInt(overview.pending_count) || 0;
    const resolvedCount = parseInt(overview.resolved_count) || 0;
    const escalatedCount = parseInt(overview.escalated_count) || 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400">System overview and statistics</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">{totalComplaints}</p>
                                <p className="text-sm text-blue-300">Total Complaints</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-xl">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">{pendingCount}</p>
                                <p className="text-sm text-yellow-300">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">{resolvedCount}</p>
                                <p className="text-sm text-green-300">Resolved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">{escalatedCount}</p>
                                <p className="text-sm text-red-300">Escalated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category & Urgency Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>By Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.byCategory?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.byCategory.map((cat) => (
                                    <div key={cat.category} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-white capitalize">{cat.category}</span>
                                                <span className="text-sm text-gray-400">{cat.count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${(cat.count / totalComplaints) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-4">No data available</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>By Urgency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.byUrgency?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.byUrgency.map((u) => {
                                    const colors = {
                                        low: 'bg-green-500',
                                        medium: 'bg-yellow-500',
                                        high: 'bg-orange-500',
                                        critical: 'bg-red-500',
                                    };
                                    return (
                                        <div key={u.urgency} className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-white capitalize">{u.urgency}</span>
                                                    <span className="text-sm text-gray-400">{u.count}</span>
                                                </div>
                                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors[u.urgency] || 'bg-gray-500'} rounded-full`}
                                                        style={{ width: `${(u.count / totalComplaints) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-4">No data available</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
