
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';

interface RequireRoleProps {
    children: React.ReactNode;
    roles: string[];
}

export function RequireRole({ children, roles }: RequireRoleProps) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!roles.includes(user.role)) {
        // Redirect based on their actual role to a safe place
        if (user.role === 'LAB_ADMIN') return <Navigate to="/dashboard/lab-home" replace />;
        if (user.role === 'TECHNICIAN') return <Navigate to="/dashboard/upload" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
