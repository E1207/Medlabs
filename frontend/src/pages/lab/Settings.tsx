import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui-basic';
import { Tabs, Modal, ProgressBar, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Key, Copy, Trash2, AlertTriangle, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsed: string | null;
}

export function Settings() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const location = useLocation();

    // Determine default tab from URL
    const getInitialTab = () => {
        if (location.pathname.includes('/sms')) return 'sms';
        if (location.pathname.includes('/api')) return 'api';
        return 'general';
    };

    // General Settings State
    const [labName, setLabName] = React.useState('Laboratoire Mvolyé');
    const [labAddress, setLabAddress] = React.useState('123 Rue du Centre, Yaoundé');
    const [configuredRetentionDays, setConfiguredRetentionDays] = React.useState(30);
    const [maxRetentionDays, setMaxRetentionDays] = React.useState(30); // Limite du contrat

    React.useEffect(() => {
        // Fetch Tenant Settings
        fetch('/api/tenants/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.name) setLabName(data.name);
                if (data.address) setLabAddress(data.address);
                if (data.configuredRetentionDays) setConfiguredRetentionDays(data.configuredRetentionDays);
                if (data.maxRetentionDays) setMaxRetentionDays(data.maxRetentionDays);
            })
            .catch(err => console.error(err));
    }, []);

    const saveSettings = async () => {
        // Validation: configuredRetentionDays must be <= maxRetentionDays
        if (configuredRetentionDays > maxRetentionDays) {
            addToast(t('settings.general.retention.limitError', { days: maxRetentionDays }), 'error');
            return;
        }
        if (configuredRetentionDays < 7) {
            addToast(t('settings.general.retention.minError'), 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tenants/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: labName,
                    address: labAddress,
                    configuredRetentionDays: configuredRetentionDays
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update settings');
            }

            addToast(t('common.success'), 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message, 'error');
        }
    };

    // API Keys State
    const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([
        { id: '1', name: 'SIL Integration', prefix: 'sk_live_abc1...', createdAt: '2025-12-01', lastUsed: '2025-12-15' },
        { id: '2', name: 'Test Key', prefix: 'sk_test_xyz2...', createdAt: '2025-11-15', lastUsed: null },
    ]);
    const [newKeyModalOpen, setNewKeyModalOpen] = React.useState(false);
    const [newKeyName, setNewKeyName] = React.useState('');
    const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);

    // SMS State
    const smsUsed = 450;
    const smsTotal = 1000;

    const handleGenerateKey = () => {
        // Mock key generation
        const key = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        setGeneratedKey(key);
        setApiKeys([
            ...apiKeys,
            {
                id: Date.now().toString(),
                name: newKeyName || 'New API Key',
                prefix: `${key.substring(0, 12)}...`,
                createdAt: new Date().toISOString().split('T')[0],
                lastUsed: null,
            },
        ]);
        addToast(t('settings.api.modal.success'), 'success');
    };

    const handleRevokeKey = (id: string) => {
        setApiKeys(apiKeys.filter((k) => k.id !== id));
        addToast(t('settings.api.table.revoked'), 'info');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('common.copied'), 'success');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    {user?.role === 'SUPER_ADMIN' ? t('platform.title') : t('settings.title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('settings.subtitle')}
                </p>
            </div>

            <Tabs key={getInitialTab()} tabs={[
                {
                    id: 'general',
                    label: t('settings.tabs.general'),
                    content: (
                        <div className="space-y-6 max-w-xl">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.name')}</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={labName}
                                    onChange={(e) => setLabName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.address')}</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={3}
                                    value={labAddress}
                                    onChange={(e) => setLabAddress(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.logo')}</label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    {t('settings.general.logoDesc')}
                                </p>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {t('upload.dragDrop')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('settings.general.logoHint')}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                                    {t('settings.general.senderId')}
                                    <span className="text-muted-foreground" title={t('settings.general.senderIdHint')}>
                                        <Key className="w-3.5 h-3.5" />
                                    </span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-muted-foreground font-mono cursor-not-allowed"
                                        value="MEDLAB"
                                        disabled
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Key className="w-4 h-4 opacity-50" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span>
                                        {t('settings.general.senderIdHint')}
                                    </span>
                                </p>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-medium mb-3">{t('settings.general.retention.title')}</h3>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                                    <Trash2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium">{t('settings.general.retention.policy')}</p>
                                        <p>{t('settings.general.retention.policyDesc')}</p>
                                    </div>
                                </div>
                                <label className="block text-sm font-medium mb-2">{t('settings.general.retention.label')}</label>
                                <div className="space-y-3">
                                    <input
                                        type="range"
                                        min={7}
                                        max={maxRetentionDays}
                                        value={configuredRetentionDays}
                                        onChange={(e) => setConfiguredRetentionDays(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{t('settings.general.retention.min')}</span>
                                        <span className="text-lg font-bold text-blue-600">{configuredRetentionDays} {t('common.days') || 'jours'}</span>
                                        <span>{t('settings.general.retention.max', { days: maxRetentionDays })}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
                                    {t('settings.general.retention.hint')}
                                </p>
                            </div>

                            <Button onClick={saveSettings}>
                                {t('common.save')}
                            </Button>
                        </div>
                    ),
                },
                {
                    id: 'api',
                    label: t('settings.tabs.api'),
                    content: (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{t('settings.api.title')}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('settings.api.subtitle')}
                                    </p>
                                </div>
                                <Button onClick={() => setNewKeyModalOpen(true)} className="gap-2">
                                    <Key className="w-4 h-4" />
                                    {t('settings.api.btn_generate')}
                                </Button>
                            </div>

                            <div className="border rounded-lg divide-y">
                                {apiKeys.map((key) => (
                                    <div key={key.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{key.name}</p>
                                            <p className="text-sm text-muted-foreground font-mono">{key.prefix}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('settings.api.table.info', { date: key.createdAt, used: key.lastUsed ? `Last used ${key.lastUsed}` : 'Never used' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeKey(key.id)}
                                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <Modal
                                open={newKeyModalOpen}
                                onClose={() => {
                                    setNewKeyModalOpen(false);
                                    setGeneratedKey(null);
                                    setNewKeyName('');
                                }}
                                title={generatedKey ? t('settings.api.modal.save') : t('settings.api.modal.create')}
                            >
                                {generatedKey ? (
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800">
                                                <p className="font-medium">{t('settings.api.modal.save')}</p>
                                                <p>{t('settings.api.modal.saveDesc')}</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm break-all flex items-center gap-2">
                                            <span className="flex-1">{generatedKey}</span>
                                            <button onClick={() => copyToClipboard(generatedKey)} className="p-1 hover:bg-gray-200 rounded">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setNewKeyModalOpen(false);
                                                setGeneratedKey(null);
                                                setNewKeyName('');
                                            }}
                                            className="w-full"
                                        >
                                            {t('settings.api.modal.btn_confirm')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('settings.api.modal.name')}</label>
                                            <input
                                                type="text"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                placeholder="e.g., SIL Production"
                                            />
                                        </div>
                                        <Button onClick={handleGenerateKey} className="w-full">
                                            {t('settings.api.btn_generate')}
                                        </Button>
                                    </div>
                                )}
                            </Modal>
                        </div>
                    ),
                },
                {
                    id: 'sms',
                    label: t('settings.tabs.sms'),
                    content: (
                        <div className="space-y-6 max-w-xl">
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-medium mb-4">{t('settings.sms.title')}</h3>
                                <ProgressBar value={smsUsed} max={smsTotal} label={t('settings.sms.used')} showWarning />
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold">{smsTotal - smsUsed}</p>
                                        <p className="text-sm text-muted-foreground">{t('settings.sms.remaining')}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold">{smsUsed}</p>
                                        <p className="text-sm text-muted-foreground">{t('settings.sms.thisMonth')}</p>
                                    </div>
                                </div>
                            </div>

                            {(smsTotal - smsUsed) < 100 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800">{t('settings.sms.warning')}</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            {t('settings.sms.warningDesc')}
                                        </p>
                                        <Button className="mt-3 bg-amber-600 hover:bg-amber-700">
                                            {t('settings.sms.btn_recharge')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-muted-foreground">
                                <p>{t('settings.sms.hint')}</p>
                            </div>
                        </div>
                    ),
                },
            ]} defaultTab={getInitialTab()} />
        </div>
    );
}
