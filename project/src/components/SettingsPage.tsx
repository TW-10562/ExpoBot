import { Globe, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <h3 className="text-lg font-semibold text-white">Settings</h3>
        <p className="text-sm text-slate-400 mt-1">
          Manage your preferences and account settings
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Language</h4>
                <p className="text-sm text-slate-400">Choose your preferred language</p>
              </div>
            </div>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>English</option>
              <option>日本語 (Japanese)</option>
              <option>中文 (Chinese)</option>
            </select>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Notifications</h4>
                <p className="text-sm text-slate-400">Configure notification preferences</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-white">Policy updates</span>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-white">System announcements</span>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-white">Document processing status</span>
                <input type="checkbox" className="w-5 h-5" />
              </label>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Appearance</h4>
                <p className="text-sm text-slate-400">Customize the interface theme</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button className="p-3 bg-slate-900 border-2 border-blue-500 rounded-lg text-white text-sm">
                Dark
              </button>
              <button className="p-3 bg-white border border-white/20 rounded-lg text-slate-900 text-sm">
                Light
              </button>
              <button className="p-3 bg-slate-700 border border-white/20 rounded-lg text-white text-sm">
                Auto
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Privacy & Security</h4>
                <p className="text-sm text-slate-400">Manage your data and security settings</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-white">Save chat history</span>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-white">Analytics tracking</span>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
