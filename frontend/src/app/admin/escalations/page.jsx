'use client';

import { useState, useEffect } from 'react';
import { escalationsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AdminEscalationsPage() {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEscalations();
    }, []);

    const loadEscalations = async () => {
        try {
            const response = await escalationsAPI.list();
            console.log('Escalations response:', response.data);
            const data = response.data.data;
            // Handle both array and object with escalations property
            const escalationList = Array.isArray(data) ? data : (data?.escalations || []);
            setEscalations(escalationList);
        } catch (error) {
            console.error('Failed to load escalations:', error);
            setEscalations([]);
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
            <div>
                <h1 className="text-2xl font-bold text-white">Escalation History</h1>
                <p className="text-gray-400">View all escalated complaints and their history</p>
            </div>

            {escalations.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No escalations found</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {escalations.map((esc) => (
                        <Card key={esc.id} className="border-red-500/20">
                            <CardContent className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-gray-500">Complaint #{esc.complaint_id}</span>
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                        </div>
                                        <p className="text-white mb-2">{esc.reason}</p>
                                        <div className="text-sm text-gray-400">
                                            <span>{esc.escalated_from_name}</span>
                                            <span className="mx-2">→</span>
                                            <span className="text-red-400">{esc.escalated_to_name}</span>
                                        </div>
                                        {esc.genai_explanation && (
                                            <p className="mt-2 text-sm text-gray-500 italic">
                                                {esc.genai_explanation}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        {formatDateTime(esc.created_at)}
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
