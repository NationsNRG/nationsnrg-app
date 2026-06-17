'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setMessage(error.message);
        } else {
            router.push('/dashboard');
        }
        
        setLoading(false);
    };

    const handleSignUp = async () => {
        setLoading(true);
        setMessage('');
        
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`
            }
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Check your email for confirmation!');
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                        NationsNRG
                    </h1>
                    <p className="text-gray-500">
                        Energy Intelligence Platform
                    </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                    />
                    
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                    />
                    
                    {message && (
                        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            {message}
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                    >
                        {loading ? 'Loading...' : 'Sign In'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleSignUp}
                        disabled={loading}
                        className="w-full bg-gray-200 text-gray-800 p-2 rounded hover:bg-gray-300 disabled:bg-gray-400 transition-colors"
                    >
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    );
}