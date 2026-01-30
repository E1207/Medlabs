
import React from 'react';
import { Badge } from './ui-dashboard';
import { useTranslation } from 'react-i18next';
import { Clock, Send, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

interface StatusBadgeProps {
    status: 'IMPORTED' | 'SENT' | 'CONSULTED' | 'EXPIRED' | 'FAILED' | string;
    timestamp?: string;
}

export function StatusBadge({ status, timestamp }: StatusBadgeProps) {
    const { t } = useTranslation();

    let variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' = 'default';
    let icon = <Clock className="w-3.5 h-3.5 mr-1" />;

    switch (status) {
        case 'IMPORTED':
            variant = 'warning';
            icon = <Clock className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'SENT':
            variant = 'default';
            icon = <Send className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'CONSULTED':
            variant = 'success';
            icon = <Eye className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'FAILED':
            variant = 'danger';
            icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'EXPIRED':
            variant = 'secondary';
            icon = <Clock className="w-3.5 h-3.5 mr-1" />;
            break;
        default:
            variant = 'secondary';
            icon = <Clock className="w-3.5 h-3.5 mr-1" />;
    }

    return (
        <div title={timestamp ? `${t('status.' + status)} - ${timestamp}` : undefined}>
            <Badge variant={variant} className="flex w-fit items-center">
                {icon}
                {t(`status.${status}`)}
            </Badge>
        </div>
    );
}
