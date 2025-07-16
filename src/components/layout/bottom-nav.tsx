'use client';

import { Home, History, ScanLine, Settings, Gift } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: History },
  { href: '/ads', label: 'Ads', icon: Gift },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background/80 backdrop-blur-sm">
      <nav className="relative grid h-full grid-cols-5 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }, index) => {
           // Insert the scan button placeholder at the center
          if (index === 2) {
            return <div key="scan-placeholder"></div>;
          }

          const isActive =
            href === '/' ? pathname === href : pathname.startsWith(href);
          
          return (
            <Link
              key={href}
              href={href}
              className='flex flex-col items-center justify-center gap-1 text-xs'
            >
              <Icon className={cn(
                'w-6 h-6 transition-all',
                isActive ? 'text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.4)]' : 'text-muted-foreground hover:text-primary'
              )} />
              <span className={cn(
                'transition-colors font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>{label}</span>
            </Link>
          );
        })}
      </nav>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
             <Link href="/scan" passHref>
                <Button
                size="icon"
                className={cn(
                    "rounded-full h-20 w-20 shadow-lg",
                    "bg-primary hover:bg-primary/90",
                    "relative"
                )}
                >
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse blur-lg"></div>
                <ScanLine className="relative w-10 h-10 text-primary-foreground" />
                </Button>
            </Link>
        </div>
    </footer>
  );
}
