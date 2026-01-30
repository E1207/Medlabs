import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { Button } from './ui-basic';
import { useTranslation } from 'react-i18next';

interface PreviewModalProps {
    open: boolean;
    onClose: () => void;
    url: string | null;
    title?: string;
}

export function PreviewModal({ open, onClose, url, title }: PreviewModalProps) {
    const { t } = useTranslation();

    // Revoke object URL on unmount to prevent memory leaks
    React.useEffect(() => {
        return () => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        };
    }, [url]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <ExternalLink className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{title || t('actions.preview')}</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Document Médical Sécurisé</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(url!, '_blank')}
                            className="hidden sm:flex"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {t('common.openExternal')}
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body - PDF Viewer */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden">
                    {url ? (
                        <iframe
                            src={`${url}#toolbar=0`}
                            className="w-full h-full border-none shadow-inner"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>

                {/* Footer / Safety Notice */}
                <div className="p-3 border-t bg-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <p>Ce document est crypté et protégé par le secret médical. Toute reproduction est interdite.</p>
                    <p>MedLabs Sécure v1.0</p>
                </div>
            </div>
        </div>
    );
}
