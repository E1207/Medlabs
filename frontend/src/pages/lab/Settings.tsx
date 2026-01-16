import * as React from 'react';
import { Button } from '@/components/ui-basic';
import { Tabs, Modal, ProgressBar, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Key, Copy, Trash2, AlertTriangle, Upload } from 'lucide-react';

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

    // General Settings State
    const [labName, setLabName] = React.useState('Laboratoire Mvolyé');
    const [labAddress, setLabAddress] = React.useState('123 Rue du Centre, Yaoundé');
    const [retentionDays, setRetentionDays] = React.useState(30);

    React.useEffect(() => {
        // Fetch Tenant Settings
        fetch('/api/tenants/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.name) setLabName(data.name);
                if (data.address) setLabAddress(data.address);
                if (data.retentionDays) setRetentionDays(data.retentionDays);
            })
            .catch(err => console.error(err));
    }, []);

    const saveSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tenants/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: labName, // Assuming we can update name
                    address: labAddress, // Assuming we can update address
                    retentionDays
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update settings');
            }

            addToast('Settings saved successfully', 'success');
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
        addToast('API Key generated successfully', 'success');
    };

    const handleRevokeKey = (id: string) => {
        setApiKeys(apiKeys.filter((k) => k.id !== id));
        addToast('API Key revoked', 'info');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copied to clipboard', 'success');
    };

    const tabs = [
        {
            id: 'general',
            label: 'General',
            content: (
                <div className="space-y-6 max-w-xl">
                    <div>
                        <label className="block text-sm font-medium mb-1">Laboratory Name</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={labName}
                            onChange={(e) => setLabName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2"
                            rows={3}
                            value={labAddress}
                            onChange={(e) => setLabAddress(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Lab Logo</label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Displayed on patient portal and documents
                        </p>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG up to 2MB
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                            SMS Sender ID
                            <span className="text-muted-foreground" title="To change your Sender ID (e.g., LAB-NAME), please contact Support for telecom validation.">
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
                                Changing this name may require validation by telecom operators in Cameroon.
                                <strong> Please contact Support</strong> if SMS are blocked.
                            </span>
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="font-medium mb-3">File Availability Duration</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                            <Trash2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium">Automated Cleanup Policy</p>
                                <p>After this delay, PDF files are permanently deleted from the secure server to ensure data minimisation.</p>
                            </div>
                        </div>
                        <label className="block text-sm font-medium mb-1">Retention Period (Days)</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={retentionDays}
                            onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
                            min={1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Warning: Patients will need to contact the secretariat for a copy after this period.
                        </p>
                    </div>

                    <Button onClick={saveSettings}>
                        Save Changes
                    </Button>
                </div>
            ),
        },
        {
            id: 'api',
            label: 'API Keys',
            content: (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">SIL Integration Keys</h3>
                            <p className="text-sm text-muted-foreground">
                                Use these keys to integrate with your Laboratory Information System
                            </p>
                        </div>
                        <Button onClick={() => setNewKeyModalOpen(true)} className="gap-2">
                            <Key className="w-4 h-4" />
                            Generate New Key
                        </Button>
                    </div>

                    <div className="border rounded-lg divide-y">
                        {apiKeys.map((key) => (
                            <div key={key.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{key.name}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{key.prefix}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Created {key.createdAt} • {key.lastUsed ? `Last used ${key.lastUsed}` : 'Never used'}
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

                    {/* Generate Key Modal */}
                    <Modal
                        open={newKeyModalOpen}
                        onClose={() => {
                            setNewKeyModalOpen(false);
                            setGeneratedKey(null);
                            setNewKeyName('');
                        }}
                        title={generatedKey ? 'Save Your API Key' : 'Generate New API Key'}
                    >
                        {generatedKey ? (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-800">
                                        <p className="font-medium">Save this key now!</p>
                                        <p>You won't be able to see it again after closing this modal.</p>
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
                                    I've Saved My Key
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Key Name</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="e.g., SIL Production"
                                    />
                                </div>
                                <Button onClick={handleGenerateKey} className="w-full">
                                    Generate Key
                                </Button>
                            </div>
                        )}
                    </Modal>
                </div>
            ),
        },
        {
            id: 'sms',
            label: 'SMS Quota',
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-white border rounded-lg p-6">
                        <h3 className="font-medium mb-4">SMS Credits</h3>
                        <ProgressBar value={smsUsed} max={smsTotal} label="Credits Used" showWarning />
                        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-2xl font-bold">{smsTotal - smsUsed}</p>
                                <p className="text-sm text-muted-foreground">Remaining</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-2xl font-bold">{smsUsed}</p>
                                <p className="text-sm text-muted-foreground">Used This Month</p>
                            </div>
                        </div>
                    </div>

                    {(smsTotal - smsUsed) < 100 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-800">Low Balance Warning</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    You have less than 100 SMS credits remaining. Contact support to purchase more.
                                </p>
                                <Button className="mt-3 bg-amber-600 hover:bg-amber-700">
                                    Request More Credits
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                        <p>• 1 SMS = 1 credit (up to 160 characters)</p>
                        <p>• Credits are shared across all team members</p>
                        <p>• Contact support@medlab.com to purchase additional credits</p>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    {user?.role === 'SUPER_ADMIN' ? 'Global Settings' : 'Lab Settings'}
                </h1>
                <p className="text-muted-foreground">
                    Manage your laboratory configuration and integrations
                </p>
            </div>

            <Tabs tabs={tabs} defaultTab="general" />
        </div>
    );
}
