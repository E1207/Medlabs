import React, { useState } from 'react';
import { Modal, useToast } from './ui-dashboard';
import { Button, Input, Label } from './ui-basic';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Calendar, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface CompleteImportModalProps {
    open: boolean;
    onClose: () => void;
    result: {
        id: string;
        patientName: string;
        folderRef: string;
        patientPhone?: string;
        patientEmail?: string;
        patientDob?: string;
    } | null;
    onSuccess: () => void;
}

export function CompleteImportModal({ open, onClose, result, onSuccess }: CompleteImportModalProps) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        patientPhone: '',
        patientEmail: '',
        patientDob: ''
    });

    React.useEffect(() => {
        if (result) {
            setFormData({
                patientPhone: result.patientPhone || '',
                patientEmail: result.patientEmail || '',
                patientDob: result.patientDob ? new Date(result.patientDob).toISOString().split('T')[0] : ''
            });
        }
    }, [result]);

    const handleSubmit = async () => {
        if (!result) return;
        setLoading(true);
        try {
            const res = await api.patch(`/results/${result.id}/complete`, {
                patientPhone: formData.patientPhone,
                patientEmail: formData.patientEmail,
                patientDob: formData.patientDob,
                patientName: result.patientName, // Add this to match DTO
                folderRef: result.folderRef
            });

            if (!res.ok) throw new Error('Failed to complete dossier');

            addToast(t('common.success'), 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            addToast(t('errors.failed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('results.actions.complete')}
        >
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="text-sm font-semibold text-blue-900">{result?.patientName}</div>
                    <div className="text-xs text-blue-700 font-mono">Ref: {result?.folderRef}</div>
                </div>

                <div className="space-y-2">
                    <Label>{t('upload.phone')}</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="+237..."
                            value={formData.patientPhone}
                            onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('upload.email')}</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="email"
                            className="pl-9"
                            placeholder="patient@email.com"
                            value={formData.patientEmail}
                            onChange={(e) => setFormData(prev => ({ ...prev, patientEmail: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('upload.dob')}</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            className="pl-9"
                            value={formData.patientDob}
                            onChange={(e) => setFormData(prev => ({ ...prev, patientDob: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !formData.patientPhone}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {t('upload.btn_send')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
