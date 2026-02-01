'use client';

import { useState, useEffect } from 'react';
import { reviewAPI, escalationsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ClipboardCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export default function DepartmentDashboard() {
    const [complaintStats, setComplaintStats] = useState(null);
    const [reviewStats, setReviewStats] = useState(null);
    const [escalationStats, setEscalationStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [complaintRes, reviewRes, escalationRes] = await Promise.all([
                fetch('http://localhost:3001/api/complaints/stats', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(res => res.json()),
                reviewAPI.getStats(),
                escalationsAPI.getStats(),
            ]);
            setComplaintStats(complaintRes.data.overview);
            setReviewStats(reviewRes.data.data);
            setEscalationStats(escalationRes.data.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Department Dashboard</h1>
                <p className="text-gray-400">Monitor complaints and review queue</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <ClipboardCheck className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {reviewStats?.pending || 0}
                                </p>
                                <p className="text-sm text-gray-400">Pending Reviews</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {complaintStats?.resolved_count || 0}
                                </p>
                                <p className="text-sm text-gray-400">Resolved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {escalationStats?.breached || 0}
                                </p>
                                <p className="text-sm text-gray-400">SLA Breached</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-xl">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {escalationStats?.approaching || 0}
                                </p>
                                <p className="text-sm text-gray-400">Approaching Deadline</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:border-purple-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-purple-400" />
                            Review Queue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-400">
                            Review and approve AI classifications. {reviewStats?.pending || 0} items pending.
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:border-red-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Escalations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-400">
                            View breached SLAs and approaching deadlines. {escalationStats?.breached || 0} breached.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
