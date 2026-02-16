import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = mode === 'login'
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else if (mode === 'signup') {
            setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-white bg-slate-900/50 backdrop-blur rounded-3xl border border-slate-800 shadow-2xl max-w-sm mx-auto">
            <div className="mb-8 text-center px-4">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                    {mode === 'login' ? 'Welcome Back学徒' : '魔法学院入籍'}
                </h2>
                <p className="text-slate-400 text-sm">
                    {mode === 'login' ? '开启你的魔法口语之旅' : '建立你的魔法契约'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        required
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-xs font-medium border ${message.type === 'success' ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-red-900/30 border-red-800 text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {loading ? '正在咏唱...' : (mode === 'login' ? '立即进入 🪄' : '完成注册')}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 w-full text-center">
                <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-slate-400 hover:text-blue-400 text-sm transition-colors"
                >
                    {mode === 'login' ? "还没有账号？前往入籍" : "已有契约？直接进入"}
                </button>
            </div>
        </div>
    );
};
