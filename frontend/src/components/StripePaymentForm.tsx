import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Invoice, PaymentIntent } from "@/lib/types";
import { toast } from "sonner";

interface StripePaymentFormProps {
  invoice: Invoice;
  paymentIntent: PaymentIntent;
  onSuccess: () => void;
  onCancel: () => void;
}


// Stripe promise - will be set when Stripe is configured
let stripePromise: any = null;
const publishableKey = 'pk_test_51SVL0zCVeZck3SBn3iSMQ3q09GefDiSUNxYIBLwH06M93jPQx8J7vvTDA6o0IXXWByQX17pwwXQc9XfBWi2SyxrV00cQSzkmtV';


// Initialize Stripe outside component
if (publishableKey && !stripePromise) {
  stripePromise = loadStripe(publishableKey);
}

function CheckoutForm({ invoice, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!stripe) {
      return;
    }

    console.log('🔧 StripePaymentForm mounted:', {
      hasStripe: !!stripe,
      hasElements: !!elements,
      paymentIntentId: invoice.paymentIntent?.id,
      hasClientSecret: !!invoice.paymentIntent?.client_secret
    });

    // Check if we're returning from a redirect
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) return;

      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          toast.success('Payment succeeded!');
          onSuccess();
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, onSuccess]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/invoices/${invoice.id}?payment_success=true`,
        },
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        toast.error('Payment failed: ' + submitError.message);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      toast.error('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Invoice {invoice.invoiceNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement 
            onLoadError={(error) => {
              console.error('PaymentElement load error:', error);
              setError('Failed to load payment form. Please try again.');
            }}
            onReady={() => {
              console.log('✅ PaymentElement ready!');
            }}
          />
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">{message}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                `Pay ${invoice.currency} ${invoice.total.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
	}

export default function StripePaymentForm(props: StripePaymentFormProps) {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (stripePromise) {
      setStripeReady(true);
    } else {
      console.error('Stripe not initialized');
      toast.error('Payment system not configured');
    }
  }, []);

  if (!stripeReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Initializing payment system...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const options = {
    clientSecret: props.paymentIntent.client_secret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
