'use client';

import { useState, useEffect } from 'react';
import { routingAPI, departmentsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, GitBranch } from 'lucide-react';

const categories = ['pothole', 'sewage', 'water', 'electricity', 'garbage', 'streetlight', 'roads', 'other'];
const urgencies = ['low', 'medium', 'high', 'critical'];

export default function RoutingRulesPage() {
    const [rules, setRules] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        category: '',
        urgency: '',
        location: '',
        department_id: '',
        priority: 1,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [rulesRes, deptsRes] = await Promise.all([
                routingAPI.list(),
                departmentsAPI.list(),
            ]);
            setRules(rulesRes.data.data || []);
            setDepartments(deptsRes.data.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                category: rule.category || '',
                urgency: rule.urgency || '',
                location: rule.location || '',
                department_id: rule.department_id,
                priority: rule.priority || 1,
            });
        } else {
            setEditingRule(null);
            setFormData({ category: '', urgency: '', location: '', department_id: '', priority: 1 });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                ...formData,
                category: formData.category || null,
                urgency: formData.urgency || null,
                location: formData.location || null,
            };
            if (editingRule) {
                await routingAPI.update(editingRule.id, data);
            } else {
                await routingAPI.create(data);
            }
            await loadData();
            setModalOpen(false);
        } catch (error) {
            console.error('Failed to save rule:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await routingAPI.delete(id);
            setRules(rules.filter(r => r.id !== id));
        } catch (error) {
            console.error('Failed to delete rule:', error);
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
                    <h1 className="text-2xl font-bold text-white">Routing Rules</h1>
                    <p className="text-gray-400">Configure how complaints are routed to departments</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Urgency</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Location</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Department</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Priority</th>
                                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule) => (
                                <tr key={rule.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="p-4 text-white capitalize">{rule.category || 'Any'}</td>
                                    <td className="p-4 text-white capitalize">{rule.urgency || 'Any'}</td>
                                    <td className="p-4 text-white">{rule.location || 'Any'}</td>
                                    <td className="p-4 text-white">{rule.department_name}</td>
                                    <td className="p-4 text-white">{rule.priority}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openModal(rule)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Category (leave empty for any)</Label>
                                    <Select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">Any Category</option>
                                        {categories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <Label>Urgency (leave empty for any)</Label>
                                    <Select
                                        value={formData.urgency}
                                        onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                                    >
                                        <option value="">Any Urgency</option>
                                        {urgencies.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <Label>Location Pattern (optional)</Label>
                                    <Input
                                        placeholder="e.g., MG Road"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>Department</Label>
                                    <Select
                                        value={formData.department_id}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <Label>Priority (higher = more specific)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="flex-1"
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
