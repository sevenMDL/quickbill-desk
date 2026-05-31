import { useState } from "react";
import { Banknote, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Invoice, PaymentStatus } from "@/lib/types";
import { invoiceApi } from "@/lib/api";
import { toast } from "sonner";

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onPaymentUpdated?: () => void;
}

export default function ManualPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentUpdated
}: ManualPaymentDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);

		const handleSubmit = async () => {
		  if (!transactionId.trim() && paymentStatus === 'paid') {
		    toast.error("Please enter a transaction ID for paid payments");
		    return;
		  }

		  setProcessing(true);
		  try {
		    const result = await invoiceApi.updatePaymentStatus(
		      invoice.id, 
		      paymentStatus, 
		      transactionId.trim() || undefined
		    );
		    
		    if (result.success) {
		      toast.success(`Payment marked as ${paymentStatus}`);
		      onOpenChange(false);
		      
		      // Call the callback with the updated invoice data
		      onPaymentUpdated?.(result.data);
		      
		      // Reset form
		      setPaymentStatus('paid');
		      setTransactionId('');
		    } else {
		      toast.error(result.error || "Failed to update payment status");
		    }
		  } catch (error: any) {
		    toast.error("Failed to update payment status");
		    console.error("Manual payment update error:", error);
		  } finally {
		    setProcessing(false);
		  }
		};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Record Manual Payment
          </DialogTitle>
          <DialogDescription>
            Update payment status for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Payment Status</Label>
            <Select
              value={paymentStatus}
              onValueChange={(value: PaymentStatus) => setPaymentStatus(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="transactionId">
              Transaction ID {paymentStatus === 'paid' && ' *'}
            </Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g., bank reference, check number..."
            />
            <p className="text-xs text-muted-foreground">
              Reference number for tracking this payment
            </p>
          </div>
          
          {paymentStatus === 'paid' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  This will also mark the invoice as "Paid"
                </span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || (paymentStatus === 'paid' && !transactionId.trim())}
          >
            {processing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <Banknote className="mr-2 h-4 w-4" />
                Update Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
