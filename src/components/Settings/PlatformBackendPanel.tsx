import React, { useCallback, useEffect, useState } from 'react';
import { Database, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  platformApi,
  type PlatformHealth,
  type PlatformUser,
  type PlatformWorkspace,
} from '../../services/platformApi';

export const PlatformBackendPanel: React.FC = () => {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspace[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const status = await platformApi.health();
      setHealth(status);
      if (platformApi.token) {
        const profile = await platformApi.me();
        setUser(profile.user);
        setWorkspaces(profile.workspaces);
      }
    } catch (error) {
      setHealth(null);
      setMessage(error instanceof Error ? error.message : 'Backend connection failed');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAuth = async (mode: 'login' | 'register') => {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'register') await platformApi.register(email, password, displayName);
      else await platformApi.login(email, password);
      const profile = await platformApi.me();
      setUser(profile.user);
      setWorkspaces(profile.workspaces);
      setPassword('');
      setMessage(mode === 'register' ? 'Account and default workspace created.' : 'Signed in successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await platformApi.logout();
      setUser(null);
      setWorkspaces([]);
      setMessage('Signed out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white text-sm font-mono">PLATFORM BACKEND & WORKSPACES</h3>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="text-slate-500 text-[10px]">API</div>
          <div className={health?.status === 'ok' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {health?.status === 'ok' ? 'CONNECTED' : 'UNAVAILABLE'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="text-slate-500 text-[10px]">DATABASE</div>
          <div className={health?.checks.database === 'fulfilled' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {health?.checks.database === 'fulfilled' ? 'POSTGRES READY' : 'NOT READY'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="text-slate-500 text-[10px]">JOB QUEUE</div>
          <div className={health?.checks.redis === 'fulfilled' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {health?.checks.redis === 'fulfilled' ? 'REDIS READY' : 'NOT READY'}
          </div>
        </div>
      </div>

      {user ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-white">{user.displayName}</div>
                <div className="text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-rose-500/40 text-rose-400 text-xs font-mono font-bold hover:bg-rose-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              SIGN OUT
            </button>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-mono mb-2">PERSISTENT WORKSPACES</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workspaces.map(workspace => (
                <div key={workspace.id} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                  <div className="text-sm font-bold text-white">{workspace.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{workspace.slug}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            placeholder="Display name"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="Email"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Password (10+ characters)"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => void handleAuth('register')}
            disabled={busy}
            className="md:col-span-2 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 disabled:opacity-50"
          >
            CREATE ACCOUNT + WORKSPACE
          </button>
          <button
            type="button"
            onClick={() => void handleAuth('login')}
            disabled={busy}
            className="flex items-center justify-center gap-1 py-2 rounded-lg border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5" />
            SIGN IN
          </button>
        </div>
      )}

      {message && <div className="text-xs text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">{message}</div>}
      <p className="text-[11px] text-slate-500">
        Layouts, watchlists, strategy versions, imports and backtest jobs are stored by the backend rather than browser-only local state.
      </p>
    </div>
  );
};
