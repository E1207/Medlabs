import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable, useToast, StatusBadge, DropdownMenu, DropdownMenuItem, FixContactModal, CompleteImportModal, Button, PreviewModal } from '@/components';
import { Search, Eye, RefreshCw, Trash2, Send, Play, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Result {
    id: string;
    createdAt: string;
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    patientDob?: string;
    folderRef: string;
    status: 'IMPORTED' | 'SENT' | 'CONSULTED' | 'EXPIRED' | 'FAILED';
}

export default function ResultsHistory() {
    const { t, i18n } = useTranslation();
    const { addToast } = useToast();
    const [results, setResults] = useState<Result[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, lastPage: 1 });
    const [scanning, setScanning] = useState(false);

    // Modal State
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedResult, setSelectedResult] = useState<Result | null>(null);

    useEffect(() => {
        fetchResults();
    }, [searchTerm, page]);

    const fetchResults = async () => {
        try {
            const res = await api.get(`/results?search=${encodeURIComponent(searchTerm)}&page=${page}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setResults(data.data || []);
            setMeta(data.meta || { total: 0, lastPage: 1 });
        } catch (error) {
            console.error('Fetch Error:', error);
            addToast(t('errors.fetch_failed'), 'error');
        }
    };

    const handlePreview = async (id: string, name: string) => {
        const result = results.find(r => r.id === id);
        setSelectedResult(result || null);
        setPreviewUrl(null);
        setPreviewModalOpen(true);

        try {
            // First get the metadata/secure URL (now returns a relative path like /results/view-secure?key=...)
            const res = await api.get(`/results/${id}/preview`);
            if (!res.ok) throw new Error('Failed to get preview');
            const { url } = await res.json();

            // Fetch the actual file as a blob using the API (which includes the token and prefixes /api)
            const fileRes = await api.get(url);
            if (!fileRes.ok) throw new Error('Could not download file content');

            const blob = await fileRes.blob();
            const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            setPreviewUrl(blobUrl);

        } catch (error) {
            console.error('Preview error:', error);
            setPreviewModalOpen(false);
            addToast(t('errors.preview_failed'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('common.warning') + ': ' + t('common.delete') + '?')) return;
        try {
            const res = await api.delete(`/results/${id}`);
            if (!res.ok) throw new Error('Failed to delete');
            addToast(t('common.success'), 'success');
            fetchResults();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const handleResend = async (result: Result) => {
        try {
            const res = await api.patch(`/results/${result.id}/resend`, { phone: result.patientPhone });
            if (!res.ok) throw new Error('Failed');
            addToast(t('history.modals.resentSuccess', { phone: result.patientPhone }), 'success');
            fetchResults();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const handleScanFolder = async () => {
        setScanning(true);
        try {
            const res = await api.post('/results/scan-folder', {});
            if (!res.ok) throw new Error('Scan failed');
            addToast(t('common.success'), 'success');
            fetchResults();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        } finally {
            setScanning(false);
        }
    };

    const openFixModal = (result: Result) => {
        setSelectedResult(result);
        setFixModalOpen(true);
    };

    const openCompleteModal = (result: Result) => {
        setSelectedResult(result);
        setCompleteModalOpen(true);
    };

    const columns = [
        {
            key: 'createdAt',
            header: t('history.table.date'),
            render: (row: Result) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString(i18n.language, {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                </span>
            )
        },
        {
            key: 'patientName',
            header: t('history.table.patient'),
            render: (row: Result) => (
                <div>
                    <div className="font-medium text-slate-900">{row.patientName}</div>
                    <div className="text-xs text-slate-500">
                        {row.patientPhone || <span className="italic text-amber-500">{t('common.noData')}</span>}
                    </div>
                </div>
            )
        },
        {
            key: 'folderRef',
            header: t('history.table.reference'),
            render: (row: Result) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.folderRef}</span>
        },
        {
            key: 'status',
            header: t('history.table.status'),
            render: (row: Result) => <StatusBadge status={row.status} timestamp={new Date(row.createdAt).toLocaleTimeString()} />
        },
        {
            key: 'actions',
            header: t('history.table.actions'),
            render: (row: Result) => (
                <DropdownMenu>
                    {/* CASE IMPORTED */}
                    {row.status === 'IMPORTED' && (
                        <>
                            <DropdownMenuItem onClick={() => openCompleteModal(row)} className="font-bold text-blue-600">
                                <CheckSquare className="w-4 h-4 mr-2" />
                                {t('actions.complete')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(row.id, row.patientName)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(row.id)} variant="danger">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('actions.delete')}
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* CASE A: FAILED */}
                    {row.status === 'FAILED' && (
                        <>
                            <DropdownMenuItem onClick={() => openFixModal(row)} className="font-bold">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {t('actions.retry')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(row.id, row.patientName)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* CASE SENT or CONSULTED (Success Flow) */}
                    {(row.status === 'SENT' || row.status === 'CONSULTED') && (
                        <>
                            <DropdownMenuItem onClick={() => handlePreview(row.id, row.patientName)} className="font-medium">
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResend(row)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {t('actions.resend')}
                            </DropdownMenuItem>
                        </>
                    )}
                    {/* CASE D: EXPIRED (Archived) */}
                    {row.status === 'EXPIRED' && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                            {t('history.table.noActionsAvailable')}
                        </div>
                    )}
                </DropdownMenu>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('history.title')}</h1>
                    <p className="text-muted-foreground">{t('history.subtitle')}</p>
                </div>
                <div className="flex gap-3 items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScanFolder}
                        disabled={scanning}
                    >
                        {scanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {t('actions.scan')}
                    </Button>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder={t('history.searchPlaceholder')}
                            className="pl-9 w-full border rounded-md px-3 py-2 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <DataTable
                data={results}
                columns={columns}
                rowClassName={(row: Result) =>
                    row.status === 'FAILED' ? 'bg-red-50 hover:bg-red-100' :
                        row.status === 'IMPORTED' ? 'bg-blue-50/50 hover:bg-blue-100/50' :
                            row.status === 'EXPIRED' ? 'opacity-60 bg-slate-50' : ''
                }
            />

            {meta.lastPage > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
                    <div className="text-sm text-gray-700">
                        {t('common.total')}: <span className="font-medium">{meta.total}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            {t('common.previous')}
                        </Button>
                        <div className="flex items-center px-4 text-sm font-medium">
                            {page} / {meta.lastPage}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === meta.lastPage}
                            onClick={() => setPage(p => p + 1)}
                        >
                            {t('common.next')}
                        </Button>
                    </div>
                </div>
            )}

            <FixContactModal
                open={fixModalOpen}
                onClose={() => setFixModalOpen(false)}
                result={selectedResult}
                onSuccess={fetchResults}
            />

            <CompleteImportModal
                open={completeModalOpen}
                onClose={() => setCompleteModalOpen(false)}
                result={selectedResult}
                onSuccess={fetchResults}
            />

            <PreviewModal
                open={previewModalOpen}
                onClose={() => {
                    setPreviewModalOpen(false);
                    setPreviewUrl(null);
                }}
                url={previewUrl}
                title={selectedResult?.patientName || t('actions.preview')}
            />
        </div >
    );
}
