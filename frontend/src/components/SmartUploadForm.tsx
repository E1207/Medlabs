import { useState, useCallback } from 'react';
import { UploadCloud, FileCheck, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from './ui-basic';
import { useTranslation } from 'react-i18next';
import * as pdfjsLib from 'pdfjs-dist';

// Worker configuration
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface FormData {
    folderRef: string;
    firstName: string;
    lastName: string;
    dob: string;
    email: string;
    phone: string;
}

export function SmartUploadForm() {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<FormData>({
        folderRef: '',
        firstName: '',
        lastName: '',
        dob: '',
        email: '',
        phone: ''
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragging(true);
        } else if (e.type === 'dragleave') {
            setDragging(false);
        }
    }, []);

    const parsePdf = async (file: File) => {
        setParsing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Extract text from page 1
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');

            console.log('Parsed Text:', text);

            // Regex Matchers
            // Strategy: Prioritize context-based matching to avoid "Print Date" false positives.
            // 1. Look for "Né le", "Né(e) le", "Date de naissance", "DDN"
            const bornDatePatterns = [
                /N[ée](?:e)?\s+(?:le)?\s*[:.]?\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/i,
                /Date\s+de\s+naissance\s*[:.]?\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/i,
                /D\.?D\.?N\.?\s*[:.]?\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/i,
                // Fallback: Look for date widely separated from "Today" or specific keywords if needed. 
                // For now, we strictly avoid bare date matching to satisfy the "False Positive" requirement.
            ];

            let foundDob = '';
            for (const pattern of bornDatePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    foundDob = match[1];
                    break;
                }
            }

            setForm(prev => ({
                ...prev,
                dob: foundDob || prev.dob,
            }));

        } catch (err) {
            console.error(err);
            setError(t('errors.parsing'));
        } finally {
            setParsing(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        setError(null);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];

            if (droppedFile.type !== 'application/pdf') {
                setError(t('errors.pdf_only'));
                return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) { // 10MB
                setError(t('errors.file_size'));
                return;
            }

            setFile(droppedFile);
            parsePdf(droppedFile);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selFile = e.target.files[0];
            if (selFile.type !== 'application/pdf') {
                setError(t('errors.pdf_only'));
                return;
            }
            setFile(selFile);
            parsePdf(selFile);
        }
    };

    const validatePhone = (phone: string) => {
        return /^\+237[6]\d{8}$/.test(phone) || /^\+[1-9]\d{1,14}$/.test(phone);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validatePhone(form.phone)) {
            setError(t('errors.invalid_phone'));
            return;
        }
        if (!file) {
            setError(t('errors.no_file'));
            return;
        }

        if (!form.dob) {
            setError(t('errors.required'));
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderRef', form.folderRef);
        formData.append('patientPhone', form.phone);
        formData.append('patientEmail', form.email);
        formData.append('patientName', `${form.firstName} ${form.lastName}`);
        // Convert DD/MM/YYYY to ISO if needed, or send as is strictly.
        // Assuming backend handles ISO or specific format. Let's convert to ISO YYYY-MM-DD
        const [day, month, year] = form.dob.split(/[\/\-.]/);
        if (day && month && year) {
            formData.append('patientDob', `${year}-${month}-${day}`);
        } else {
            formData.append('patientDob', form.dob); // Fallback
        }

        try {
            // Mock API call
            const response = await fetch('http://localhost:3000/results', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || t('errors.upload_failed'));
            }

            setSuccess(true);
            setFile(null);
            setForm({
                folderRef: '',
                firstName: '',
                lastName: '',
                dob: '',
                email: '',
                phone: ''
            });

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setSuccess(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mt-10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="w-6 h-6 text-primary" />
                    {t('upload.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
                        <FileCheck className="w-5 h-5" />
                        <span>{t('upload.success')}</span>
                        <button onClick={() => setSuccess(false)} className="ml-auto p-1 hover:bg-green-100 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {!file ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`
                            border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
                            ${dragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
                        `}
                    >
                        <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <UploadCloud className={`w-12 h-12 mb-4 ${dragging ? 'text-primary' : 'text-gray-400'}`} />
                            <p className="text-lg font-medium text-gray-700">{t('upload.dragDrop')}</p>
                            <p className="text-sm text-gray-500 mt-1">{t('upload.browse')}</p>
                        </label>
                    </div>
                ) : (
                    <div className="flex items-center p-4 bg-gray-50 border rounded-lg mb-6">
                        <FileCheck className="w-8 h-8 text-blue-500 mr-3" />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {parsing && <span className="text-xs text-blue-500 mr-3 animate-pulse">{t('upload.parsing')}</span>}
                        <button onClick={removeFile} className="text-gray-400 hover:text-red-500 p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="folderRef">{t('upload.folderRef')} *</Label>
                            <Input
                                id="folderRef"
                                required
                                value={form.folderRef}
                                onChange={e => setForm({ ...form, folderRef: e.target.value })}
                                placeholder="DOS-2024-..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dob">{t('upload.dob')} *</Label>
                            <Input
                                id="dob"
                                required
                                value={form.dob}
                                onChange={e => setForm({ ...form, dob: e.target.value })}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t('upload.firstName')}</Label>
                            <Input
                                id="firstName"
                                value={form.firstName}
                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t('upload.lastName')}</Label>
                            <Input
                                id="lastName"
                                value={form.lastName}
                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('upload.email')} *</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="patient@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex justify-between">
                                <span>{t('upload.phone')} *</span>
                                <span className="text-xs text-gray-500 font-normal">Strict E.164 (+237...)</span>
                            </Label>
                            <Input
                                id="phone"
                                required
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="+237 6..."
                                className={form.phone && !validatePhone(form.phone) ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {form.phone && !validatePhone(form.phone) && (
                                <p className="text-xs text-red-500">{t('errors.invalid_phone')}</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={loading || !file || !validatePhone(form.phone) || !form.dob}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {loading ? t('upload.btn_uploading') : t('upload.btn_send')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
