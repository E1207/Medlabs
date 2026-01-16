import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function DashboardRedirect() {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'SUPER_ADMIN':
            return <Navigate to="/dashboard/tenants" replace />;
        case 'LAB_ADMIN':
            // Redirect to the new Analytics Dashboard
            return <Navigate to="/dashboard/lab-home" replace />;
        case 'TECHNICIAN':
            // Techs usually go to Upload or History
            return <Navigate to="/dashboard/upload" replace />;
        default:
            return <Navigate to="/dashboard/upload" replace />;
    }
}
