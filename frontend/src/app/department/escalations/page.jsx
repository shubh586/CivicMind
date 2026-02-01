'use client';

import { useState, useEffect } from 'react';
import { escalationsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Loader2, AlertTriangle, Clock, ArrowUp } from 'lucide-react';

export default function EscalationsPage() {
    const [breached, setBreached] = useState([]);
    const [approaching, setApproaching] = useState([]);
    const [loading, setLoading] = useState(true);
    const [escalating, setEscalating] = useState(null);

    useEffect(() => {
        loadEscalations();
    }, []);

    const loadEscalations = async () => {
        try {
            const [breachedRes, approachingRes] = await Promise.all([
                escalationsAPI.getBreached(),
                escalationsAPI.getApproaching(),
            ]);
            const breachedData = breachedRes.data.data;
            const approachingData = approachingRes.data.data;
            setBreached(Array.isArray(breachedData) ? breachedData : []);
            setApproaching(Array.isArray(approachingData) ? approachingData : []);
        } catch (error) {
            console.error('Failed to load escalations:', error);
            setBreached([]);
            setApproaching([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEscalate = async (id) => {
        setEscalating(id);
        try {
            await escalationsAPI.trigger(id);
            await loadEscalations();
        } catch (error) {
            console.error('Failed to escalate:', error);
        } finally {
            setEscalating(null);
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
                <h1 className="text-2xl font-bold text-white">Escalations</h1>
                <p className="text-gray-400">Monitor SLA breaches and approaching deadlines</p>
            </div>

            {/* Breached SLAs */}
            <Card className="border-red-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        SLA Breached ({breached.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {breached.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No breached complaints</p>
                    ) : (
                        <div className="space-y-3">
                            {breached.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gray-500">#{item.id}</span>
                                                <UrgencyBadge urgency={item.urgency} />
                                            </div>
                                            <p className="text-white line-clamp-2">{item.text}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-gray-400">{item.department_name}</span>
                                                <span className="text-red-400">
                                                    Overdue by {Math.ceil(item.days_overdue)} days
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleEscalate(item.id)}
                                            disabled={escalating === item.id}
                                        >
                                            {escalating === item.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <ArrowUp className="w-4 h-4 mr-1" />
                                                    Escalate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Approaching Deadline */}
            <Card className="border-yellow-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                        <Clock className="w-5 h-5" />
                        Approaching Deadline ({approaching.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {approaching.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No complaints approaching deadline</p>
                    ) : (
                        <div className="space-y-3">
                            {approaching.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gray-500">#{item.id}</span>
                                                <StatusBadge status={item.status} />
                                                <UrgencyBadge urgency={item.urgency} />
                                            </div>
                                            <p className="text-white line-clamp-2">{item.text}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-gray-400">{item.department_name}</span>
                                                <span className="text-yellow-400">
                                                    Due: {formatDateTime(item.sla_deadline)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
