import { useState, useEffect } from "react";
import { CreditCard, Banknote, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Invoice, PaymentMethodOption } from "@/lib/types";
import { invoiceApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import StripePaymentForm from "./StripePaymentForm";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onPaymentInitiated?: (method: string) => void;
}

export default function PaymentMethodDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentInitiated
}: PaymentMethodDialogProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  useEffect(() => {
    if (open && invoice) {
      fetchPaymentMethods();
    }
  }, [open, invoice]);

  const fetchPaymentMethods = async () => {
    try {
      const result = await invoiceApi.getPaymentMethods(invoice.id);
      if (result.success) {
        setPaymentMethods(result.data.methods);
      }
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      toast.error("Failed to load payment methods");
    }
  };

  const handleMethodSelect = async (methodId: string) => {
    setSelectedMethod(methodId);

    if (methodId === 'manual' || methodId === 'bank_transfer') {
      // For manual methods, just update the payment method
      try {
        await invoiceApi.updatePaymentStatus(invoice.id, 'manual', '');
        toast.success("Payment method set to manual");
        onOpenChange(false);
        onPaymentInitiated?.(methodId);
      } catch (error) {
        toast.error("Failed to update payment method");
      }
      return;
    }

    // For gateway methods, create payment intent
    setLoading(true);
    try {
      const result = await invoiceApi.createPaymentIntent(invoice.id, methodId);
      if (result.success) {
        if (methodId === 'stripe') {
          setPaymentIntent(result.data);
          setShowStripeForm(true);
          onPaymentInitiated?.(methodId);
        } else {
          toast.success(`Redirecting to ${methodId} payment...`);
          onPaymentInitiated?.(methodId);
          // For other gateways, just show success for now
          setTimeout(() => {
            toast.info(`In a real implementation, you would now redirect to ${methodId} payment page`);
            onOpenChange(false);
          }, 2000);
        }
      }
    } catch (error) {
      toast.error("Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'stripe':
        return <CreditCard className="h-5 w-5" />;
      case 'paypal':
        return <ExternalLink className="h-5 w-5" />;
      case 'bank_transfer':
      case 'manual':
        return <Banknote className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showStripeForm && paymentIntent ? (
          <StripePaymentForm
            invoice={invoice}
            paymentIntent={paymentIntent}
            onSuccess={() => {
              onOpenChange(false);
              setShowStripeForm(false);
              // The webhook will update the status automatically
            }}
            onCancel={() => {
              setShowStripeForm(false);
              setPaymentIntent(null);
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Select Payment Method</DialogTitle>
              <DialogDescription>
                Choose how you want to pay invoice {invoice.invoiceNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    selectedMethod === method.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleMethodSelect(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getMethodIcon(method.id)}
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.description}
                          </p>
                        </div>
                      </div>

                      {selectedMethod === method.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {paymentMethods.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No payment methods available</p>
                  <p className="text-sm">Contact administrator to configure payment methods</p>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2">Processing...</span>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
