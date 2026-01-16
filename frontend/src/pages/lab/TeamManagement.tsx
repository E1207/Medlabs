
import * as React from 'react';
import { Plus, Search, MoreHorizontal, Mail, Shield, User, Ban, CheckCircle } from 'lucide-react';
import { DataTable, Badge, Modal } from '../../components/ui-dashboard';
import { useAuth } from '../../context/AuthContext';

interface TeamMember {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'TECHNICIAN' | 'VIEWER' | 'LAB_ADMIN';
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
    lastLoginAt: string | null;
}

export function TeamManagement() {
    const { user } = useAuth();
    const [members, setMembers] = React.useState<TeamMember[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [showInviteModal, setShowInviteModal] = React.useState(false);

    // Form State
    const [inviteForm, setInviteForm] = React.useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'TECHNICIAN' as const,
    });

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/users?search=${search}`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (error) {
            console.error('Failed to fetch team', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchMembers();
    }, [search]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inviteForm, tenantId: user?.tenantId }),
            });
            if (res.ok) {
                setShowInviteModal(false);
                fetchMembers();
                setInviteForm({ email: '', firstName: '', lastName: '', role: 'TECHNICIAN' });
            }
        } catch (error) {
            console.error('Invite failed', error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
        if (!confirm('Are you sure you want to change the status of this user?')) return;
        try {
            await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchMembers();
        } catch (err) {
            console.error(err);
        }
    };

    const handleResetPassword = async (id: string) => {
        if (!confirm('Send password reset email to this user?')) return;
        try {
            await fetch(`/api/users/${id}/reset-password`, { method: 'POST' });
            alert('Reset link sent!');
        } catch (err) {
            console.error(err);
        }
    };

    const columns = [
        {
            header: 'Name',
            key: 'firstName',
            render: (row: TeamMember) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                        {row.firstName[0]}{row.lastName[0]}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{row.firstName} {row.lastName}</div>
                        <div className="text-xs text-slate-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            key: 'role',
            render: (row: TeamMember) => {
                const colors = {
                    LAB_ADMIN: 'bg-purple-100 text-purple-700',
                    TECHNICIAN: 'bg-blue-100 text-blue-700',
                    VIEWER: 'bg-gray-100 text-gray-700'
                };
                return <Badge className={colors[row.role] || ''}>{row.role}</Badge>;
            }
        },
        {
            header: 'Status',
            key: 'status',
            render: (row: TeamMember) => {
                const variants: any = {
                    ACTIVE: 'success',
                    INVITED: 'warning',
                    SUSPENDED: 'danger'
                };
                return <Badge variant={variants[row.status]}>{row.status}</Badge>;
            }
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (row: TeamMember) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleResetPassword(row.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                        title="Reset Password"
                    >
                        <Mail className="w-4 h-4" />
                    </button>
                    {row.role !== 'LAB_ADMIN' && (
                        row.status === 'SUSPENDED' ? (
                            <button
                                onClick={() => handleStatusChange(row.id, 'ACTIVE')}
                                className="p-1 hover:bg-green-50 text-green-600 rounded"
                                title="Activate"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange(row.id, 'SUSPENDED')}
                                className="p-1 hover:bg-red-50 text-red-600 rounded"
                                title="Suspend"
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                        )
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-slate-500">Manage access for your laboratory staff.</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    Add Member
                </button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>
                <DataTable
                    data={members}
                    columns={columns}
                />
            </div>

            <Modal
                open={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Invite New Member"
            >
                <form onSubmit={handleInvite} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <input
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={inviteForm.firstName}
                                onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <input
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={inviteForm.lastName}
                                onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full border rounded-lg px-3 py-2"
                            value={inviteForm.email}
                            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={inviteForm.role}
                            onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                        >
                            <option value="TECHNICIAN">Technician (Can upload results)</option>
                            <option value="VIEWER">Viewer (Read-only)</option>
                        </select>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                        >
                            Send Invitation
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
