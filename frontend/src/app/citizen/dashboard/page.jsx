'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { PlusCircle, FileText, Clock, CheckCircle, Loader2 } from 'lucide-react';

export default function CitizenDashboard() {
    const [stats, setStats] = useState(null);
    const [recentComplaints, setRecentComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [complaintsRes] = await Promise.all([
                complaintsAPI.list({ limit: 5 }),
            ]);
            setRecentComplaints(complaintsRes.data.data.complaints || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const pending = recentComplaints.filter(c => ['pending', 'assigned'].includes(c.status)).length;
    const resolved = recentComplaints.filter(c => c.status === 'resolved').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Track your complaints and submissions</p>
                </div>
                <Link href="/citizen/complaints/new">
                    <Button variant="primary">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        New Complaint
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{recentComplaints.length}</p>
                                <p className="text-sm text-gray-400">Total Complaints</p>
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
                                <p className="text-2xl font-bold text-white">{pending}</p>
                                <p className="text-sm text-gray-400">Pending</p>
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
                                <p className="text-2xl font-bold text-white">{resolved}</p>
                                <p className="text-sm text-gray-400">Resolved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Complaints */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Complaints</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentComplaints.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No complaints yet</p>
                            <Link href="/citizen/complaints/new">
                                <Button variant="primary" className="mt-4">
                                    Submit your first complaint
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentComplaints.map((complaint) => (
                                <Link
                                    key={complaint.id}
                                    href={`/citizen/complaints/${complaint.id}`}
                                    className="block p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {complaint.text.substring(0, 80)}...
                                            </p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {complaint.category} • {formatDate(complaint.created_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={complaint.status} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
