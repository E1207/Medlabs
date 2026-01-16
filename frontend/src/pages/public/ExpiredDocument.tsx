
import { FileX, Phone } from 'lucide-react';

export function ExpiredDocument() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl shadow-gray-200/50 max-w-md w-full p-8 text-center border border-gray-100">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileX className="w-8 h-8 text-red-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Expired</h1>
                <p className="text-gray-600 mb-8">
                    This document is no longer available online because the retention period has been exceeded (GDPR/HDS Compliance).
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left flex items-start gap-4">
                    <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-blue-900">Need a copy?</p>
                        <p className="text-sm text-blue-800 mt-1">
                            Please contact the laboratory secretariat directly to request an archive retrieval.
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-xs text-muted-foreground border-t pt-4">
                    Reference: RETENTION_POLICY_LIMIT
                </div>
            </div>
        </div>
    );
}
