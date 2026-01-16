import React, { useState, useEffect } from 'react';
import { DataTable, Badge, Modal, useToast } from '@/components/ui-dashboard';
import { Button } from '@/components/ui-basic';
import { Search, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Result {
    id: string;
    createdAt: string;
    patientName: string;
    patientPhone: string;
    folderRef: string;
    status: 'UPLOADED' | 'NOTIFIED' | 'DELIVERED' | 'OPENED' | 'FAILED';
}

export default function ResultsHistory() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [resendModalOpen, setResendModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState<Result | null>(null);
    const [newPhone, setNewPhone] = useState('');

    useEffect(() => {
        fetchResults();
    }, [searchTerm]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/results?search=${encodeURIComponent(searchTerm)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const { data } = await res.json();

            // Map backend status to frontend status if needed, provided typing matches
            setResults(data);
        } catch (error) {
            console.error(error);
            addToast('Failed to load results', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/results/${id}/preview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to get preview');
            const { url } = await res.json();
            window.open(url, '_blank');
            addToast('Preview opened in new tab', 'info');
        } catch (error) {
            addToast('Failed to get preview link', 'error');
        }
    };

    const openResendModal = (result: Result) => {
        setSelectedResult(result);
        setNewPhone(result.patientPhone);
        setResendModalOpen(true);
    };

    const handleResend = async () => {
        if (!selectedResult) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/results/${selectedResult.id}/resend`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ phone: newPhone })
            });

            if (!res.ok) throw new Error('Failed to resend');

            addToast(`Resent notification to ${newPhone}`, 'success');
            setResendModalOpen(false);
            fetchResults(); // Refresh list
        } catch (error) {
            addToast('Failed to resend notification', 'error');
        }
    };

    const getStatusBadge = (status: Result['status']) => {
        switch (status) {
            case 'UPLOADED': return <Badge variant="secondary">Uploaded</Badge>;
            case 'NOTIFIED': return <Badge variant="default">Notified</Badge>;
            case 'DELIVERED': return <Badge variant="success">Delivered</Badge>;
            case 'OPENED': return <Badge className="bg-purple-100 text-purple-700">Opened</Badge>;
            case 'FAILED': return <Badge variant="danger">Failed</Badge>;
            default: return <Badge>Unknown</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sent History</h1>
                    <p className="text-muted-foreground">Track and manage sent results</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search patient or reference..."
                        className="pl-9 w-full border rounded-md px-3 py-2 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <DataTable
                data={results}
                columns={[
                    { key: 'createdAt', header: 'Date' },
                    {
                        key: 'patientName',
                        header: 'Patient',
                        render: (row) => (
                            <div>
                                <div className="font-medium">{row.patientName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {row.patientPhone.replace(/(\\d{4})$/, '****')}
                                </div>
                            </div>
                        )
                    },
                    { key: 'folderRef', header: 'Reference' },
                    {
                        key: 'status',
                        header: 'Status',
                        render: (row) => getStatusBadge(row.status)
                    },
                    {
                        key: 'id',
                        header: 'Actions',
                        render: (row) => (
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handlePreview(row.id)} title="Preview">
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); openResendModal(row); }}
                                    className={row.status === 'FAILED' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                                >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                    {row.status === 'FAILED' ? 'Retry' : 'Resend'}
                                </Button>
                            </div>
                        )
                    }
                ]}
            />

            {/* Resend Modal */}
            <Modal
                open={resendModalOpen}
                onClose={() => setResendModalOpen(false)}
                title={selectedResult?.status === 'FAILED' ? 'Retry Delivery' : 'Resend Notification'}
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm flex gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>
                            Confirming this action will send a new SMS and Email to the patient.
                            Please verify the contact details below.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Patient Phone</label>
                        <input
                            type="text"
                            className="w-full border rounded-md px-3 py-2"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setResendModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleResend}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm & Send
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
