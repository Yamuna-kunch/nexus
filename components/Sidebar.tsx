
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Bot, 
  Workflow, 
  PhoneCall, 
  Settings, 
  LogOut,
  Activity,
  X,
  Check,
  Mic2
} from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storageService';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [elevenLabsKey, setElevenLabsKey] = useState(StorageService.getElevenLabsKey());
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Agents', icon: Users, path: '/agents' },
    { name: 'Numbers', icon: Phone, path: '/numbers' },
    { name: 'AI Studio', icon: Bot, path: '/studio' },
    { name: 'Integrations', icon: Workflow, path: '/integrations' },
    { name: 'Call Logs', icon: PhoneCall, path: '/calls' },
  ];

  const handleSaveKeys = (e: React.FormEvent) => {
      e.preventDefault();
      // Gemini Key management removed; only ElevenLabs key is persisted.
      StorageService.saveElevenLabsKey(elevenLabsKey);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <>
    <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-10 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
          <Activity className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">NexusVoice</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Settings"
          >
              <Settings className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>

    {/* Settings Modal */}
    {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-500" /> Settings
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleSaveKeys}>
                        {/* Gemini Key Input Removed: MUST be obtained exclusively from process.env.API_KEY */}

                        {/* ElevenLabs Key */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-900 mb-1">ElevenLabs API Key</label>
                            <p className="text-xs text-slate-500 mb-2">Required for realistic voices and cloning.</p>
                            <div className="relative">
                                <Mic2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="password" 
                                    value={elevenLabsKey}
                                    onChange={(e) => setElevenLabsKey(e.target.value)}
                                    placeholder="xi-api-key..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end">
                            <button 
                                type="submit" 
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${
                                    saveStatus === 'saved' ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : null}
                                {saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default Sidebar;
