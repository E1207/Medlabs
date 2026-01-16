
import * as React from 'react';
import { Search, Shield, AlertTriangle, Key, Ban } from 'lucide-react';
import { DataTable, Badge, Modal } from '../../components/ui-dashboard';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    tenant?: { name: string };
    lastLoginAt: string;
}

export function UsersList() {
    const [activeTab, setActiveTab] = React.useState<'STAFF' | 'GLOBAL'>('GLOBAL');
    const [users, setUsers] = React.useState<User[]>([]);
    const [search, setSearch] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?search=${search}`);
            if (res.ok) {
                const data = await res.json();
                // Filter client-side for tab logic if API returns all
                // Ideally API supports type filter, but for now we filter here
                if (activeTab === 'STAFF') {
                    setUsers(data.filter((u: User) => u.role === 'SUPER_ADMIN'));
                } else {
                    setUsers(data.filter((u: User) => u.role !== 'SUPER_ADMIN'));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, [search, activeTab]);

    const handleForceSuspend = async (id: string) => {
        if (!confirm('EMERGENCY: Are you sure you want to FORCE SUSPEND this user? They will be logged out immediately.')) return;
        try {
            await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SUSPENDED' }),
            });
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const columns = [
        {
            header: 'User',
            key: 'email',
            render: (row: User) => (
                <div>
                    <div className="font-medium text-slate-900">{row.firstName} {row.lastName}</div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                </div>
            )
        },
        {
            header: 'Role',
            key: 'role',
            render: (row: User) => <Badge variant={row.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{row.role}</Badge>
        },
        {
            header: 'Organization',
            key: 'tenant',
            render: (row: User) => <span className="text-sm text-slate-600">{row.tenant?.name || 'Platform'}</span>
        },
        {
            header: 'Status',
            key: 'status',
            render: (row: User) => (
                <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Emergency Actions',
            key: 'actions',
            render: (row: User) => (
                <div className="flex gap-2">
                    {row.status !== 'SUSPENDED' && (
                        <button
                            onClick={() => handleForceSuspend(row.id)}
                            className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-medium border border-red-100 flex items-center gap-1 hover:bg-red-100"
                        >
                            <Ban className="w-3 h-3" /> Suspend
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-500">Global user lookup and platform staff management.</p>
            </div>

            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('GLOBAL')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'GLOBAL' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Global Lookup (Support)
                </button>
                <button
                    onClick={() => setActiveTab('STAFF')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'STAFF' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Platform Staff
                </button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'GLOBAL' ? "Search any user by name or email..." : "Search staff..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>
                {activeTab === 'GLOBAL' && (
                    <div className="px-4 py-2 bg-yellow-50 text-yellow-800 text-xs flex items-center gap-2 border-b border-yellow-100">
                        <AlertTriangle className="w-3 h-3" />
                        You are viewing sensitive user data across all tenants. Actions here are logged for audit.
                    </div>
                )}
                <DataTable
                    data={users}
                    columns={columns}
                />
            </div>
        </div>
    );
}
