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
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
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
        <Route path="/complaints/:id" component={ComplaintDetail} />
        <Route path="/invoices" component={() => <div className="p-8 text-center text-muted-foreground">الفواتير (قيد التطوير)</div>} />
        <Route path="/follow-ups" component={() => <div className="p-8 text-center text-muted-foreground">متابعة الفواتير (قيد التطوير)</div>} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
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
