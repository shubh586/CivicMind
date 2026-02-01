'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Brain, MapPin, Building2, Calendar } from 'lucide-react';

export function ComplaintCard({ complaint, children }) {
    return (
        <Card className="border-gray-800 bg-gray-900/50 hover:bg-gray-900/80 transition-colors">
            <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-6">
                        {/* Image Thumbnail */}
                        {complaint.image_url && (
                            <div className="flex-shrink-0">
                                <img
                                    src={`http://localhost:3001${complaint.image_url}`}
                                    alt="Complaint"
                                    className="w-32 h-32 object-cover rounded-lg border border-gray-700"
                                />
                            </div>
                        )}

                        <div className="flex-1 flex flex-col gap-4">
                            {/* Header: Badges and ID */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-gray-500">#{complaint.id}</span>
                                    <StatusBadge status={complaint.status} />
                                    <UrgencyBadge urgency={complaint.urgency} />
                                    <span className="text-sm font-medium text-blue-400 capitalize bg-blue-400/10 px-2 py-0.5 rounded">
                                        {complaint.category}
                                    </span>
                                </div>
                                {children && <div className="flex-shrink-0">{children}</div>}
                            </div>

                            {/* Complaint Text */}
                            <div>
                                <p className="text-white text-lg font-medium leading-relaxed">
                                    {complaint.text}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    {complaint.explanation && (
                        <div className="mt-2 bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2 text-blue-400">
                                <Brain className="w-4 h-4" />
                                <span className="text-sm font-semibold">AI Analysis</span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {complaint.explanation}
                            </p>
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-wrap items-center gap-6 mt-2 pt-4 border-t border-gray-800/50 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{complaint.department_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(complaint.created_at)}</span>
                        </div>
                        {complaint.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{complaint.location}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
