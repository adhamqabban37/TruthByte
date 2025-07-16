'use client';

import { Home, History, ScanLine, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-sm border-t border-border/50">
      <nav className="grid h-full grid-cols-4 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className='flex flex-col items-center justify-center gap-1 text-xs'
            >
              <Icon className={cn(
                'w-6 h-6',
                isActive ? 'glowing-icon' : 'glowing-icon-inactive'
              )} />
              <span className={cn(
                'transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
