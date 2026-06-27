'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SupplierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [supplier, setSupplier] = useState<any>(null);

    const isPublicSupplierPage =
        pathname === '/supplier/login' || pathname === '/supplier/register';

useEffect(() => {
    if (isPublicSupplierPage) {
        setLoading(false);
        return;
    }

    checkAuth();
}, [isPublicSupplierPage]);

    const checkAuth = async () => {
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            console.log("SUPPLIER_LAYOUT_USER", user);

            if (userError || !user) {
                router.push('/supplier/login');
                return;
            }

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            console.log("SUPPLIER_PROFILE", data);
            console.log("SUPPLIER_PROFILE_ERROR", error);

            if (error) {
                console.error(error);
                router.push('/supplier/register');
                return;
            }

            if (!data) {
                router.push('/supplier/register');
                return;
            }

            setSupplier(data);
        } catch (err) {
            console.error("SUPPLIER_LAYOUT_EXCEPTION", err);
            router.push('/supplier/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (isPublicSupplierPage) {
        return <>{children}</>;
    }

    const navigation = [
        { name: 'Opportunities', href: '/supplier/dashboard', icon: '🎯' },
        { name: 'My Bids', href: '/supplier/bids', icon: '📊' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link href="/supplier/dashboard" className="text-xl font-bold text-gray-900">
                                NationsNRG Supplier
                            </Link>
                            <span className="ml-4 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                {supplier.company_name}
                            </span>
                        </div>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push('/supplier/login');
                            }}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-b bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-8">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                    py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium
                                    ${pathname === item.href
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <main className="py-6">
                {children}
            </main>
        </div>
    );
}