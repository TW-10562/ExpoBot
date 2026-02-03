import { useState } from 'react';
import { Lock, User, AlertCircle, Globe, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { User as UserType } from '../../types';
import { useLang } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { login } from '../../api/auth';
import ContactHRPopup from '../modals/ContactHRPopup';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t, toggleLang, lang } = useLang();
  const { theme, toggleTheme } = useTheme();
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
    <div className="mac-glass-page min-h-screen bg-surface dark:bg-dark-bg-primary flex flex-col transition-colors">
      {/* Header */}
      <header className="w-full py-4 px-8 bg-surface dark:bg-dark-bg-primary border-b border-default dark:border-dark-border transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Thirdwave Logo"
              className="h-9 w-auto object-contain"
            />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-foreground dark:text-dark-text">{t('brand.name')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-surface-alt dark:hover:bg-dark-surface rounded-xl transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-icon-muted hover:text-foreground transition-colors icon-current" />
              ) : (
                <Sun className="w-5 h-5 text-dark-text-muted hover:text-dark-accent-blue transition-colors icon-current" />
              )}
            </button>
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="p-2.5 hover:bg-surface-alt dark:hover:bg-dark-surface rounded-xl transition-colors relative"
              title={`Switch to ${lang === 'ja' ? 'English' : '日本語'}`}
            >
              <Globe className="w-5 h-5 text-icon-muted dark:text-dark-text-muted hover:text-foreground dark:hover:text-dark-accent-blue transition-colors icon-current" />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 badge-accent text-on-accent text-[10px] font-bold rounded-full flex items-center justify-center">
                {lang === 'ja' ? 'JP' : 'EN'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-lg border border-default dark:border-dark-border p-8 transition-colors login-card">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img
                  src="/assets/logo.png"
                  alt="Thirdwave Logo"
                  className="h-14 w-auto object-contain"
                />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-foreground dark:text-dark-text mb-2">
                {t('login.welcome')}
              </h2>
              <p className="text-sm md:text-base text-muted dark:text-dark-text-muted">{t('login.signIn')}</p>
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
                  className="w-full py-3 bg-surface dark:bg-dark-surface hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text rounded-xl transition-colors font-medium"
                >
                  {t('login.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm md:text-base font-medium text-foreground dark:text-dark-text mb-2">
                    {t('login.username')}
                  </label>
                  <div className="relative">
                    <div className="input-icon-absolute pointer-events-none"><User className="w-5 h-5 text-icon-muted dark:text-black icon-current" /></div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      className="w-full input-with-icon pr-4 py-3 bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-xl text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-foreground dark:text-dark-text mb-2">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <div className="input-icon-absolute pointer-events-none"><Lock className="w-5 h-5 text-icon-muted dark:text-black icon-current" /></div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.password')}
                      className="w-full input-with-icon pr-12 py-3 bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-xl text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-icon-muted dark:text-dark-text-muted hover:text-foreground dark:hover:text-dark-text transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 icon-current" />
                      ) : (
                        <Eye className="w-5 h-5 icon-current" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm md:text-base text-muted dark:text-dark-text-muted hover:text-accent dark:hover:text-dark-accent-blue font-medium transition-colors"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 btn-primary text-on-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
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
