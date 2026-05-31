import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, DollarSign, AlertCircle, TrendingUp, Plus, Search, Activity, Shield, Clock } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import InvoiceTable from "@/components/InvoiceTable";
import BulkActionsBar from "@/components/BulkActionsBar";
import ExportButton from "@/components/ExportButton";
import QuickExportBar from "@/components/QuickExportBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Invoice, DashboardStats } from "@/lib/types";
import { invoiceApi, healthApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { handleError, processError } from '@/lib/errorMessages';

/**
 * Dashboard - Main application dashboard with overview and invoice management
 * @component
 * @returns {JSX.Element} Dashboard with stats, recent invoices, and bulk actions
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
    overdueCount: 0,
    paidCount: 0,
  });
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    pendingPayments: 0,
    failedPayments: 0,
    revenueThisMonth: 0
  });
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [deleteInvoiceDialog, setDeleteInvoiceDialog] = useState<{
    open: boolean;
    invoice: Invoice | null;
  }>({ open: false, invoice: null });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecentInvoices();
  }, [searchTerm, allInvoices]);

  /**
   * Fetches dashboard data including stats, invoices, and system health
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [statsData, invoicesData, healthData] = await Promise.all([
        invoiceApi.getStats(),
        invoiceApi.getAll(),
        healthApi.getBasicHealth().catch(error => {
          // Silent fail for health check - not critical
          console.warn('Health check failed:', error);
          return null;
        })
      ]);
      
      setStats(statsData);
      setAllInvoices(invoicesData);
      setRecentInvoices(invoicesData.slice(0, 5));
      
      // ✅ ADD PAYMENT ANALYTICS
      const paidInvoices = invoicesData.filter((inv: Invoice) => inv.paymentStatus === 'paid');
      const pendingInvoices = invoicesData.filter((inv: Invoice) => inv.paymentStatus === 'pending' || inv.paymentStatus === 'processing');
      const failedInvoices = invoicesData.filter((inv: Invoice) => inv.paymentStatus === 'failed');
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const revenueThisMonth = paidInvoices
        .filter(inv => {
          const paidDate = new Date(inv.paymentDate || inv.updatedAt);
          return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      setPaymentStats({
        totalPaid: paidInvoices.length,
        pendingPayments: pendingInvoices.length,
        failedPayments: failedInvoices.length,
        revenueThisMonth
      });
      
      if (healthData) {
        setSystemHealth(healthData);
        
        // Show warning for degraded system health
        if (healthData.status === 'degraded') {
          toast.warning('Some services are experiencing issues', {
            description: 'You may experience slower performance'
          });
        }
      }
      
    } catch (error) {
      const errorInfo = processError(error);
      const userMessage = handleError(error, 'Dashboard-FetchData');
      
      // Only show toast for critical errors
      if (errorInfo.category === 'system' || errorInfo.category === 'network') {
        toast.error(userMessage);
      }
      
      console.error('Dashboard data fetch failed:', errorInfo.logMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches basic system health status
   */
  const fetchSystemHealth = async () => {
    try {
      const health = await healthApi.getBasicHealth();
      setSystemHealth(health);
    } catch (error) {
      // Silent fail for system health - not critical for dashboard
      const errorInfo = processError(error);
      console.warn('System health fetch failed:', errorInfo.userMessage);
    }
  };

  /**
   * Filters recent invoices based on search term
   */
  const filterRecentInvoices = () => {
    if (!searchTerm) {
      setRecentInvoices(allInvoices.slice(0, 5));
      return;
    }
    
    const filtered = allInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
    
    setRecentInvoices(filtered);
  };

  /**
   * Opens bulk deletion confirmation dialog
   */
  const handleOpenBulkDeleteDialog = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialog(true);
  };

  /**
   * Handles bulk status update for selected invoices
   */
  const handleBulkStatusUpdate = async (status: Invoice['status']) => {
    if (selectedIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const result = await invoiceApi.bulk.updateStatus(selectedIds, status);
      
      if (result.success) {
        toast.success(result.message);
        
        // Optimistic UI update
        const updatedInvoices = recentInvoices.map(inv => 
          selectedIds.includes(inv.id) ? { ...inv, status } : inv
        );
        setRecentInvoices(updatedInvoices);
        
        // Update stats optimistically
        if (status === 'paid') {
          setStats(prev => ({
            ...prev,
            unpaidCount: Math.max(0, prev.unpaidCount - selectedIds.length),
            paidCount: prev.paidCount + selectedIds.length
          }));
        }
        
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to update invoices");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'Dashboard-BulkStatusUpdate');
      toast.error(userMessage);
      // Refresh data to ensure UI is in sync
      fetchData();
    } finally {
      setBulkLoading(false);
    }
  };

  /**
   * Deletes multiple invoices after user confirmation
   */
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const result = await invoiceApi.bulk.delete(selectedIds);
      
      if (result.success) {
        toast.success(result.message);
        
        // Optimistic UI update
        const updatedInvoices = recentInvoices.filter(inv => !selectedIds.includes(inv.id));
        setRecentInvoices(updatedInvoices);
        
        // Update stats optimistically
        const deletedInvoices = recentInvoices.filter(inv => selectedIds.includes(inv.id));
        const unpaidDeleted = deletedInvoices.filter(inv => inv.status === 'unpaid').length;
        const paidDeleted = deletedInvoices.filter(inv => inv.status === 'paid').length;
        
        setStats(prev => ({
          ...prev,
          totalInvoices: Math.max(0, prev.totalInvoices - selectedIds.length),
          unpaidCount: Math.max(0, prev.unpaidCount - unpaidDeleted),
          paidCount: Math.max(0, prev.paidCount - paidDeleted),
        }));
        
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to delete invoices");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'Dashboard-BulkDelete');
      toast.error(userMessage);
      // Refresh data to ensure UI is in sync
      fetchData();
    } finally {
      setBulkLoading(false);
      setBulkDeleteDialog(false);
    }
  };

  /**
   * Handles bulk PDF download of selected invoices
   */
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const result = await invoiceApi.bulk.downloadPDFs(selectedIds);
      
      if (result.success) {
        const a = document.createElement('a');
        a.href = result.data.downloadUrl;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(result.data.downloadUrl);
        }, 1000);
        
        toast.success(`Downloading ${selectedIds.length} invoice${selectedIds.length > 1 ? 's' : ''}`);
        
        setSelectedIds([]);
      } else {
        throw new Error("Failed to download invoices");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'Dashboard-BulkDownload');
      toast.error(userMessage);
    } finally {
      setBulkLoading(false);
    }
  };

  /**
   * Handles bulk email sending for selected invoices
   */
  const handleBulkEmail = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const result = await invoiceApi.bulk.sendEmail({
        invoiceIds: selectedIds,
        includePDF: true
      });
      
      if (result.success) {
        toast.success(result.message);
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to send emails");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'Dashboard-BulkEmail');
      toast.error(userMessage);
    } finally {
      setBulkLoading(false);
    }
  };

  /**
   * Opens individual invoice deletion confirmation dialog
   * @param {Invoice} invoice - Invoice to delete
   */
  const handleOpenDeleteInvoiceDialog = (invoice: Invoice) => {
    setDeleteInvoiceDialog({ open: true, invoice });
  };

  /**
   * Marks individual invoice as paid with optimistic update
   */
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      // Optimistic UI update
      const updatedInvoices = recentInvoices.map(inv => 
        inv.id === invoice.id ? { ...inv, status: 'paid' as const } : inv
      );
      setRecentInvoices(updatedInvoices);
      
      // Optimistic stats update
      setStats(prev => ({
        ...prev,
        unpaidCount: Math.max(0, prev.unpaidCount - 1),
        paidCount: prev.paidCount + 1
      }));
      
      const result = await invoiceApi.updateStatus(invoice.id, "paid");
      
      if (result) {
        toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
      } else {
        throw new Error("Failed to update invoice status");
      }
    } catch (error) {
      const userMessage = handleError(error, 'Dashboard-MarkAsPaid');
      toast.error(userMessage);
      // Refresh data to revert optimistic updates
      fetchData();
    }
  };

  /**
   * Handles individual invoice deletion after user confirmation
   */
  const handleDeleteInvoice = async () => {
    const { invoice } = deleteInvoiceDialog;
    if (!invoice) return;

    try {
      // Optimistic UI updates
      const updatedInvoices = recentInvoices.filter(inv => inv.id !== invoice.id);
      setRecentInvoices(updatedInvoices);
      
      setStats(prev => ({
        ...prev,
        totalInvoices: Math.max(0, prev.totalInvoices - 1),
        unpaidCount: invoice.status === 'unpaid' ? Math.max(0, prev.unpaidCount - 1) : prev.unpaidCount,
        paidCount: invoice.status === 'paid' ? Math.max(0, prev.paidCount - 1) : prev.paidCount,
      }));
      
      await invoiceApi.delete(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      
    } catch (error) {
      const userMessage = handleError(error, 'Dashboard-DeleteInvoice');
      toast.error(userMessage);
      // Refresh data to revert optimistic updates
      fetchData();
    } finally {
      setDeleteInvoiceDialog({ open: false, invoice: null });
    }
  };

  /**
   * Deletes individual invoice with optimistic update
   */
  const handleDelete = async (invoice: Invoice) => {
    try {
      // Optimistic UI updates
      const updatedInvoices = recentInvoices.filter(inv => inv.id !== invoice.id);
      setRecentInvoices(updatedInvoices);
      
      setStats(prev => ({
        ...prev,
        totalInvoices: Math.max(0, prev.totalInvoices - 1),
        unpaidCount: invoice.status === 'unpaid' ? Math.max(0, prev.unpaidCount - 1) : prev.unpaidCount,
        paidCount: invoice.status === 'paid' ? Math.max(0, prev.paidCount - 1) : prev.paidCount,
      }));
      
      await invoiceApi.delete(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      
    } catch (error) {
      const userMessage = handleError(error, 'Dashboard-Delete');
      toast.error(userMessage);
      // Refresh data to revert optimistic updates
      fetchData();
    }
  };

  /**
   * Duplicates existing invoice
   */
  const handleDuplicate = async (invoice: Invoice) => {
    try {
      await invoiceApi.duplicate(invoice.id);
      toast.success("Invoice duplicated successfully");
      fetchData(); // Refresh to show the new duplicated invoice
    } catch (error) {
      const userMessage = handleError(error, 'Dashboard-Duplicate');
      toast.error(userMessage);
    }
  };

  /**
   * Downloads individual invoice as PDF
   */
  const handleDownload = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.generatePDF(invoice);
      
      if (blob && blob.size > 0) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        toast.success("Invoice downloaded successfully");
      } else {
        toast.error("Generated PDF is empty - please try again");
      }
    } catch (error) {
      const userMessage = handleError(error, 'Dashboard-Download');
      toast.error(userMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your invoices and track your revenue
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            reportType="dashboard_summary"
            variant="outline"
            label="Export Dashboard"
          />
          {user?.permissions?.includes('system:monitor') && (
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          )}
          <Button
            onClick={() => navigate("/create-invoice")}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* System Status Widget */}
      {systemHealth && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              System Status
              <Badge 
                variant="secondary" 
                className={
                  systemHealth.status === 'healthy' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : systemHealth.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                }
              >
                {systemHealth.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(systemHealth.timestamp).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatsCard
          title="Total Invoices"
          value={stats.totalInvoices}
          icon={FileText}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Unpaid Invoices"
          value={stats.unpaidCount}
          icon={AlertCircle}
        />
        <StatsCard
          title="Overdue"
          value={stats.overdueCount}
          icon={TrendingUp}
        />
        
        {/* ✅ ADD PAYMENT STATS CARDS */}
        <StatsCard
          title="Paid This Month"
          value={`$${paymentStats.revenueThisMonth.toFixed(2)}`}
          icon={DollarSign}
          trend="up"
        />
        
        <StatsCard
          title="Pending Payments"
          value={paymentStats.pendingPayments}
          icon={Clock}
          trend="neutral"
        />
      </div>

      {/* Quick Export Bar */}
      <QuickExportBar />

      {/* Recent Invoices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Invoices</h2>
          <div className="flex gap-2">
            <ExportButton
              reportType="invoice_list"
              variant="outline"
              size="sm"
              label="Export"
            />
            <Button variant="outline" onClick={() => navigate("/invoices")}>
              View All
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoices by number or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Selection Info */}
        {selectedIds.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary font-medium">
                {selectedIds.length} invoice{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <InvoiceTable
          invoices={recentInvoices}
          onView={(invoice) => navigate(`/invoices/${invoice.id}`)}
          onMarkAsPaid={handleMarkAsPaid}
          onDelete={handleOpenDeleteInvoiceDialog}
          onDuplicate={handleDuplicate}
          onDownload={handleDownload}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={handleOpenBulkDeleteDialog}
          onBulkDownload={handleBulkDownload}
          onBulkEmail={handleBulkEmail}
          onClearSelection={() => setSelectedIds([])}
          loading={bulkLoading}
        />
      </div>

      {/* Empty State */}
      {recentInvoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Get started by creating your first invoice. It only takes a few minutes!
          </p>
          <Button
            onClick={() => navigate("/create-invoice")}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Invoice
          </Button>
        </div>
      )}

      {/* Bulk Deletion Confirmation Dialog */}
      <ConfirmationDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
        title="Delete Invoices"
        description={`Are you sure you want to delete ${selectedIds.length} invoice${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.length} Invoice${selectedIds.length > 1 ? 's' : ''}`}
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Individual Invoice Deletion Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteInvoiceDialog.open}
        onOpenChange={(open) => setDeleteInvoiceDialog(prev => ({ ...prev, open }))}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${deleteInvoiceDialog.invoice?.invoiceNumber}"? This action cannot be undone.`}
        confirmText="Delete Invoice"
        variant="destructive"
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}
