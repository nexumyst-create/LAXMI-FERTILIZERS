import React, { useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { CheckCircle2, Mail, Phone, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { auth } from '../../firebase';
import { useStore } from '../../context/StoreContext';

type AuthMode = 'login' | 'signup' | 'forgot' | 'phone';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    firebaseUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendEmailVerification,
    refreshUserSession,
    showToast,
  } = useStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const needsVerification = Boolean(firebaseUser && !firebaseUser.emailVerified && firebaseUser.email);

  const handleGoogle = async () => {
    setErrMsg(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        await signUpWithEmail(name, email, password, phone);
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setMode('login');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication error.';
      if (msg.includes('operation-not-allowed')) {
        setErrMsg(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). Use Google Sign-In or enable Email/Password in Firebase Console.'
        );
      } else {
        setErrMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setBusy(true);
    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const result = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmResult(result);
      showToast('OTP sent to your mobile number.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Phone OTP failed.';
      if (msg.includes('operation-not-allowed')) {
        setErrMsg(
          'Phone Auth is not enabled in Firebase Console yet. Enable Phone provider in Firebase Console → Authentication → Sign-in method, or sign in with Google.'
        );
      } else {
        setErrMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmResult) return;
    setBusy(true);
    try {
      await confirmResult.confirm(otp);
      setAuthModalOpen(false);
      showToast('Phone number verified!', 'success');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Invalid OTP.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200">
        <div className="bg-[#176B3A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg">
              {needsVerification ? 'Verify Your Email' : 'Laksmi Agri Store Account'}
            </h2>
            <p className="text-xs text-emerald-100/90">Sign in to order inputs, save addresses & track deliveries</p>
          </div>
          <button onClick={() => setAuthModalOpen(false)} aria-label="Close sign-in modal" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 leading-relaxed">
              {errMsg}
            </div>
          )}

          {needsVerification ? (
            <div className="space-y-4 text-center py-2">
              <Mail className="w-10 h-10 text-[#176B3A] mx-auto" />
              <p className="text-sm font-semibold text-[#252525]">
                Verification link sent to {firebaseUser?.email}
              </p>
              <p className="text-xs text-neutral-600">
                Please click the verification link in your inbox, then click below to continue.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={refreshUserSession}
                  className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white text-xs font-bold inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  I Have Verified My Email
                </button>
                <button
                  onClick={resendEmailVerification}
                  className="w-full py-2 rounded-lg border border-neutral-200 text-xs font-semibold"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Recommended Google Sign-In */}
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogle}
                className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 hover:bg-[#F3F8F1] flex items-center justify-center gap-2.5 text-sm font-semibold text-[#252525] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#176B3A]" />
                Continue with Google
              </button>

              <div className="relative flex items-center justify-center text-[11px] text-neutral-400">
                <span className="bg-white px-2 z-10">OR</span>
                <div className="absolute inset-x-0 h-px bg-neutral-200" />
              </div>

              {/* Mode Tabs */}
              <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-md ${mode === 'login' ? 'bg-white shadow-xs text-[#176B3A]' : 'text-neutral-600'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-md ${mode === 'signup' ? 'bg-white shadow-xs text-[#176B3A]' : 'text-neutral-600'}`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('phone');
                    setErrMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-md ${mode === 'phone' ? 'bg-white shadow-xs text-[#176B3A]' : 'text-neutral-600'}`}
                >
                  Phone OTP
                </button>
              </div>

              {mode === 'phone' ? (
                confirmResult ? (
                  <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                    <input
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 font-mono-num"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white font-bold"
                    >
                      Verify OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit Indian mobile number"
                        className="w-full border border-neutral-200 rounded-lg pl-9 pr-3 py-2.5"
                      />
                    </div>
                    <div id="recaptcha-container" />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white font-bold"
                    >
                      {busy ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs">
                  {mode === 'signup' && (
                    <>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name *"
                        className="w-full border border-neutral-200 rounded-lg px-3 py-2.5"
                      />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile Number (10 digits)"
                        className="w-full border border-neutral-200 rounded-lg px-3 py-2.5"
                      />
                    </>
                  )}
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5"
                  />
                  {mode !== 'forgot' && (
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 characters) *"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2.5"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-[#176B3A] hover:bg-[#12552e] text-white font-bold"
                  >
                    {busy
                      ? 'Please wait...'
                      : mode === 'login'
                      ? 'Sign In'
                      : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Password Reset Email'}
                  </button>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="block mx-auto text-xs text-[#176B3A] font-semibold hover:underline pt-1"
                    >
                      Forgot Password?
                    </button>
                  )}
                </form>
              )}

              <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#176B3A]" />
                Secured via Firebase Authentication
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
