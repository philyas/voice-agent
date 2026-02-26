'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Mic, History, MessageSquare, Menu, X, Monitor } from 'lucide-react';
import { useElectron } from '@/hooks';

interface NavigationProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function Navigation({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backHref = '/' 
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isElectron } = useElectron();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { href: '/', icon: Mic, label: 'Aufnahme', pathname: '/' },
    { href: '/chat', icon: MessageSquare, label: 'Chat', pathname: '/chat' },
    { href: '/history', icon: History, label: 'Historie', pathname: '/history' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-dark-200/80 dark:bg-dark-900 dark:border-dark-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Back Button - if needed */}
              {showBackButton && (
                <Link
                  href={backHref}
                  className="p-2 sm:p-2.5 rounded-xl bg-dark-100 border border-dark-200 text-dark-500 hover:text-dark-800 hover:border-dark-300 transition-all duration-200 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-400 dark:hover:text-white dark:hover:border-dark-600"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              )}

              {/* PTW Logo */}
              <Link href="/" className="flex items-center shrink-0">
                <Image
                  src="/assets/ptw-logo.png"
                  alt="PTW TU Darmstadt"
                  width={120}
                  height={44}
                  className="h-9 sm:h-11 w-auto object-contain"
                  priority
                />
              </Link>

              {/* Title Section */}
              <div>
                {title ? (
                  <>
                    <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-dark-950 dark:text-white">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">
                        {subtitle}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-semibold tracking-tight text-dark-800 dark:text-white/90">
                        Audio Intelligence
                      </span>
                      {isElectron && (
                        <span className="px-2 py-0.5 text-xs bg-ptw-500/15 text-ptw-600 dark:text-ptw-400 rounded-full flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          Desktop
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">
                      Sprachaufnahme & KI-Transkription
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Navigation / Mobile Burger Button */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Desktop Navigation - Hidden on Mobile */}
              <div className="hidden lg:flex items-center gap-1 sm:gap-2">
                {navItems.map((item) => {
                  if (item.pathname === pathname) return null; // Don't show current page
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700/50 text-dark-800 dark:text-dark-200 hover:border-dark-300 dark:hover:border-dark-600 transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Burger Menu Button - Mobile Only */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 hover:border-dark-300 dark:hover:border-dark-600 transition-all duration-200"
                aria-label="Menü öffnen"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Side Navigation */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Side Nav */}
        <div
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-dark-900 border-l border-dark-200 dark:border-dark-700/50 shadow-2xl transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Side Nav Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-200 dark:border-dark-700/50">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/ptw-logo.png"
                alt="PTW"
                width={80}
                height={32}
                className="h-8 w-auto object-contain"
              />
              <div>
                <h2 className="text-lg font-extrabold text-dark-900 dark:text-white">PTW</h2>
                <p className="text-xs text-dark-500 dark:text-dark-400">Navigation</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-white border border-dark-200 text-dark-800 hover:border-dark-300 transition-all duration-200 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-300 dark:hover:text-white dark:hover:border-dark-600"
              aria-label="Menü schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-white dark:bg-dark-800 border border-ptw-500/40 text-ptw-600 dark:text-ptw-400'
                      : 'bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700/50 text-dark-800 dark:text-dark-200 hover:border-dark-300 dark:hover:border-dark-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-ptw-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
