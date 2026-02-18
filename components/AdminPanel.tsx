import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
    id: string;
    email: string;
    last_sign_in_at: string;
    created_at: string;
}

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [securityCode, setSecurityCode] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const systemCode = process.env.ADMIN_SECURITY_CODE;
        if (securityCode === systemCode) {
            setIsAuthenticated(true);
            fetchUsers();
        } else {
            setError('魔法安全码错误，你不是大魔导师！');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch from the profiles table
            // Note: 'auth.users' fields like last_sign_in_at are generally not accessible via client SDK without Service Role.
            // We use 'updated_at' from our profiles table as a proxy for "Last Activity".
            // 'created_at' in profiles is set by our trigger.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, created_at, updated_at, subscription_status')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map database fields to our UI interface
            const realUsers: UserProfile[] = (data || []).map(p => ({
                id: p.id,
                email: p.email || 'Unknown Mage',
                // Use updated_at as proxy for last sign in, or fallback to created_at
                last_sign_in_at: p.updated_at || p.created_at || new Date().toISOString(),
                created_at: p.created_at || new Date().toISOString(),
            }));

            setUsers(realUsers);
        } catch (err: any) {
            console.error("Failed to fetch from DB:", err.message);
            // If the database is empty or RLS blocks access, we might want to show empty, 
            // but for debugging purposes, let's show a clear MOCK indicator if in development,
            // or just empty in production.
            if (process.env.NODE_ENV === 'development') {
                console.warn("Using mock data for users due to fetch error.");
                const mockUsers: UserProfile[] = [
                    {
                        id: 'mock-1',
                        email: 'mock.user1@example.com',
                        last_sign_in_at: new Date(Date.now() - 3600 * 1000).toISOString(),
                        created_at: new Date(Date.now() - 24 * 3600 * 1000 * 30).toISOString(),
                    },
                    {
                        id: 'mock-2',
                        email: 'mock.user2@example.com',
                        last_sign_in_at: new Date(Date.now() - 3600 * 1000 * 24 * 7).toISOString(),
                        created_at: new Date(Date.now() - 24 * 3600 * 1000 * 60).toISOString(),
                    },
                ];
                setUsers(mockUsers);
            } else {
                setUsers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-red-900/30 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                    <div className="text-5xl mb-4">🧙‍♂️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">最高理事会入口</h2>
                    <p className="text-slate-400 text-sm mb-6">请输入大魔导师安全码以继续</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            placeholder="安全码 (Security Code)"
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold hover:bg-slate-700 transition-all"
                            >
                                返回
                            </button>
                            <button
                                type="submit"
                                className="flex-2 px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                验证身份
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-6 animate-fade-in text-white">
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-red-500">◈</span> 管理控制台
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">系统全域监控及用户授权中心</p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                    关闭控制台
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">活跃学徒总数</h3>
                    <div className="text-4xl font-mono font-bold">{users.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">魔法能量消耗</h3>
                    <div className="text-4xl font-mono font-bold text-blue-400">84%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">系统预警</h3>
                    <div className="text-4xl font-mono font-bold text-green-500">正常</div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold">用户详情列表</h3>
                    <button className="text-xs text-blue-400 hover:underline" onClick={fetchUsers}>同步实时数据</button>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">学徒标识 (Email)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">入籍时间</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">最后施法时间</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">订阅状态</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-sm">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium">{user.email}</td>
                                    <td className="px-6 py-4 text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-slate-400">{new Date(user.last_sign_in_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-800">
                                            永久会员
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-400 hover:text-blue-300 mr-3">编辑</button>
                                        <button className="text-red-400 hover:text-red-300">限权</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <div className="p-10 text-center text-slate-500 animate-pulse">正在检索魔法卷轴...</div>}
                </div>
            </div>
        </div>
    );
};
