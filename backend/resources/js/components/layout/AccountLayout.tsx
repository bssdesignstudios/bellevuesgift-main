import { ReactNode } from 'react';
import { StorefrontLayout } from './StorefrontLayout';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    Package,
    MapPin,
    Heart,
    Gift,
    Settings,
    LogOut,
    LayoutDashboard
} from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';

interface AccountLayoutProps {
    children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
    const { url } = usePage();
    const { signOut } = useCustomerAuth();

    const navigation = [
        { name: 'Dashboard', href: '/account', icon: LayoutDashboard },
        { name: 'Orders', href: '/account/orders', icon: Package },
        { name: 'Gift Cards', href: '/account/gift-cards', icon: Gift },
        { name: 'Addresses', href: '/account/addresses', icon: MapPin },
        { name: 'Wishlist', href: '/account/wishlist', icon: Heart },
    ];

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/account/login';
    };

    return (
        <StorefrontLayout>
            <div className="container py-8 md:py-12">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 space-y-2">
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <nav className="space-y-1">
                                {navigation.map((item) => {
                                    const isActive = url === item.href || (item.href !== '/account' && url.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}

                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-4"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </StorefrontLayout>
    );
}
