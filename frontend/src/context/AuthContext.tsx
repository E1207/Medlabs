import * as React from 'react';

export type UserRole = 'SUPER_ADMIN' | 'LAB_ADMIN' | 'TECHNICIAN';

interface User {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
    tenantName: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    switchRole: (role: UserRole) => void; // Dev only
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Mock users for development
const MOCK_USERS: Record<UserRole, User> = {
    SUPER_ADMIN: {
        id: 'super-admin-001',
        email: 'admin@medlab.com',
        role: 'SUPER_ADMIN',
        tenantId: null,
        tenantName: null,
    },
    LAB_ADMIN: {
        id: 'lab-admin-001',
        email: 'manager@labo-mvolye.cm',
        role: 'LAB_ADMIN',
        tenantId: 'tenant-001',
        tenantName: 'Laboratoire Mvolyé',
    },
    TECHNICIAN: {
        id: 'tech-001',
        email: 'tech@labo-mvolye.cm',
        role: 'TECHNICIAN',
        tenantId: 'tenant-001',
        tenantName: 'Laboratoire Mvolyé',
    },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(() => {
        // Hydrate from localStorage
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid credentials');
                throw new Error('Login failed');
            }

            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const switchRole = (role: UserRole) => {
        // Dev only - specific to mocks currently, but we can keep it if we want to mock-switch for UI testing
        // or effectively remove it if we want strict real auth.
        // For now, let's keep it but warn it does nothing with real auth unless backend supports impersonation.
        if (MOCK_USERS[role]) {
            setUser({ ...user, ...MOCK_USERS[role] });
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, switchRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
