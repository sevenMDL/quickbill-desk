import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/lib/types";
import { invoiceApi } from "@/lib/api";
import InvoiceForm from "@/components/InvoiceForm";
import { toast } from "sonner";
import { handleError, processError } from '@/lib/errorMessages';

/**
 * EditInvoice - Invoice editing interface with data persistence
 * @component
 * @returns {JSX.Element} Invoice editing workflow with real-time validation
 */
export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);

		/**
		 * Fetches invoice data for editing
		 */
		const fetchInvoice = async (invoiceId: string) => {
		  try {
		    const data = await invoiceApi.getById(invoiceId);
		    setInvoice(data);
		  } catch (error) {
		    const userMessage = handleError(error, 'EditInvoice-Fetch');
		    toast.error(userMessage);
		    console.error("Invoice fetch error:", error);
		    navigate("/invoices");
		  } finally {
		    setLoading(false);
		  }
		};

		/**
		 * Handles invoice update with comprehensive data validation
		 */
		const handleSave = async (invoiceData: Partial<Invoice>) => {
		  if (!id || !invoice) return;
		  
		  setSaving(true);
		  try {
		    const updateData = {
		      clientName: invoiceData.clientName,
		      clientEmail: invoiceData.clientEmail, 
		      clientAddress: invoiceData.clientAddress,
		      businessName: invoiceData.businessName,
		      businessEmail: invoiceData.businessEmail,
		      businessAddress: invoiceData.businessAddress,
		      businessLogo: invoiceData.businessLogo,
		      date: invoiceData.date,
		      dueDate: invoiceData.dueDate,
		      currency: invoiceData.currency,
		      taxRate: invoiceData.taxRate,
		      discount: invoiceData.discount,
		      notes: invoiceData.notes,
		      paymentLink: invoiceData.paymentLink,
		      status: invoiceData.status,
		      items: invoiceData.items,
		      subtotal: invoiceData.subtotal,
		      tax: invoiceData.tax,
		      total: invoiceData.total,
		    };

		    console.log('Updating invoice with paymentLink:', invoiceData.paymentLink);
		    await invoiceApi.update(id, updateData);
		    toast.success("Invoice updated successfully");
		    navigate(`/invoices/${id}`);
		  } catch (error: any) {
		    const userMessage = handleError(error, 'EditInvoice-Update');
		    toast.error(userMessage);
		    console.error("Invoice update error:", error);
		  } finally {
		    setSaving(false);
		  }
		};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/invoices/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7" />
              Edit Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground mt-1">
              Modify invoice details and items
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/invoices/${id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const form = document.getElementById('invoice-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={saving}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
          >
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Invoice Form */}
      <InvoiceForm
        invoice={invoice}
        onSave={handleSave}
        loading={saving}
        mode="edit"
      />
    </div>
  );
}
