import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import {
    ShieldCheck,
    Smartphone,
    Lock,
    ArrowRight,
    AlertCircle,
    FileText,
    Download,
    Eye,
    ChevronRight,
    HelpCircle
} from 'lucide-react';
import { Button } from '@/components';

export default function GuestAccess() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [step, setStep] = useState<'IDLE' | 'OTP' | 'SUCCESS' | 'ERROR' | 'FALLBACK'>('IDLE');
    const [code, setCode] = useState('');
    const [dob, setDob] = useState('');
    const [message, setMessage] = useState('');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 1. Initial Challenge
    const handleChallenge = async () => {
        if (!token) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await api.post('/auth/guest/challenge', { token });
            if (!res.ok) {
                const data = await res.json();
                if (res.status === 410) {
                    navigate('/guest/expired');
                    return;
                }
                throw new Error(data.message || 'Challenge failed');
            }
            const data = await res.json();
            setMessage(data.message);
            setStep('OTP');
        } catch (error: any) {
            setErrorMsg(error.message);
            setStep('ERROR');
        } finally {
            setLoading(false);
        }
    };

    // 2. Verify OTP
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await api.post('/auth/guest/verify', { token, code });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Verification failed');
            }
            const data = await res.json();
            setDownloadUrl(data.downloadUrl);
            setStep('SUCCESS');
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    // 3. Fallback (DOB)
    const handleVerifyDob = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await api.post('/auth/guest/verify-fallback', { token, dob });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Verification failed');
            }
            const data = await res.json();
            setDownloadUrl(data.downloadUrl);
            setStep('SUCCESS');
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 text-center">
                    <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
                    <p className="text-slate-500 mb-6">Le lien que vous utilisez semble mal formé ou incomplet.</p>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                        Retour à l'accueil
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
            {/* Professional Background Elements */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div className="max-w-md w-full">
                {/* Logo / Header Area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-4">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Portail Patient Sécurisé</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vérification d'Identité</h2>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative">
                    {/* Welcome Step */}
                    {step === 'IDLE' && (
                        <div className="p-8 text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50 scale-150 animate-pulse" />
                                <div className="relative bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                                    <Smartphone className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Code de Sécurité requis</h3>
                                <p className="text-slate-500 text-sm leading-relaxed text-balance">
                                    Pour accéder à vos résultats médicaux, nous devons vérifier que c'est bien vous.
                                    Un code unique vous sera envoyé par SMS.
                                </p>
                            </div>
                            <Button
                                className="w-full h-14 text-lg rounded-2xl group"
                                onClick={handleChallenge}
                                disabled={loading}
                            >
                                {loading ? "Préparation..." : "Recevoir mon code par SMS"}
                                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <p className="text-[11px] text-slate-400 font-medium">
                                En cliquant, vous acceptez notre politique de confidentialité des données de santé.
                            </p>
                        </div>
                    )}

                    {/* OTP Entry Step */}
                    {step === 'OTP' && (
                        <div className="p-8 space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-2xl">
                                <div className="bg-green-600 p-2 rounded-xl">
                                    <Smartphone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-green-900 uppercase tracking-wide">SMS Envoyé</p>
                                    <p className="text-xs text-green-700">{message}</p>
                                </div>
                            </div>

                            <form onSubmit={handleVerifyCode} className="space-y-6 text-center">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 block uppercase tracking-wide">
                                        Entrez le code à 6 chiffres
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full h-16 text-center text-3xl font-black tracking-[1em] border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                        placeholder="000000"
                                        autoFocus
                                        required
                                    />
                                </div>

                                {errorMsg && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100 animate-shake">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                <Button
                                    className="w-full h-14 rounded-2xl shadow-lg shadow-blue-200"
                                    disabled={loading || code.length < 6}
                                >
                                    {loading ? "Vérification..." : "Accéder à mes résultats"}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setStep('FALLBACK')}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    Je n'ai pas reçu le SMS ? Utiliser ma date de naissance
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Fallback Entry Step */}
                    {step === 'FALLBACK' && (
                        <div className="p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Méthode de Secours</h3>
                                <p className="text-slate-500 text-sm">
                                    Veuillez confirmer votre date de naissance pour débloquer l'accès.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyDob} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Votre date de naissance</label>
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full h-14 px-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                        required
                                    />
                                </div>

                                {errorMsg && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                <Button
                                    className="w-full h-14 rounded-2xl"
                                    disabled={loading || !dob}
                                >
                                    {loading ? "Vérification..." : "Valider mon identité"}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setStep('OTP')}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-700 block text-center mx-auto"
                                >
                                    Retour à la vérification par SMS
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Success / View Step */}
                    {step === 'SUCCESS' && (
                        <div className="p-8 text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50 shadow-inner">
                                <FileText className="w-12 h-12 text-green-600" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Identité Confirmée</h3>
                                <p className="text-slate-500 text-sm">Vos résultats sont prêts à être consultés.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col gap-2 rounded-2xl border-slate-200 hover:bg-slate-50"
                                    onClick={() => window.open(downloadUrl!, '_blank')}
                                >
                                    <Download className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Télécharger</span>
                                </Button>
                                <Button
                                    className="h-20 flex-col gap-2 rounded-2xl shadow-lg shadow-blue-100"
                                    onClick={() => window.location.href = downloadUrl!}
                                >
                                    <Eye className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Visualiser</span>
                                </Button>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold leading-normal uppercase">
                                    Avis de sécurité : ce lien de visualisation est éphémère et expirera dans 5 minutes.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Critical Error Step */}
                    {step === 'ERROR' && (
                        <div className="p-8 text-center space-y-6">
                            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-red-600">
                                <Lock className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Accès Bloqué</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Une erreur est survenue lors de la tentative de vérification. {errorMsg}
                                </p>
                            </div>
                            <Button className="w-full h-14 rounded-2xl" onClick={() => window.location.reload()}>
                                Réessayer
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-center gap-6">
                    <img src="/logo-standard.svg" alt="MedLabs" className="h-5 opacity-30 grayscale" />
                    <div className="w-px h-4 bg-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Chiffrement AES-256 HDS
                    </p>
                </div>
            </div>
        </div>
    );
}
