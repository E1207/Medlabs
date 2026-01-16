import * as React from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { Badge, DataTable, Modal, useToast } from '@/components/ui-dashboard';
import { Plus, Search, Filter, MoreHorizontal, Shield, Key, Ban, User as UserIcon, LogIn, Building2, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

interface GlobalUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: 'ACTIVE' | 'SUSPENDED';
    tenant?: {
        id: string;
        name: string;
    };
}

export function GlobalUsers() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const { impersonate } = useAuth();
    const [users, setUsers] = React.useState<GlobalUser[]>([]);
    const [search, setSearch] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState<string>('ALL');

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<GlobalUser | null>(null);

    // Form States
    const [formData, setFormData] = React.useState({
        firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN' as UserRole, tenantId: '' as string | undefined
    });
    const [tenants, setTenants] = React.useState<{ id: string, name: string }[]>([]);

    const fetchUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (roleFilter !== 'ALL') params.append('role', roleFilter);

            const res = await api.get(`/admin/users?${params.toString()}`);
            if (res.ok) setUsers(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTenants = async () => {
        const res = await api.get('/tenants');
        if (res.ok) setTenants(await res.json());
    };

    React.useEffect(() => {
        fetchUsers();
    }, [search, roleFilter]);

    React.useEffect(() => {
        if (isCreateOpen) fetchTenants();
    }, [isCreateOpen]);

    const handleCreate = async () => {
        try {
            const payload = { ...formData };
            if (payload.role === 'SUPER_ADMIN') {
                delete payload.tenantId; // Explicitly remove for SA
            }
            if (payload.role !== 'SUPER_ADMIN' && !payload.tenantId) {
                return addToast('Organization is required for this role', 'error');
            }

            const res = await api.post('/admin/users', payload);
            if (!res.ok) throw new Error((await res.json()).message);

            addToast('User created', 'success');
            setIsCreateOpen(false);
            setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN', tenantId: '' });
            fetchUsers();
        } catch (err: any) {
            addToast(err.message || 'Failed to create', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!selectedUser) return;
        try {
            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                role: formData.role,
                status: selectedUser.status // Status separate?
            };
            if (formData.password) payload.password = formData.password;

            const res = await api.patch(`/admin/users/${selectedUser.id}`, payload);
            if (!res.ok) throw new Error('Failed');

            addToast('User updated', 'success');
            setIsEditOpen(false);
            fetchUsers();
        } catch (err) {
            addToast('Update failed', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            addToast('User deleted', 'success');
            fetchUsers();
        } catch (err) {
            addToast('Delete failed', 'error');
        }
    };

    const handleImpersonate = async (userId: string) => {
        if (!confirm(t('users.impersonateConfirm'))) return;
        try {
            await impersonate(userId);
        } catch (error) {
            addToast('Failed to impersonate user', 'error');
        }
    };

    const openEdit = (user: GlobalUser) => {
        setSelectedUser(user);
        setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            password: '',
            role: user.role,
            tenantId: user.tenant?.id
        });
        setIsEditOpen(true);
    };

    const columns = [
        {
            key: 'user',
            header: t('users.table.user'),
            render: (row: GlobalUser) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                        {row.firstName?.[0]}{row.lastName?.[0]}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{row.firstName} {row.lastName}</div>
                        <div className="text-xs text-slate-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            header: t('users.table.role'),
            render: (row: GlobalUser) => {
                const colors = {
                    SUPER_ADMIN: 'purple',
                    LAB_ADMIN: 'blue',
                    TECHNICIAN: 'gray'
                };
                return <Badge variant={colors[row.role] as any}>{row.role.replace('_', ' ')}</Badge>;
            }
        },
        {
            key: 'tenant',
            header: t('users.table.organization'),
            render: (row: GlobalUser) => row.tenant ? (
                <div className="flex items-center gap-1 text-slate-700">
                    <Building2 className="w-3 h-3" /> {row.tenant.name}
                </div>
            ) : <span className="text-purple-600 font-medium text-xs">Platform Staff</span>
        },
        {
            key: 'status',
            header: t('users.table.status'),
            render: (row: GlobalUser) => (
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${row.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-slate-700 capitalize">{row.status.toLowerCase()}</span>
                </div>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (row: GlobalUser) => (
                <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleImpersonate(row.id)} title="Log in as this user">
                        <LogIn className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit2 className="w-4 h-4 text-slate-500" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('users.title')}</h1>
                    <p className="text-slate-500">{t('users.subtitle')}</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> {t('users.createButton')}
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder={t('users.searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="px-3 py-2 bg-slate-50 border rounded-lg text-sm font-medium text-slate-600 outline-none"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                >
                    <option value="ALL">{t('users.allRoles')}</option>
                    <option value="SUPER_ADMIN">Super Admins</option>
                    <option value="LAB_ADMIN">Lab Admins</option>
                    <option value="TECHNICIAN">Technicians</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <DataTable data={users} columns={columns} />
            </div>

            {/* CREATE MODAL */}
            <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New User">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Organization</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.tenantId}
                            onChange={e => {
                                const val = e.target.value;
                                setFormData({ ...formData, tenantId: val, role: val ? 'LAB_ADMIN' : 'SUPER_ADMIN' });
                            }}
                        >
                            <option value="">No Organization (Platform Staff)</option>
                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">First Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Initial Password</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                        >
                            {!formData.tenantId && <option value="SUPER_ADMIN">Super Admin</option>}
                            {formData.tenantId && (
                                <>
                                    <option value="LAB_ADMIN">Lab Admin</option>
                                    <option value="TECHNICIAN">Technician</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Create User</Button>
                    </div>
                </div>
            </Modal>

            {/* EDIT MODAL */}
            <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">First Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                        >
                            {!formData.tenantId && <option value="SUPER_ADMIN">Super Admin</option>}
                            {formData.tenantId && (
                                <>
                                    <option value="LAB_ADMIN">Lab Admin</option>
                                    <option value="TECHNICIAN">Technician</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="pt-2 border-t mt-2">
                        <label className="block text-sm font-medium mb-1 text-red-600">Danger Zone: Reset Password</label>
                        <input
                            className="w-full border border-red-200 bg-red-50 rounded-lg px-3 py-2"
                            placeholder="Enter new password to override..."
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
