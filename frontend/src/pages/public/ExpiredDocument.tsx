
import { FileX, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ExpiredDocument() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl shadow-gray-200/50 max-w-md w-full p-8 text-center border border-gray-100">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileX className="w-8 h-8 text-red-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('expired.title')}</h1>
                <p className="text-gray-600 mb-8">
                    {t('expired.desc')}
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left flex items-start gap-4">
                    <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-blue-900">{t('expired.copy.title')}</p>
                        <p className="text-sm text-blue-800 mt-1">
                            {t('expired.copy.desc')}
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-xs text-muted-foreground border-t pt-4">
                    {t('expired.reference')}
                </div>
            </div>
        </div>
    );
}
