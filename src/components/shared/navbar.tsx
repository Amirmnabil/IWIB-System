import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export function NavigationBar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between w-full px-8 py-3 bg-white border-b border-[#e0e0e0] shadow-sm">
      {/* Left: Brand Slot */}
      <Link href="/" className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]">
        <Logo className="h-10 w-auto object-contain" />
      </Link>

      {/* Center: Navigation Links */}
      <ul className="hidden md:flex items-center gap-8">
        {['Dashboard', 'Client Portfolios', 'Policies', 'Claims'].map((item) => (
          <li key={item}>
            <Link 
              href={`/${item.toLowerCase().replace(' ', '-')}`}
              className="text-[#333333] font-semibold text-[14px] transition-colors hover:text-[#0A4174]"
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right: Call to Action */}
      <div className="flex items-center">
        <Link 
          href="/dashboard"
          className="px-5 py-2.5 text-sm font-bold text-white transition-all bg-[#0A4174] rounded-lg hover:bg-[#08335a] hover:shadow-md active:scale-95 flex items-center gap-2"
        >
          Request Free Insurance Review
        </Link>
      </div>
    </nav>
  );
}
