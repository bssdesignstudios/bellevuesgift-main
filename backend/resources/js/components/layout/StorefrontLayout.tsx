import { ReactNode } from 'react';
import { StorefrontHeader } from './StorefrontHeader';
import { StorefrontFooter } from './StorefrontFooter';

export function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <StorefrontHeader />
      <main className="flex-1">
        {children}
      </main>
      <StorefrontFooter />
    </div>
  );
}
