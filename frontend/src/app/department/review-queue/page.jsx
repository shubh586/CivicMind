'use client';

import { useState, useEffect } from 'react';
import { reviewAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, Select } from '@/components/ui/input';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, Edit, AlertCircle } from 'lucide-react';

export default function ReviewQueuePage() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [overrideModal, setOverrideModal] = useState(null);
    const [overrideData, setOverrideData] = useState({
        new_category: '',
        new_urgency: '',
        notes: '',
    });

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        try {
            const response = await reviewAPI.list();
            console.log('Review queue response:', response.data);
            // API returns { data: { reviews: [...], pagination: {...} } }
            const data = response.data.data;
            const reviews = Array.isArray(data) ? data : (data?.reviews || []);
            setQueue(reviews);
        } catch (error) {
            console.error('Failed to load review queue:', error);
            setQueue([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await reviewAPI.approve(id);
            setQueue(queue.filter(item => item.id !== id));
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleOverride = async () => {
        if (!overrideModal) return;
        setActionLoading(overrideModal.id);
        try {
            await reviewAPI.override(overrideModal.id, overrideData);
            setQueue(queue.filter(item => item.id !== overrideModal.id));
            setOverrideModal(null);
            setOverrideData({ new_category: '', new_urgency: '', notes: '' });
        } catch (error) {
            console.error('Failed to override:', error);
        } finally {
            setActionLoading(null);
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
                <h1 className="text-2xl font-bold text-white">Review Queue</h1>
                <p className="text-gray-400">Review AI classifications with low confidence scores</p>
            </div>

            {queue.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-white font-medium">All caught up!</p>
                            <p className="text-gray-400">No items pending review</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {queue.map((item) => (
                        <Card key={item.id}>
                            <CardContent className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-gray-500">#{item.complaint_id}</span>
                                            <StatusBadge status={item.override_status} />
                                        </div>
                                        <p className="text-white mb-2 line-clamp-2">{item.complaint_text}</p>

                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                                <p className="text-xs text-gray-400 mb-1">AI Classification</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-sm text-blue-400 capitalize">{item.original_category}</span>
                                                    <UrgencyBadge urgency={item.original_urgency} />
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                                <p className="text-xs text-gray-400 mb-1">Confidence</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-700 rounded-full">
                                                        <div
                                                            className="h-full bg-yellow-500 rounded-full"
                                                            style={{ width: `${(item.confidence_score || 0.5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-yellow-400">
                                                        {Math.round((item.confidence_score || 0.5) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 mt-2">
                                            Flagged: {item.flagged_reason}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleApprove(item.id)}
                                            disabled={actionLoading === item.id}
                                        >
                                            {actionLoading === item.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Approve
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setOverrideModal(item);
                                                setOverrideData({
                                                    new_category: item.original_category,
                                                    new_urgency: item.original_urgency,
                                                    notes: '',
                                                });
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Override
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Override Modal */}
            {overrideModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Override AI Classification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Category</Label>
                                <Select
                                    value={overrideData.new_category}
                                    onChange={(e) => setOverrideData({ ...overrideData, new_category: e.target.value })}
                                >
                                    <option value="pothole">Pothole</option>
                                    <option value="sewage">Sewage</option>
                                    <option value="water">Water Supply</option>
                                    <option value="electricity">Electricity</option>
                                    <option value="garbage">Garbage</option>
                                    <option value="streetlight">Streetlight</option>
                                    <option value="roads">Roads</option>
                                    <option value="other">Other</option>
                                </Select>
                            </div>

                            <div>
                                <Label>Urgency</Label>
                                <Select
                                    value={overrideData.new_urgency}
                                    onChange={(e) => setOverrideData({ ...overrideData, new_urgency: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </Select>
                            </div>

                            <div>
                                <Label>Notes</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Reason for override..."
                                    value={overrideData.notes}
                                    onChange={(e) => setOverrideData({ ...overrideData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setOverrideModal(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleOverride}
                                    disabled={actionLoading === overrideModal.id}
                                >
                                    {actionLoading === overrideModal.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Save Override'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
