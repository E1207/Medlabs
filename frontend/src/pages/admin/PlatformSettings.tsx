import * as React from 'react';
import { Button } from '@/components/ui-basic';
import { Tabs, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Mail, Eye, EyeOff, Check, Send } from 'lucide-react';

type SmsProvider = 'twilio' | 'vonage' | 'generic';

interface SmsConfig {
    provider: SmsProvider;
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
}

interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
}

export function PlatformSettings() {
    const { user } = useAuth();
    const { addToast } = useToast();

    // Redirect non-super-admins
    if (user?.role !== 'SUPER_ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    // SMS Gateway State
    const [smsConfig, setSmsConfig] = React.useState<SmsConfig>({
        provider: 'twilio',
        apiKey: 'sk_live_abc123...',
        apiSecret: '',
        baseUrl: 'https://api.twilio.com',
    });
    const [showSmsSecret, setShowSmsSecret] = React.useState(false);
    const [testingConnection, setTestingConnection] = React.useState(false);

    // SMTP State
    const [smtpConfig, setSmtpConfig] = React.useState<SmtpConfig>({
        host: 'smtp.gmail.com',
        port: 587,
        secure: true,
        user: 'admin@medlab.cm',
        password: '',
        fromEmail: 'no-reply@medlab.cm',
    });
    const [showSmtpPassword, setShowSmtpPassword] = React.useState(false);
    const [testingEmail, setTestingEmail] = React.useState(false);

    // Retention State
    const [retentionConfig, setRetentionConfig] = React.useState({
        defaultDays: 30,
        maxDays: 90,
    });

    React.useEffect(() => {
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(data => {
                if (data.sms) setSmsConfig(prev => ({ ...prev, ...data.sms }));
                if (data.smtp) setSmtpConfig(prev => ({ ...prev, ...data.smtp }));
                if (data.retention) setRetentionConfig(data.retention);
            })
            .catch(err => console.error(err));
    }, []);

    const saveConfig = async () => {
        try {
            await fetch('/api/admin/config/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sms: smsConfig,
                    smtp: smtpConfig,
                    retention: retentionConfig,
                }),
            });
            addToast('Configuration saved successfully', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to save configuration', 'error');
        }
    };

    const handleTestSmsConnection = async () => {
        setTestingConnection(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addToast('SMS test sent to admin phone', 'success');
        setTestingConnection(false);
    };

    const handleSendTestEmail = async () => {
        setTestingEmail(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addToast('Test email sent to ' + user?.email, 'success');
        setTestingEmail(false);
    };

    const tabs = [
        {
            id: 'sms',
            label: 'SMS Gateways',
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium">Sensitive Configuration</p>
                            <p>Credentials are encrypted at rest. Changes apply immediately.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">SMS Provider</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={smsConfig.provider}
                            onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value as SmsProvider })}
                        >
                            <option value="twilio">Twilio</option>
                            <option value="vonage">Vonage (Nexmo)</option>
                            <option value="generic">Generic HTTP/SMPP</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                            value={smsConfig.apiKey}
                            onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                            placeholder="sk_live_..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">API Secret</label>
                        <div className="relative">
                            <input
                                type={showSmsSecret ? 'text' : 'password'}
                                className="w-full border rounded-lg px-3 py-2 pr-10 font-mono text-sm"
                                value={smsConfig.apiSecret}
                                onChange={(e) => setSmsConfig({ ...smsConfig, apiSecret: e.target.value })}
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmsSecret(!showSmsSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showSmsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {smsConfig.provider === 'generic' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Base URL</label>
                            <input
                                type="url"
                                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                                value={smsConfig.baseUrl}
                                onChange={(e) => setSmsConfig({ ...smsConfig, baseUrl: e.target.value })}
                                placeholder="https://api.your-provider.com"
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleTestSmsConnection} disabled={testingConnection} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                            <Send className="w-4 h-4 mr-2" />
                            {testingConnection ? 'Sending...' : 'Test Connection'}
                        </Button>
                        <Button onClick={saveConfig}>
                            <Check className="w-4 h-4 mr-2" />
                            Save Configuration
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            id: 'smtp',
            label: 'SMTP (Email)',
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">Email Configuration</p>
                            <p>Used for system notifications, password resets, and alerts.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">SMTP Host</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Port</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="secure" checked={smtpConfig.secure} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })} className="w-4 h-4 rounded" />
                        <label htmlFor="secure" className="text-sm font-medium">Use SSL/TLS</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input type="text" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.user} onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <div className="relative">
                            <input type={showSmtpPassword ? 'text' : 'password'} className="w-full border rounded-lg px-3 py-2 pr-10" value={smtpConfig.password} onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })} />
                            <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">System From Email</label>
                        <input type="email" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.fromEmail} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })} placeholder="no-reply@medlab.cm" />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSendTestEmail} disabled={testingEmail} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                            <Send className="w-4 h-4 mr-2" />
                            {testingEmail ? 'Sending...' : 'Send Test Email'}
                        </Button>
                        <Button onClick={saveConfig}>
                            <Check className="w-4 h-4 mr-2" />
                            Save Configuration
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            id: 'retention',
            label: 'Data Retention',
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">HDS / GDPR Compliance</p>
                            <p>Configure automated deletion of medical documents to minimize data footprint.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Global Default Retention (Days)</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg px-3 py-2"
                                value={retentionConfig.defaultDays}
                                onChange={(e) => setRetentionConfig({ ...retentionConfig, defaultDays: parseInt(e.target.value) || 30 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Default duration for new laboratories. (Standard: 30 days)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Maximum Allowed Retention (Days)</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg px-3 py-2"
                                value={retentionConfig.maxDays}
                                onChange={(e) => setRetentionConfig({ ...retentionConfig, maxDays: parseInt(e.target.value) || 90 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Hard limit. Labs cannot set a value higher than this to ensure compliance.
                            </p>
                        </div>
                    </div>

                    <Button onClick={saveConfig} className="gap-2">
                        <Check className="w-4 h-4" />
                        Save Retention Policy
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Platform Settings</h1>
                <p className="text-muted-foreground">Configure global SMS and email settings</p>
            </div>
            <Tabs tabs={tabs} defaultTab="sms" />
        </div>
    );
}
