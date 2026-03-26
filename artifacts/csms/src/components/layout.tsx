import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, FileText, PhoneCall, AlertTriangle, 
  BarChart3, Settings, LogOut, User, Bell, Menu, X, Globe, Moon, Sun, Shield,
  GitBranch, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useListNotifications, useMarkNotificationsRead, type NotificationItem } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Protect routes
  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-card border-l border-r border-border shadow-xl z-20"
          >
            <Sidebar />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-0">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto pb-20"
          >
            {children}
          </motion.div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

function Sidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const links = [
    { href: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/customers', icon: Users, label: t('nav.customers') },
    { href: '/invoices', icon: FileText, label: t('nav.invoices') },
    { href: '/follow-ups', icon: PhoneCall, label: t('nav.followUps') },
    { href: '/complaints', icon: AlertTriangle, label: t('nav.complaints') },
    { href: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { href: '/branch-change-logs', icon: GitBranch, label: 'تغييرات الفروع' },
    { href: '/import-logs', icon: Upload, label: 'سجلات الاستيراد' },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">CSMS</h1>
          <p className="text-xs text-muted-foreground">Enterprise Edition</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-primary/10 text-primary font-semibold shadow-inner border border-primary/20' 
                : 'text-muted-foreground hover:bg-card-border hover:text-foreground'
              }
            `}>
              <link.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border mt-auto">
        <Link href="/copyright" className="block p-4 rounded-xl bg-gradient-to-br from-card to-background border border-border shadow-sm hover:shadow-md transition-all group">
          <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors text-center font-medium">© 2025 Wael Kadous</p>
        </Link>
      </div>
    </div>
  );
}

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, refetch } = useListNotifications(undefined, { query: { queryKey: ['/api/notifications'], refetchInterval: 30000 } });
  const { mutateAsync: markRead } = useMarkNotificationsRead();
  const notifications: NotificationItem[] = data?.data ?? [];
  const unread = notifications.filter(n => !n.is_read);

  const handleMarkRead = async (id: number) => {
    await markRead({ data: { ids: [id] } });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => { setOpen(o => !o); refetch(); }}>
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-12 z-40 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm">الإشعارات</span>
                {unread.length > 0 && (
                  <span className="text-xs text-primary font-medium">{unread.length} غير مقروءة</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <div
                      key={n.id}
                      className={`p-4 flex gap-3 cursor-pointer hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => { if (!n.is_read && n.id) handleMarkRead(n.id); }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                        {n.created_at && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString('ar-EG')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useTranslation();

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} title="Toggle Language">
          <Globe className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
          <Sun className="w-5 h-5 text-muted-foreground hidden dark:block" />
          <Moon className="w-5 h-5 text-muted-foreground block dark:hidden" />
        </Button>
        
        <NotificationDropdown />
        
        <div className="h-8 w-px bg-border mx-2"></div>
        
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <div className="hidden md:block text-right cursor-pointer hover:opacity-80 transition-opacity">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role_name}</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout} className="text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="h-12 border-t border-border bg-card flex items-center justify-center px-4 shrink-0 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative">
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} جميع حقوق الطباعة والنشر محفوظة | المطور:{' '}
        <a href="https://www.facebook.com/wael.kadous.71/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Wael Kadous</a>
        {' '}| 01515196224
      </p>
    </footer>
  );
}
