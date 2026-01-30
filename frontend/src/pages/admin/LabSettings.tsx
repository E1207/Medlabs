import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useToast, Button } from '@/components';
import {
    Shield,
    Clock,
    Database,
    Save,
    Globe,
    Phone,
    Building,
    Info,
    AlertCircle
} from 'lucide-react';

interface TenantSettings {
    id: string;
    name: string;
    address: string | null;
    configuredRetentionDays: number;
    maxRetentionDays: number;
    importFolderPath: string | null;
    smsSenderId: string;
}

export function LabSettings() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<TenantSettings | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/tenants/me');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            addToast(t('errors.fetch_failed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setSaving(true);
        try {
            const res = await api.patch('/tenants/me', {
                name: settings.name,
                address: settings.address,
                configuredRetentionDays: settings.configuredRetentionDays,
                importFolderPath: settings.importFolderPath,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Update failed');
            }

            addToast(t('common.success'), 'success');
        } catch (error: any) {
            addToast(error.message || t('errors.update_failed'), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
                <p className="text-slate-500">{t('settings.subtitle')}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* General Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <Building className="w-5 h-5 text-slate-500" />
                        <h2 className="font-semibold text-slate-700">{t('settings.tabs.general')}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('settings.general.name')}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={settings.name}
                                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('settings.general.senderId')}</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 cursor-not-allowed text-slate-500"
                                        value={settings.smsSenderId}
                                        disabled
                                    />
                                    <div className="absolute right-3 top-2.5">
                                        <Info className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400 italic">
                                        {t('settings.general.senderIdHint')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('settings.general.address')}</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                rows={2}
                                value={settings.address || ''}
                                onChange={e => setSettings({ ...settings, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Retention Policy */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-slate-700">{t('settings.general.retention.title')}</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-blue-900">{t('settings.general.retention.policy')}</h3>
                                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                                    {t('settings.general.retention.policyDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-bold text-slate-800">{t('settings.general.retention.label')}</label>
                                    <p className="text-xs text-slate-500">{t('settings.general.retention.hint')}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        className="px-4 py-2 border rounded-lg font-bold text-blue-600 bg-white"
                                        value={settings.configuredRetentionDays}
                                        onChange={e => setSettings({ ...settings, configuredRetentionDays: parseInt(e.target.value) })}
                                    >
                                        {[7, 15, 30, 60, 90].map(days => (
                                            <option key={days} value={days} disabled={days > settings.maxRetentionDays}>
                                                {days} {t('common.days')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 border-t text-[11px] text-slate-400 flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{t('settings.general.retention.max', { days: settings.maxRetentionDays })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIL / Local Import */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-semibold text-slate-700">{t('settings.general.import.title')}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-500 italic">
                            {t('settings.general.import.desc')}
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('settings.general.import.pathLabel')}</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder={t('settings.general.import.hint')}
                                value={settings.importFolderPath || ''}
                                onChange={e => setSettings({ ...settings, importFolderPath: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        className="px-8 py-2.5"
                        disabled={saving}
                    >
                        {saving ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                {t('common.loading')}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                {t('common.save')}
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
