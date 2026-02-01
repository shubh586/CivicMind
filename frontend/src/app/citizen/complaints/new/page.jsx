'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { complaintsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea, Label } from '@/components/ui/input';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react';

export default function NewComplaintPage() {
    const router = useRouter();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (text.trim().length < 10) {
            setError('Complaint must be at least 10 characters long');
            return;
        }

        setLoading(true);

        try {
            const response = await complaintsAPI.create({ text: text.trim() });
            setResult(response.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit complaint');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className="border-green-500/30">
                    <CardContent className="pt-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Complaint Submitted!</h2>
                            <p className="text-gray-400 mt-1">Your complaint has been processed by AI</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">AI Classification</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                        {result.classification.category}
                                    </span>
                                    <UrgencyBadge urgency={result.classification.urgency} />
                                    {result.classification.location && (
                                        <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                                            📍 {result.classification.location}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">Routed To</p>
                                <p className="text-white font-medium">{result.routing.departmentName}</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Deadline: {new Date(result.routing.deadline).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">AI Explanation</p>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {result.explanation}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">Confidence Score</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${result.classification.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-white font-medium">
                                        {Math.round(result.classification.confidence * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setResult(null);
                                    setText('');
                                }}
                            >
                                Submit Another
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={() => router.push('/citizen/complaints')}
                            >
                                View All Complaints
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Submit a Complaint</h1>
                <p className="text-gray-400">
                    Describe your issue in detail. Our AI will classify and route it to the appropriate department.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Complaint Details</CardTitle>
                    <CardDescription>
                        Be specific about the problem, location, and any relevant details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="complaint">Your Complaint</Label>
                            <Textarea
                                id="complaint"
                                rows={6}
                                placeholder="Example: There is a large pothole on MG Road near City Mall causing accidents. The pothole has been there for over a week and is dangerous for vehicles and pedestrians..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Minimum 10 characters • {text.length} characters
                            </p>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading || text.trim().length < 10}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Complaint
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
