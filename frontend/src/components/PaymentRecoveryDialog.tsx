import { useState } from "react";
import { AlertCircle, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Invoice } from "@/lib/types";
import { invoiceApi, emailApi } from "@/lib/api";
import { toast } from "sonner";

interface PaymentRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onRecoveryComplete: () => void;
}

export default function PaymentRecoveryDialog({
  open,
  onOpenChange,
  invoice,
  onRecoveryComplete
}: PaymentRecoveryDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRegenerateLink = async () => {
    setLoading(true);
    try {
      await invoiceApi.createPaymentIntent(invoice.id, 'stripe');
      toast.success("New payment link generated");
      onRecoveryComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to regenerate payment link");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setLoading(true);
    try {
      await emailApi.quickSend(invoice.id);
      toast.success("Payment reminder sent");
      onRecoveryComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to send reminder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Payment Recovery Options
          </DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoiceNumber} has a failed or pending payment. Choose a recovery action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Current Status: <strong>{invoice.paymentStatus}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRegenerateLink}
              disabled={loading}
              className="w-full justify-start"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Payment Link
            </Button>

            <Button
              onClick={handleSendReminder}
              disabled={loading}
              className="w-full justify-start"
              variant="outline"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Payment Reminder
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
