import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/lib/types";
import { invoiceApi } from "@/lib/api";
import InvoiceForm from "@/components/InvoiceForm";
import { toast } from "sonner";
import { handleError } from '@/lib/errorMessages';

/**
 * CreateInvoice - Invoice creation interface with form validation
 * @component
 * @returns {JSX.Element} Invoice creation workflow with navigation
 */
export default function CreateInvoice() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

		/**
		 * Handles invoice creation with API integration
		 */
		const handleSave = async (invoiceData: Partial<Invoice>) => {
		  setSaving(true);
		  try {
		    await invoiceApi.create(invoiceData);
		    toast.success("Invoice created successfully");
		    navigate("/invoices");
		  } catch (error: any) {
		    const userMessage = handleError(error, 'CreateInvoice-Save');
		    toast.error(userMessage);
		    console.error("Invoice creation error:", error);
		  } finally {
		    setSaving(false);
		  }
		};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details to generate a new invoice
            </p>
          </div>
        </div>
      </div>

      <InvoiceForm
        onSave={handleSave}
        loading={saving}
        mode="create"
      />
    </div>
  );
}
