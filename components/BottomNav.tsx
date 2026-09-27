'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/history', label: 'History', icon: '📅' },
  { href: '/workout/new', label: 'Log', icon: '➕', primary: true },
  { href: '/exercises', label: 'Exercises', icon: '💪' },
  { href: '/profile', label: 'Profile', icon: '⚙️' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  // The active-logging screen is a deliberately distraction-free,
  // full-screen flow with its own bottom-anchored primary action
  // ("Log Set") — a second fixed bar there would compete with it for
  // thumb-zone space, so the nav hides only on this one route.
  if (pathname === '/workout/new') return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-between px-2">
        {TABS.map((tab) => {
          const isActive = tab.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(tab.href);

          if (tab.primary) {
            return (
              <li key={tab.href} className="flex-1">
                <Link href={tab.href} className="flex flex-col items-center gap-1 py-2">
                  <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-lg">
                    {tab.icon}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2 text-xs font-semibold ${
                  isActive ? 'text-brand' : 'text-neutral-500'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
