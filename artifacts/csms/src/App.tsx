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

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
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
  }, []);

  return (
    <Switch>
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
