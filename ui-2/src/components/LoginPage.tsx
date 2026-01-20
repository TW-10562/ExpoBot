import { useState } from 'react';
import { Lock, User, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';
import { useLang } from '../context/LanguageContext';
import { login } from '../api/auth';
import ContactHRPopup from './ContactHRPopup';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t, toggleLang, lang } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ✅ NEW
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('login.pleaseLogin'));
      return;
    }

    setLoading(true);

    try {
      const response = await login({ userName: username, password });

      if (response.code === 200 && response.result?.token) {
        const isAdmin =
          username.toLowerCase() === 'admin' ||
          username.toLowerCase().includes('admin');

        onLogin({
          employeeId: username,
          name: username,
          department: 'General',
          role: isAdmin ? 'admin' : 'user',
          lastLogin: new Date().toISOString(),
        });
      } else {
        setError(response.message || t('login.invalidCredentials'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-8 bg-white border-b border-[#E8E8E8]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Thirdwave Logo"
              className="h-9 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight uppercase text-[#232333]">{t('brand.name')}</h1>
          </div>
          <button
            onClick={toggleLang}
            className="p-2.5 hover:bg-[#F6F6F6] rounded-xl transition-colors relative"
            title={`Switch to ${lang === 'ja' ? 'English' : '日本語'}`}
          >
            <Globe className="w-5 h-5 text-[#6E7680] hover:text-[#232333]" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1d2089] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {lang === 'ja' ? 'JP' : 'EN'}
            </span>
          </button>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-[#E8E8E8] p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img
                  src="/assets/logo.png"
                  alt="Thirdwave Logo"
                  className="h-14 w-auto object-contain"
                />
              </div>

              <h2 className="text-2xl font-bold text-[#232333] mb-2">
                {t('login.welcome')}
              </h2>
              <p className="text-[#6E7680]">{t('login.signIn')}</p>
            </div>

            {showForgotPassword ? (
              <div className="space-y-4">
                <ContactHRPopup
                  isOpen
                  onClose={() => setShowForgotPassword(false)}
                  title={t('login.forgotPasswordTitle')}
                  message={t('login.forgotPasswordMessage')}
                />

                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-[#F6F6F6] hover:bg-[#E8E8E8] text-[#232333] rounded-xl transition-colors font-medium"
                >
                  {t('login.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#232333] mb-2">
                    {t('login.username')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E7680]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-[#232333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1d2089] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#232333] mb-2">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E7680]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.password')}
                      className="w-full pl-10 pr-12 py-3 bg-white border border-[#E8E8E8] rounded-xl text-[#232333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1d2089] focus:border-transparent transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7680] hover:text-[#232333] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#1d2089] hover:text-[#0E4BD9] font-medium"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1d2089] hover:bg-[#0E4BD9] disabled:bg-[#1d2089]/50 text-white font-semibold rounded-xl transition-colors"
                >
                  {loading ? t('common.loading') : t('login.signInButton')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
