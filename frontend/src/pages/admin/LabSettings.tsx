import * as React from 'react';
import { useTranslation } from 'react-i18next';

export function LabSettings() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">{t('settings.title')}</h1>
            <p className="text-gray-500">{t('settings.subtitle')}</p>
        </div>
    );
}
