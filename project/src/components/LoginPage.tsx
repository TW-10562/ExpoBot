import { useState } from 'react';
import { Building2, Lock, User, AlertCircle } from 'lucide-react';
import { CREDENTIALS } from '../constants';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setEmployeeId(value);
      setError('');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!employeeId || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (
      employeeId === CREDENTIALS.user.employeeId &&
      password === CREDENTIALS.user.password
    ) {
      onLogin(CREDENTIALS.user.userData);
    } else if (
      employeeId === CREDENTIALS.admin.employeeId &&
      password === CREDENTIALS.admin.password
    ) {
      onLogin(CREDENTIALS.admin.userData);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="w-full py-4 px-8 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">HR Policy Digital Twin</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-slate-300">Sign in to access HR Policy System</p>
            </div>

            {showForgotPassword ? (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    Please contact your HR department at{' '}
                    <span className="font-semibold">hr@company.com</span> to reset your
                    password.
                  </p>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Employee ID
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={handleEmployeeIdChange}
                      placeholder="Enter numbers only"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Numbers only, no letters or special characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Sign In
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Demo Credentials: user1234 / admin1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
