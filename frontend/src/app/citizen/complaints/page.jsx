'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Loader2, FileText, PlusCircle, ChevronRight } from 'lucide-react';

export default function ComplaintsListPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

    useEffect(() => {
        loadComplaints();
    }, [statusFilter]);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const params = { limit: 10 };
            if (statusFilter) params.status = statusFilter;
            const response = await complaintsAPI.list(params);
            setComplaints(response.data.data.complaints || []);
            setPagination(response.data.data.pagination || { page: 1, total: 0, pages: 1 });
        } catch (error) {
            console.error('Failed to load complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">My Complaints</h1>
                    <p className="text-gray-400">View and track all your submitted complaints</p>
                </div>
                <Link href="/citizen/complaints/new">
                    <Button variant="primary">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        New Complaint
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-400">Filter by status:</label>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-48"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="escalated">Escalated</option>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Complaints List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : complaints.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No complaints found</p>
                            <Link href="/citizen/complaints/new">
                                <Button variant="primary" className="mt-4">
                                    Submit your first complaint
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {complaints.map((complaint) => (
                        <Link
                            key={complaint.id}
                            href={`/citizen/complaints/${complaint.id}`}
                        >
                            <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <StatusBadge status={complaint.status} />
                                                <UrgencyBadge urgency={complaint.urgency} />
                                                <span className="text-xs text-gray-500">
                                                    #{complaint.id}
                                                </span>
                                            </div>
                                            <p className="text-white font-medium line-clamp-2">
                                                {complaint.text}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                                <span className="capitalize">{complaint.category}</span>
                                                <span>•</span>
                                                <span>{complaint.department_name}</span>
                                                <span>•</span>
                                                <span>{formatDate(complaint.created_at)}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination info */}
            {pagination.total > 0 && (
                <p className="text-center text-sm text-gray-500">
                    Showing {complaints.length} of {pagination.total} complaints
                </p>
            )}
        </div>
    );
}
