import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StripePaymentForm from "@/components/StripePaymentForm";
import { invoiceApi, paymentApi } from "@/lib/api";
import { toast } from "sonner";

export default function PaymentPage() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Get payment intent ID from URL or use the one stored in invoice
  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (invoiceId) {
      loadPaymentData(invoiceId, paymentIntentId);
    }
  }, [invoiceId, paymentIntentId]);

  const loadPaymentData = async (invId: string, piId: string | null) => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading payment data:', { invoiceId: invId, paymentIntentId: piId });
      
      // 1. Load the invoice
      const invoiceData = await invoiceApi.getById(invId);
      setInvoice(invoiceData);
      
      let finalPaymentIntentId = piId;
      
      // 2. If no payment intent ID in URL, check if invoice has one
      if (!finalPaymentIntentId && invoiceData.transactionId) {
        finalPaymentIntentId = invoiceData.transactionId;
        console.log('✅ Using payment intent from invoice:', finalPaymentIntentId);
      }
      
      // 3. If we have a payment intent ID, create the REAL payment intent object
      if (finalPaymentIntentId) {
        console.log('🔄 Creating payment intent object for:', finalPaymentIntentId);
        
        // ✅ CRITICAL FIX: We need to get the REAL client_secret
        // For now, we'll create a new payment intent to get a fresh client_secret
        // In production, you'd store the client_secret securely
        
        const paymentResult = await paymentApi.createPaymentIntent(invId, 'stripe');
        
        if (paymentResult.success) {
          console.log('✅ Real payment intent created:', {
            id: paymentResult.data.id,
            hasClientSecret: !!paymentResult.data.client_secret,
            clientSecretLength: paymentResult.data.client_secret?.length
          });
          
          setPaymentIntent(paymentResult.data);
          
          // Update the invoice with the new payment intent
          await invoiceApi.update(invId, {
            transactionId: paymentResult.data.id,
            paymentLink: `${window.location.origin}/pay/${invId}?payment_intent=${paymentResult.data.id}`
          });
        } else {
          throw new Error('Failed to create payment intent');
        }
      } 
      // 4. If no payment intent at all, create a new one
      else {
        console.log('🔄 Creating new payment intent for invoice:', invId);
        const paymentResult = await paymentApi.createPaymentIntent(invId, 'stripe');
        
        if (paymentResult.success) {
          setPaymentIntent(paymentResult.data);
        } else {
          throw new Error('Failed to create payment intent');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Failed to load payment data:', error);
      setError('Invalid payment link. Please contact the merchant.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment completed successfully!");
    setTimeout(() => {
      navigate('/invoices');
    }, 2000);
  };

  const handlePaymentCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Payment Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/invoices')}>
              Return to Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-2xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Complete Your Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoice && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold">Invoice #{invoice.invoiceNumber}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {invoice.currency} {invoice.total?.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  For: {invoice.clientName}
                </p>
                {paymentIntent && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment ID: {paymentIntent.id.substring(0, 8)}...
                  </p>
                )}
              </div>
            )}

            {paymentIntent ? (
              <StripePaymentForm
                invoice={invoice}
                paymentIntent={paymentIntent}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                Unable to load payment form
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
