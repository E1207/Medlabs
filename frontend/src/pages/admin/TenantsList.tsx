import * as React from 'react';
import { Button } from '@/components/ui-basic';
import { Badge, Modal, DataTable, StatCard, useToast } from '@/components/ui-dashboard';
import { Building2, Plus, Users, MessageSquare } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    smsBalance: number;
    smsSenderId: string;
    createdAt: string;
    usersCount: number;
}

// Mock data
const MOCK_TENANTS: Tenant[] = [
    { id: '1', name: 'Laboratoire Mvolyé', slug: 'labo-mvolye', isActive: true, smsBalance: 450, smsSenderId: 'MEDLAB', createdAt: '2025-12-01', usersCount: 5 },
    { id: '2', name: 'Centre Médical Bassa', slug: 'cm-bassa', isActive: true, smsBalance: 120, smsSenderId: 'MEDRESULT', createdAt: '2025-11-15', usersCount: 3 },
    { id: '3', name: 'Clinique Universitaire', slug: 'clinique-univ', isActive: false, smsBalance: 0, smsSenderId: 'MEDLAB', createdAt: '2025-10-01', usersCount: 8 },
];

export function TenantsList() {
    const { addToast } = useToast();
    const [tenants, setTenants] = React.useState<Tenant[]>(MOCK_TENANTS);
    const [createModalOpen, setCreateModalOpen] = React.useState(false);
    const [configModalOpen, setConfigModalOpen] = React.useState(false);
    const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null);

    const [formData, setFormData] = React.useState({
        name: '',
        slug: '',
        niu: '',
        rccm: '',
        contactEmail: '',
        initialSmsQuota: 100,
    });

    const [configData, setConfigData] = React.useState({
        smsSenderId: '',
        smsTopup: 0,
    });

    const handleCreate = async () => {
        const newTenant: Tenant = {
            id: Date.now().toString(),
            name: formData.name,
            slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: true,
            smsBalance: formData.initialSmsQuota,
            smsSenderId: 'MEDLAB', // Default
            createdAt: new Date().toISOString().split('T')[0],
            usersCount: 0,
        };

        setTenants([...tenants, newTenant]);
        setCreateModalOpen(false);
        setFormData({ name: '', slug: '', niu: '', rccm: '', contactEmail: '', initialSmsQuota: 100 });
        addToast(`Tenant "${newTenant.name}" created successfully`, 'success');
    };

    const handleOpenConfig = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setConfigData({
            smsSenderId: tenant.smsSenderId,
            smsTopup: 0,
        });
        setConfigModalOpen(true);
    };

    const handleSaveConfig = () => {
        if (!selectedTenant) return;

        // Validation: Max 11 alphanumeric chars
        const senderIdRegex = /^[a-zA-Z0-9]{3,11}$/;
        if (!senderIdRegex.test(configData.smsSenderId)) {
            addToast('Sender ID must be 3-11 alphanumeric characters.', 'error');
            return;
        }

        setTenants(tenants.map(t =>
            t.id === selectedTenant.id
                ? {
                    ...t,
                    smsSenderId: configData.smsSenderId,
                    smsBalance: t.smsBalance + configData.smsTopup
                }
                : t
        ));

        setConfigModalOpen(false);
        addToast(`Configuration for ${selectedTenant.name} updated`, 'success');
    };

    const columns = [
        { key: 'name', header: 'Laboratory Name' },
        {
            key: 'smsSenderId',
            header: 'Sender ID',
            render: (row: Tenant) => (
                <code className="text-xs font-mono bg-gray-100 px-1 rounded">{row.smsSenderId}</code>
            )
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (row: Tenant) => (
                <Badge variant={row.isActive ? 'success' : 'danger'}>
                    {row.isActive ? 'Active' : 'Suspended'}
                </Badge>
            ),
        },
        {
            key: 'smsBalance',
            header: 'SMS Balance',
            render: (row: Tenant) => (
                <span className={row.smsBalance < 100 ? 'text-amber-600 font-medium' : ''}>
                    {row.smsBalance} credits
                </span>
            ),
        },
        {
            key: 'id',
            header: '',
            render: (row: Tenant) => (
                <Button variant="ghost" className="h-8 py-0 px-2" onClick={() => handleOpenConfig(row)}>
                    Configure
                </Button>
            )
        }
    ];

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.isActive).length;
    const totalSmsBalance = tenants.reduce((sum, t) => sum + t.smsBalance, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tenant Management</h1>
                    <p className="text-muted-foreground">Manage all registered laboratories</p>
                </div>
                <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Tenant
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Tenants" value={totalTenants} icon={<Building2 className="w-8 h-8" />} />
                <StatCard title="Active Tenants" value={activeTenants} icon={<Users className="w-8 h-8" />} />
                <StatCard title="Total SMS Credits" value={totalSmsBalance} icon={<MessageSquare className="w-8 h-8" />} />
            </div>

            {/* Table */}
            <DataTable data={tenants} columns={columns} />

            {/* Create Modal */}
            <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Tenant">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Laboratory Name *</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Laboratoire Mvolyé"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Slug</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="labo-mvolye"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">NIU (Tax ID)</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.niu}
                                onChange={(e) => setFormData({ ...formData, niu: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">RCCM</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.rccm}
                                onChange={(e) => setFormData({ ...formData, rccm: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Contact Email *</label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            placeholder="contact@labo.cm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Initial SMS Quota</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.initialSmsQuota}
                            onChange={(e) => setFormData({ ...formData, initialSmsQuota: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setCreateModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300">
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} className="flex-1" disabled={!formData.name || !formData.contactEmail}>
                            Create Tenant
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Config Modal */}
            <Modal open={configModalOpen} onClose={() => setConfigModalOpen(false)} title={`Edit Config: ${selectedTenant?.name}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">SMS Sender ID</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 uppercase font-mono"
                            maxLength={11}
                            value={configData.smsSenderId}
                            onChange={(e) => setConfigData({ ...configData, smsSenderId: e.target.value.toUpperCase() })}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-amber-600">
                            Warning: Only change this after obtaining Sender ID whitelisting from the Telecom Operator.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Add SMS Credits</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={configData.smsTopup}
                            onChange={(e) => setConfigData({ ...configData, smsTopup: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Current Balance: {selectedTenant?.smsBalance} credits
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setConfigModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveConfig} className="flex-1">
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
