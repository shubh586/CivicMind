'use client';

import { useState, useEffect } from 'react';
import { departmentsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sla_days: 7,
        contact_email: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            const response = await departmentsAPI.list();
            setDepartments(response.data.data || []);
        } catch (error) {
            console.error('Failed to load departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (dept = null) => {
        if (dept) {
            setEditingDept(dept);
            setFormData({
                name: dept.name,
                description: dept.description || '',
                sla_days: dept.sla_days,
                contact_email: dept.contact_email || '',
            });
        } else {
            setEditingDept(null);
            setFormData({ name: '', description: '', sla_days: 7, contact_email: '' });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingDept) {
                await departmentsAPI.update(editingDept.id, formData);
            } else {
                await departmentsAPI.create(formData);
            }
            await loadDepartments();
            setModalOpen(false);
        } catch (error) {
            console.error('Failed to save department:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            await departmentsAPI.delete(id);
            setDepartments(departments.filter(d => d.id !== id));
        } catch (error) {
            console.error('Failed to delete department:', error);
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
                    <h1 className="text-2xl font-bold text-white">Departments</h1>
                    <p className="text-gray-400">Manage government departments and SLA settings</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                    <Card key={dept.id} className={!dept.is_active ? 'opacity-50' : ''}>
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/20 rounded-lg">
                                        <Building2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">{dept.name}</h3>
                                        <p className="text-sm text-gray-400">{dept.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">SLA: {dept.sla_days} days</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openModal(dept)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(dept.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>{editingDept ? 'Edit Department' : 'Add Department'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>SLA Days</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.sla_days}
                                        onChange={(e) => setFormData({ ...formData, sla_days: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label>Contact Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
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
