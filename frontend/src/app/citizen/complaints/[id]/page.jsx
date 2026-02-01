'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Loader2, ArrowLeft, Clock, Building2, MapPin, Target, Brain } from 'lucide-react';

export default function ComplaintDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComplaint();
    }, [params.id]);

    const loadComplaint = async () => {
        try {
            const response = await complaintsAPI.get(params.id);
            setComplaint(response.data.data);
        } catch (error) {
            console.error('Failed to load complaint:', error);
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

    if (!complaint) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Complaint not found</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const deadline = new Date(complaint.sla_deadline);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Complaint #{complaint.id}</h1>
                    <p className="text-gray-400">Submitted on {formatDateTime(complaint.created_at)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Complaint Details</CardTitle>
                                <StatusBadge status={complaint.status} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300 leading-relaxed">{complaint.text}</p>
                        </CardContent>
                    </Card>

                    {/* AI Explanation */}
                    <Card className="border-blue-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-blue-400" />
                                AI Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300 leading-relaxed">{complaint.explanation}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Status Card */}
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Target className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Category</p>
                                    <p className="text-white font-medium capitalize">{complaint.category}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Building2 className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Department</p>
                                    <p className="text-white font-medium">{complaint.department_name}</p>
                                </div>
                            </div>

                            {complaint.location && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <MapPin className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Location</p>
                                        <p className="text-white font-medium">{complaint.location}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <UrgencyBadge urgency={complaint.urgency} />
                                <span className="text-sm text-gray-400">Urgency</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SLA Card */}
                    <Card className={daysRemaining < 0 ? 'border-red-500/50' : daysRemaining < 2 ? 'border-yellow-500/50' : ''}>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${daysRemaining < 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                                    <Clock className={`w-5 h-5 ${daysRemaining < 0 ? 'text-red-400' : 'text-yellow-400'}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">SLA Deadline</p>
                                    <p className="text-white font-medium">{formatDateTime(complaint.sla_deadline)}</p>
                                </div>
                            </div>
                            <div className={`text-sm font-medium ${daysRemaining < 0 ? 'text-red-400' : daysRemaining < 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {daysRemaining < 0
                                    ? `Overdue by ${Math.abs(daysRemaining)} days`
                                    : daysRemaining === 0
                                        ? 'Due today'
                                        : `${daysRemaining} days remaining`
                                }
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confidence Score */}
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-400 mb-2">AI Confidence</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${complaint.confidence_score * 100}%` }}
                                    />
                                </div>
                                <span className="text-white font-medium">
                                    {Math.round(complaint.confidence_score * 100)}%
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
