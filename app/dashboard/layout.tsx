'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Mail,
  FileText,
  Send,
  Settings,
  LogOut,
  Menu,
  X,
  Sheet as SheetIcon,
  Workflow,
  ImageIcon,
  ShieldAlert,
  Shield,
  Users,
  UserX,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Email Accounts', href: '/dashboard/accounts', icon: Mail },
  { name: 'Google Sheets', href: '/dashboard/sheets', icon: SheetIcon },
  { name: 'Templates', href: '/dashboard/templates', icon: FileText },
  { name: 'Image Library', href: '/dashboard/images', icon: ImageIcon },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Send },
  { name: 'Drip Sequences', href: '/dashboard/drip-sequences', icon: Workflow },
  { name: 'Bad Emails', href: '/dashboard/bounced-emails', icon: ShieldAlert },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Campaign Analytics', href: '/dashboard/campaigns/analytics', icon: BarChart3 },
  { name: 'Unsubscribes', href: '/dashboard/unsubscribes', icon: UserX },
  { name: 'Help / Manual', href: '/dashboard/help', icon: BookOpen },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-gray-200">
            <Mail className="h-8 w-8 text-blue-600" />
            <span className="ml-3 text-xl font-bold text-gray-900">
              Email Marketing
            </span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    } mr-3 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          {session?.user?.role === 'ADMIN' && (
            <div className="flex-shrink-0 border-t border-gray-200 px-3 py-3">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Admin</p>
              <Link
                href="/dashboard/admin"
                className={`${
                  pathname === '/dashboard/admin'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
              >
                <Shield
                  className={`${
                    pathname === '/dashboard/admin' ? 'text-blue-600' : 'text-gray-400'
                  } mr-3 h-5 w-5`}
                />
                User Management
              </Link>
            </div>
          )}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  {session?.user?.name}
                  {session?.user?.role === 'ADMIN' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />Admin
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-gray-200">
                <Mail className="h-8 w-8 text-blue-600" />
                <span className="ml-3 text-xl font-bold text-gray-900">
                  Email Marketing
                </span>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        } mr-3 h-5 w-5`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              {session?.user?.role === 'ADMIN' && (
                <div className="flex-shrink-0 border-t border-gray-200 px-3 py-3">
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Admin</p>
                  <Link
                    href="/dashboard/admin"
                    onClick={() => setSidebarOpen(false)}
                    className={`${
                      pathname === '/dashboard/admin'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <Shield
                      className={`${
                        pathname === '/dashboard/admin' ? 'text-blue-600' : 'text-gray-400'
                      } mr-3 h-5 w-5`}
                    />
                    User Management
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">
                Email Marketing
              </span>
            </div>
          </div>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}