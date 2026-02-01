'use client';

import { useState, useEffect } from 'react';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Loader2, FileText } from 'lucide-react';

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadComplaints();
    }, [statusFilter]);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const params = { limit: 50 };
            if (statusFilter) params.status = statusFilter;
            const response = await complaintsAPI.list(params);
            setComplaints(response.data.data.complaints || []);
        } catch (error) {
            console.error('Failed to load complaints:', error);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">All Complaints</h1>
                    <p className="text-gray-400">View all complaints across the system</p>
                </div>
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

            {complaints.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No complaints found</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left p-4 text-gray-400 font-medium">ID</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Complaint</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Department</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map((c) => (
                                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="p-4 text-gray-500">#{c.id}</td>
                                        <td className="p-4 text-white max-w-xs truncate">{c.text}</td>
                                        <td className="p-4 capitalize">
                                            <span className="text-blue-400">{c.category}</span>
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={c.status} />
                                        </td>
                                        <td className="p-4 text-gray-300">{c.department_name}</td>
                                        <td className="p-4 text-gray-400">{formatDate(c.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
