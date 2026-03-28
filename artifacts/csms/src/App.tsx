import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { AuthProvider } from "@/lib/auth";
import { TranslationProvider } from "@/lib/i18n";
import { AppLayout } from "@/components/layout";

import Login from "@/pages/login";
import PublicPortal from "@/pages/public-portal";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Complaints from "@/pages/complaints";
import ComplaintDetail from "@/pages/complaint-detail";
import ComplaintNew from "@/pages/complaint-new";
import Invoices from "@/pages/invoices";
import FollowUps from "@/pages/follow-ups";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import BranchChangeLogs from "@/pages/branch-change-logs";
import ImportLogs from "@/pages/import-logs";
import Copyright from "@/pages/copyright";
import NotFound from "@/pages/not-found";

setAuthTokenGetter(() => localStorage.getItem("access_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyAppearanceSettings(settings: Record<string, unknown>) {
  const root = document.documentElement;
  const accentColor = typeof settings.accent_color === "string" ? settings.accent_color : null;
  const theme = typeof settings.theme === "string" ? settings.theme : null;

  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    const hsl = hexToHsl(accentColor);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--ring", hsl);
  }

  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

export async function loadAndApplyAppearance() {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch("/api/settings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json() as { data?: Record<string, unknown> };
    if (json.data) {
      applyAppearanceSettings(json.data);
    }
  } catch {
    // silently ignore
  }
}

function AuthenticatedRoutes() {
  useEffect(() => {
    loadAndApplyAppearance();
  }, []);

  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/complaints" component={Complaints} />
        <Route path="/complaints/new" component={ComplaintNew} />
        <Route path="/complaints/:id" component={ComplaintDetail} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/follow-ups" component={FollowUps} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={Profile} />
        <Route path="/branch-change-logs" component={BranchChangeLogs} />
        <Route path="/import-logs" component={ImportLogs} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    loadAndApplyAppearance();
  }, []);

  return (
    <Switch>
      <Route path="/" component={PublicPortal} />
      <Route path="/login" component={Login} />
      <Route path="/copyright" component={Copyright} />
      <Route component={AuthenticatedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </TranslationProvider>
    </QueryClientProvider>
  );
}

export default App;
