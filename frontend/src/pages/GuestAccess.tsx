import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui-basic';
import { OtpInput } from '@/components/OtpInput';
import { Shield, Loader2, CheckCircle, AlertTriangle, Download, FileText } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

type WizardState = 'loading' | 'challenge' | 'otp' | 'dob' | 'success' | 'error';

interface ErrorInfo {
    title: string;
    message: string;
}

export function GuestAccess() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [state, setState] = React.useState<WizardState>('loading');
    const [maskedPhone, setMaskedPhone] = React.useState<string>('');
    const [otp, setOtp] = React.useState('');
    const [dob, setDob] = React.useState('');
    const [downloadUrl, setDownloadUrl] = React.useState<string>('');
    const [error, setError] = React.useState<ErrorInfo | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [resendTimer, setResendTimer] = React.useState(60);

    // Detect mobile
    const isMobile = React.useMemo(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);

    // Initial token check
    React.useEffect(() => {
        if (!token) {
            setError({ title: 'Invalid Link', message: 'No access token provided. Please use the link from your SMS or email.' });
            setState('error');
            return;
        }
        setState('challenge');
    }, [token]);

    // Timer Logic
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (state === 'otp' && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [state, resendTimer]);

    const handleChallenge = async () => {
        setIsLoading(true);
        setResendTimer(60); // Reset timer on new challenge
        try {
            const res = await fetch(`${API_BASE}/auth/guest/challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            // Check for anonymized document (archived)
            if (res.status === 410) {
                const data = await res.json().catch(() => ({}));
                if (data.isAnonymized) {
                    setError({
                        title: 'Dossier Archivé',
                        message: 'Ce résultat a été archivé pour des raisons de sécurité. Veuillez contacter le laboratoire pour obtenir une copie.'
                    });
                    setState('error');
                    return;
                }
                window.location.href = '/expired';
                return;
            }

            if (res.status === 401) {
                setError({ title: 'Lien Expiré', message: 'Ce lien a expiré. Veuillez contacter le laboratoire pour obtenir un nouveau lien.' });
                setState('error');
                return;
            }

            if (!res.ok) {
                throw new Error('Failed to send code');
            }

            const data = await res.json();
            setMaskedPhone(data.message?.match(/\+\d+\*+\d+/)?.[0] || '***');
            setState('otp');
        } catch {
            setError({ title: 'Erreur de Connexion', message: 'Impossible de se connecter au serveur. Veuillez réessayer.' });
            setState('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/guest/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, code: otp }),
            });

            if (res.status === 401) {
                setError({ title: 'Invalid Code', message: 'The code you entered is incorrect or has expired. Please try again.' });
                setOtp('');
                return;
            }

            if (!res.ok) {
                throw new Error('Verification failed');
            }

            const data = await res.json();
            setDownloadUrl(data.downloadUrl);
            setState('success');
        } catch {
            setError({ title: 'Verification Failed', message: 'Unable to verify your code. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyFallback = async () => {
        if (!dob) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/guest/verify-fallback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, dob }),
            });

            if (res.status === 410) {
                window.location.href = '/expired';
                return;
            }

            if (res.status === 403) {
                setError({ title: 'Verification Failed', message: 'Incorrect Date of Birth or Too Many Attempts.' });
                setDob('');
                // Stay on error page or let user retry? Ideally show error toast but here we use simple error state
                // Requirement says "Block after 5 failed attempts". 403 handles both.
                // Resetting to error state might be harsh if just incorrect DOB.
                // Let's revert to 'error' state for simplicity or show inline error?
                // For now, consistent with other errors:
                setState('error');
                return;
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Verification failed');
            }

            const data = await res.json();
            setDownloadUrl(data.downloadUrl);
            setState('success');
        } catch (err: any) {
            setError({ title: 'Fallback Failed', message: err.message || 'Unable to verify identity.' });
            setState('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Render states
    if (state === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (state === 'error' && error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <CardTitle className="text-xl">{error.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground mb-6">{error.message}</p>
                        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'challenge') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-2xl">Secure Medical Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-center text-muted-foreground text-lg">
                            To access your document, please confirm your identity.
                        </p>
                        <Button
                            onClick={handleChallenge}
                            disabled={isLoading}
                            className="w-full h-14 text-lg font-semibold"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Shield className="w-5 h-5 mr-2" />
                            )}
                            Send Security Code
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'otp') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-xl">Enter Verification Code</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-center text-muted-foreground">
                            Code sent to <span className="font-semibold">{maskedPhone}</span>
                        </p>

                        <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />

                        {error && (
                            <p className="text-center text-destructive text-sm">{error.message}</p>
                        )}

                        <Button
                            onClick={handleVerify}
                            disabled={otp.length !== 6 || isLoading}
                            className="w-full h-14 text-lg font-semibold"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="w-5 h-5 mr-2" />
                            )}
                            Verify & View
                        </Button>

                        <div className="text-center space-y-3 pt-2">
                            <p className="text-sm text-muted-foreground">
                                {resendTimer > 0 ? (
                                    <span>Resend SMS in {resendTimer}s</span>
                                ) : (
                                    <button
                                        onClick={handleChallenge}
                                        className="text-primary hover:underline font-medium"
                                        disabled={isLoading}
                                    >
                                        Resend SMS Code
                                    </button>
                                )}
                            </p>

                            {resendTimer === 0 && (
                                <button
                                    onClick={() => setState('dob')}
                                    className="text-sm text-muted-foreground hover:text-gray-900 underline"
                                >
                                    I'm having trouble receiving SMS
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'dob') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-xl">Security Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-center text-muted-foreground">
                            Please confirm your Date of Birth to access the document.
                        </p>

                        <div className="space-y-2">
                            <input
                                type="date"
                                className="w-full h-12 text-center text-lg border rounded-lg"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            onClick={handleVerifyFallback}
                            disabled={!dob || isLoading}
                            className="w-full h-14 text-lg font-semibold"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="w-5 h-5 mr-2" />
                            )}
                            Verify Identity
                        </Button>

                        <button
                            onClick={() => setState('otp')}
                            className="w-full text-sm text-muted-foreground hover:text-gray-900"
                        >
                            Back to SMS Verification
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <header className="p-4 border-b text-center">
                    <h1 className="text-xl font-semibold flex items-center justify-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        Your Medical Results
                    </h1>
                </header>

                {isMobile ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                            <CardContent className="pt-6 space-y-4">
                                <FileText className="w-20 h-20 text-primary mx-auto" />
                                <p className="text-center text-muted-foreground">
                                    Your document is ready. Tap below to download.
                                </p>
                                <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <Button className="w-full h-14 text-lg font-semibold">
                                        <Download className="w-5 h-5 mr-2" />
                                        Download PDF
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="flex-1 p-4">
                        <iframe
                            src={downloadUrl}
                            className="w-full h-full min-h-[600px] rounded-lg border"
                            title="Medical Results PDF"
                        />
                    </div>
                )}
            </div>
        );
    }

    return null;
}
