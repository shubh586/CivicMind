'use client';

import { useState, useEffect } from 'react';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Loader2, FileText } from 'lucide-react';

const statusOptions = [
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

export default function DepartmentComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const response = await complaintsAPI.list({ limit: 50 });
            setComplaints(response.data.data.complaints || []);
        } catch (error) {
            console.error('Failed to load complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        setUpdating(id);
        try {
            await complaintsAPI.updateStatus(id, newStatus);
            setComplaints(complaints.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            ));
        } catch (error) {
            console.error('Failed to update status:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to update status';
            alert(errorMessage);
        } finally {
            setUpdating(null);
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
                <h1 className="text-2xl font-bold text-white">Complaints</h1>
                <p className="text-gray-400">Manage and update complaint status</p>
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
                <div className="space-y-3">
                    {complaints.map((complaint) => (
                        <Card key={complaint.id}>
                            <CardContent className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-gray-500">#{complaint.id}</span>
                                            <StatusBadge status={complaint.status} />
                                            <UrgencyBadge urgency={complaint.urgency} />
                                        </div>
                                        <p className="text-white line-clamp-2">{complaint.text}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                            <span className="capitalize">{complaint.category}</span>
                                            <span>•</span>
                                            <span>{formatDate(complaint.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={complaint.status}
                                            onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                                            className="w-36"
                                            disabled={updating === complaint.id}
                                        >
                                            {statusOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </Select>
                                        {updating === complaint.id && (
                                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
