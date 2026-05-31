import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import CreateInvoice from "@/pages/CreateInvoice";
import EditInvoice from "@/pages/EditInvoice";
import InvoiceDetails from "@/pages/InvoiceDetails";
import InvoiceHistory from "@/pages/InvoiceHistory";
import ClientManagement from "@/pages/ClientManagement";
import Settings from "@/pages/Settings";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentPage from "@/pages/PaymentPage";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ErrorTesting from "@/components/ErrorTesting";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

/**
 * ProtectedRoute - Wrapper component for authenticated routes
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {JSX.Element} Either loading state, login redirect, or protected content
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * AppRoutes - Main application routing configuration
 * @component
 * @returns {JSX.Element} Route definitions for all application pages
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="/create-invoice" element={<CreateInvoice />} />
        <Route path="/invoices" element={<InvoiceHistory />} />
        <Route path="/invoices/:id" element={<InvoiceDetails />} />
        <Route path="/invoices/:id/edit" element={<EditInvoice />} />
        <Route path="/clients" element={<ClientManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminDashboard />} />
								// Change the route to use invoiceId instead of paymentIntentId
								<Route path="/pay/:invoiceId" element={<PaymentPage />} />
								{/* For testing purposes - remove in production */}
								<Route path="/error-testing" element={<ErrorTesting />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/**
 * App - Root application component with providers and error boundary
 * @component
 * @returns {JSX.Element} Main application wrapped in necessary providers
 */
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
