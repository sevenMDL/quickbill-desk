import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InvoiceTable from "@/components/InvoiceTable";
import BulkActionsBar from "@/components/BulkActionsBar";
import { Invoice } from "@/lib/types";
import { invoiceApi } from "@/lib/api";
import { toast } from "sonner";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { handleError } from "@/lib/errorMessages";

/**
 * InvoiceHistory - Comprehensive invoice management with bulk operations
 * @component
 * @returns {JSX.Element} Invoice listing with search, filtering, and bulk actions
 */
export default function InvoiceHistory() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [deleteInvoiceDialog, setDeleteInvoiceDialog] = useState<{
    open: boolean;
    invoice: Invoice | null;
  }>({ open: false, invoice: null });

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
    setSelectedIds([]);
  }, [searchTerm, statusFilter, invoices]);

  /**
   * Fetches all invoices from API
   */
  const fetchInvoices = async () => {
    try {
      const data = await invoiceApi.getAll();
      setInvoices(data);
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceHistory-Fetch');
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filters invoices based on search term and status
   */
  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  /**
   * Opens bulk deletion confirmation dialog
   */
  const handleOpenBulkDeleteDialog = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialog(true);
  };

  /**
   * Updates status for multiple invoices in bulk
   */
  const handleBulkStatusUpdate = async (status: Invoice['status']) => {
    if (selectedIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const result = await invoiceApi.bulk.updateStatus(selectedIds, status);
      
      if (result.success) {
        toast.success(result.message);
        const updatedInvoices = invoices.map(inv => 
          selectedIds.includes(inv.id) ? { ...inv, status } : inv
        );
        setInvoices(updatedInvoices);
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to update invoices");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'InvoiceHistory-BulkStatusUpdate');
      toast.error(userMessage);
      fetchInvoices();
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
        const updatedInvoices = invoices.filter(inv => !selectedIds.includes(inv.id));
        setInvoices(updatedInvoices);
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to delete invoices");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'InvoiceHistory-BulkDelete');
      toast.error(userMessage);
      fetchInvoices();
    } finally {
      setBulkLoading(false);
      setBulkDeleteDialog(false);
    }
  };

  /**
   * Downloads multiple invoices as PDF bundle
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
      const userMessage = handleError(error, 'InvoiceHistory-BulkDownload');
      toast.error(userMessage);
    } finally {
      setBulkLoading(false);
    }
  };

  /**
   * Sends emails for multiple invoices using template configuration
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
        toast.success(result.message || `Successfully sent ${selectedIds.length} email${selectedIds.length > 1 ? 's' : ''}`);
        setSelectedIds([]);
      } else {
        throw new Error(result.message || "Failed to send emails");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'InvoiceHistory-BulkEmail');
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
   * Handles individual invoice deletion after user confirmation
   */
  const handleDeleteInvoice = async () => {
    const { invoice } = deleteInvoiceDialog;
    if (!invoice) return;
    
    try {
      const updatedInvoices = invoices.filter(inv => inv.id !== invoice.id);
      setInvoices(updatedInvoices);
      setFilteredInvoices(updatedInvoices);
      
      await invoiceApi.delete(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} deleted successfully`);
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceHistory-DeleteInvoice');
      toast.error(userMessage);
      fetchInvoices();
    } finally {
      setDeleteInvoiceDialog({ open: false, invoice: null });
    }
  };

  /**
   * Marks individual invoice as paid with optimistic update
   */
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      const updatedInvoices = invoices.map(inv => 
        inv.id === invoice.id ? { ...inv, status: 'paid' as const } : inv
      );
      setInvoices(updatedInvoices);
      setFilteredInvoices(updatedInvoices);
      
      const result = await invoiceApi.updateStatus(invoice.id, "paid");
      
      if (result) {
        toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
      } else {
        throw new Error("Failed to update invoice status");
      }
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceHistory-MarkAsPaid');
      toast.error(userMessage);
      fetchInvoices();
    }
  };

  /**
   * Creates duplicate of individual invoice
   */
  const handleDuplicate = async (invoice: Invoice) => {
    try {
      await invoiceApi.duplicate(invoice.id);
      toast.success("Invoice duplicated successfully");
      fetchInvoices();
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceHistory-Duplicate');
      toast.error(userMessage);
    }
  };

  /**
   * Downloads individual invoice as PDF
   */
  const handleDownload = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.generatePDF(invoice);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceHistory-Download');
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your invoices
          </p>
        </div>
        <Button
          onClick={() => navigate("/create-invoice")}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Invoice
        </Button>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selection Information */}
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

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInvoices.length} of {invoices.length} invoices
        {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
      </div>

      {/* Invoice Table */}
      <InvoiceTable
        invoices={filteredInvoices}
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

      {/* Empty States */}
      {filteredInvoices.length === 0 && invoices.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No invoices match your search criteria
        </div>
      )}

      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <Plus className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start creating invoices to manage your business finances
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
