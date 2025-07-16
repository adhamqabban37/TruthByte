'use client';

import { Home, History, ScanLine, Settings, Star } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: History },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/ads', label: 'Pro', icon: Star },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t bg-background/90 backdrop-blur-sm">
      <nav className="grid h-full grid-cols-5 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            (href === '/' && pathname === href) ||
            (href !== '/' && pathname.startsWith(href));
          
          if (href === '/scan') {
            return (
              <Link
                key={href}
                href={href}
                className='flex flex-col items-center justify-center -mt-8'
              >
                <div className={cn(
                  'flex items-center justify-center w-20 h-20 rounded-full transition-all bg-primary shadow-lg shadow-primary/30',
                  isActive && 'ring-4 ring-primary/30'
                )}>
                  <Icon className='w-10 h-10 text-primary-foreground' />
                </div>
                 <span className='sr-only'>{label}</span>
              </Link>
            )
          }
          
          return (
            <Link
              key={href}
              href={href}
              className='flex flex-col items-center justify-center gap-1 text-xs'
            >
              <Icon className={cn(
                'w-6 h-6 transition-all',
                isActive ? 'glowing-icon' : 'text-muted-foreground hover:text-primary'
              )} />
              <span className={cn(
                'transition-colors font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
