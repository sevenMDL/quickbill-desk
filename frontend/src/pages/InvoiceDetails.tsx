import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Copy, 
  CheckCircle, 
  Send, 
  Mail, 
  Zap, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ExternalLink,
  CreditCard,
  Banknote,
  RefreshCw,
  Plus,
  Activity,
  FileText,
  Undo2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Invoice, EmailHistory, PaymentStatus } from "@/lib/types";
import { invoiceApi, emailApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { handleError, processError, isRetryableError } from '@/lib/errorMessages';
import EmailDialog from "@/components/EmailDialog";
import PaymentMethodDialog from "@/components/PaymentMethodDialog";
import ManualPaymentDialog from "@/components/ManualPaymentDialog";
import PaymentRecoveryDialog from "@/components/PaymentRecoveryDialog";
import { cn } from "@/lib/utils";

/**
 * Payment Timeline Component - Visual progress indicator
 */
const PaymentTimeline = ({ invoice }: { invoice: Invoice }) => {
  const timelineEvents = [
    {
      status: 'created' as const,
      label: 'Invoice Created',
      icon: '📄',
      description: 'Invoice was created and is ready for payment',
      active: true,
      date: invoice.createdAt
    },
    {
      status: 'sent' as const,
      label: 'Invoice Sent',
      icon: '📧',
      description: 'Invoice was sent to client via email',
      active: !!invoice.lastSentAt,
      date: invoice.lastSentAt
    },
    {
      status: 'payment_link_created' as const,
      label: 'Payment Link Created', 
      icon: '🔗',
      description: 'Payment link was generated for client',
      active: !!invoice.paymentLink,
      date: invoice.updatedAt // Use when payment link was created
    },
    {
      status: 'payment_processing' as const,
      label: 'Payment Processing',
      icon: '⏳',
      description: 'Payment is being processed',
      active: invoice.paymentStatus === 'processing'
    },
    {
      status: 'paid' as const,
      label: 'Payment Completed',
      icon: '✅',
      description: 'Payment successfully completed',
      active: invoice.paymentStatus === 'paid',
      date: invoice.paymentDate
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Payment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.status} className="flex items-start gap-4">
              {/* Timeline connector */}
              {index > 0 && (
                <div 
                  className={`w-0.5 h-8 ml-5 -mt-2 ${
                    timelineEvents[index - 1].active ? 'bg-green-500' : 'bg-gray-200'
                  }`} 
                />
              )}
              
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  ${event.active 
                    ? 'bg-green-100 text-green-600 border-2 border-green-500' 
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                  }
                `}>
                  <span className="text-lg">{event.icon}</span>
                </div>

                {/* Status details */}
                <div className="flex-1">
                  <div className={`
                    font-medium ${event.active ? 'text-green-800' : 'text-gray-500'}
                  `}>
                    {event.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.description}
                  </div>
                  
                  {/* Timestamps */}
                  {event.date && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(event.date).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Checkmark for completed steps */}
                {event.active && (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  
  // Payment state variables
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showManualPaymentDialog, setShowManualPaymentDialog] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);
  const [generatingStripeLink, setGeneratingStripeLink] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && id !== "undefined") {
      fetchInvoice(id);
      fetchEmailHistory(id);
    } else {
      setLoading(false);
      console.error("Invalid invoice ID:", id);
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEmailDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchInvoice = async (invoiceId: string, retryCount = 0) => {
    try {
      const data = await invoiceApi.getById(invoiceId);
      setInvoice(data);
    } catch (error) {
      const errorInfo = processError(error);
      if (isRetryableError(error) && retryCount < 2) {
        console.log(`Retrying invoice fetch... attempt ${retryCount + 1}`);
        setTimeout(() => fetchInvoice(invoiceId, retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      const userMessage = handleError(error, 'InvoiceDetails-Fetch');
      toast.error(userMessage);
      console.error("Invoice details fetch error:", errorInfo.logMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailHistory = async (invoiceId: string) => {
    try {
      const response = await invoiceApi.getEmailHistory(invoiceId);
      if (response.success) {
        setEmailHistory(response.data.emailHistory || []);
      } else {
        throw new Error(response.error || 'Failed to fetch email history');
      }
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceDetails-EmailHistory');
      console.error("Email history fetch error:", userMessage);
    }
  };

  /**
   * Generates Stripe payment link for existing invoice
   */
		const handleGenerateStripeLink = async (retryCount = 0) => {
		  if (!invoice) return;
		  
		  if (!invoice.clientEmail) {
		    toast.error("Invoice has no client email address");
		    return;
		  }

		  if (invoice.total <= 0) {
		    toast.error("Invoice total must be greater than 0");
		    return;
		  }

		  setGeneratingStripeLink(true);
		  try {
		    console.log('🔄 Generating Stripe link for invoice:', invoice.id);
		    
		    const result = await invoiceApi.createPaymentIntent(invoice.id, 'stripe');
		    console.log('Payment Intent API response:', result);
		    
		    if (result.success && result.data) {
		      // ✅ USE OUR CUSTOM PAYMENT PAGE
		      const paymentPageUrl = `${window.location.origin}/pay/${invoice.id}?payment_intent=${result.data.id}`;
		      
		      console.log('✅ Generated custom payment page URL:', paymentPageUrl);
		      
		      const updatedInvoice = await invoiceApi.update(invoice.id, {
		        paymentLink: paymentPageUrl,
		        paymentMethod: 'stripe',
		        paymentStatus: 'pending',
		        transactionId: result.data.id
		      });
		      
		      setInvoice(updatedInvoice);
		      toast.success("Custom payment page link generated!");
		      
		      // ✅ Show debug info
		      console.log('🎯 Payment Intent Details:', {
		        invoiceId: invoice.id,
		        paymentIntentId: result.data.id,
		        status: result.data.status,
		        hasClientSecret: !!result.data.client_secret,
		        customPaymentUrl: paymentPageUrl
		      });
		      
		      // ✅ OPTIONAL: Auto-open the payment page
		      // window.open(paymentPageUrl, '_blank');
		      
		    } else {
		      throw new Error(result.error || "Failed to generate payment link - no data returned");
		    }
		  } catch (error: any) {
		    console.error("❌ Stripe link generation failed:", error);
		    
		    if (retryCount < 2) {
		      toast.info(`Retrying payment link generation... (${retryCount + 1}/2)`);
		      setTimeout(() => handleGenerateStripeLink(retryCount + 1), 1000 * (retryCount + 1));
		      return;
		    }
		    
		    toast.error("Failed to generate payment link: " + (error.message || "Please check Stripe configuration"));
		  } finally {
		    setGeneratingStripeLink(false);
		  }
		};

  /**
   * Removes payment link from invoice
   */
  const handleRemovePaymentLink = async () => {
    if (!invoice) return;

    try {
      const updatedInvoice = await invoiceApi.update(invoice.id, {
        paymentLink: ""
      });
      
      setInvoice(updatedInvoice);
      toast.success("Payment link removed");
    } catch (error: any) {
      toast.error("Failed to remove payment link");
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    const originalStatus = invoice.status;
    const originalPaymentStatus = invoice.paymentStatus;
    
    // ✅ IMPROVED: More comprehensive optimistic update
    setInvoice(prev => prev ? { 
      ...prev, 
      status: 'paid' as const,
      paymentStatus: 'paid' as const,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'manual' as const
    } : null);

    try {
      const result = await invoiceApi.updateStatus(invoice.id, "paid");
      if (result) {
        toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
        // Refresh to get server-side updates
        fetchInvoice(invoice.id);
      } else {
        throw new Error("Failed to update invoice status");
      }
    } catch (error: any) {
      // ✅ IMPROVED: Proper rollback on failure
      setInvoice(prev => prev ? { 
        ...prev, 
        status: originalStatus,
        paymentStatus: originalPaymentStatus,
        paymentDate: undefined
      } : null);
      
      const userMessage = handleError(error, 'InvoiceDetails-MarkPaid');
      toast.error(userMessage);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;

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
      const userMessage = handleError(error, 'InvoiceDetails-Download');
      toast.error(userMessage);
    }
  };

  const handleQuickSend = async () => {
    if (!invoice) return;

    if (!invoice.clientEmail) {
      toast.error("Invoice has no client email address");
      return;
    }

    setSendingEmail(true);
    try {
      const result = await invoiceApi.quickSendEmail(invoice.id);
      if (result.success) {
        toast.success("Invoice sent successfully!");
        fetchEmailHistory(invoice.id);
      } else {
        const userMessage = handleError(new Error(result.error), 'InvoiceDetails-QuickSend');
        toast.error(userMessage);
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'InvoiceDetails-QuickSend');
      toast.error(userMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCustomSend = async (emailData: {
    to: string;
    subject: string;
    message: string;
    includePDF: boolean;
  }) => {
    if (!invoice) return;

    setSendingEmail(true);
    try {
      const result = await emailApi.send(invoice.id, emailData);

      if (result.success) {
        toast.success("Invoice sent successfully!");
        setEmailDialogOpen(false);
        fetchEmailHistory(invoice.id);
      } else {
        const userMessage = handleError(new Error(result.error), 'InvoiceDetails-CustomSend');
        toast.error(userMessage);
      }
    } catch (error) {
      const userMessage = handleError(error, 'InvoiceDetails-CustomSend');
      toast.error(userMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;

    try {
      const duplicatedInvoice = await invoiceApi.duplicate(invoice.id);
      if (duplicatedInvoice) {
        toast.success(`Invoice ${invoice.invoiceNumber} duplicated successfully`);
        navigate(`/invoices/${duplicatedInvoice.id}`);
      } else {
        throw new Error("Failed to duplicate invoice");
      }
    } catch (error: any) {
      const userMessage = handleError(error, 'InvoiceDetails-Duplicate');
      toast.error(userMessage);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!invoice) return;
    
    setRefreshingPayment(true);
    try {
      const result = await invoiceApi.getPaymentStatus(invoice.id);
      if (result.success) {
        setInvoice(prev => prev ? {
          ...prev,
          paymentStatus: result.data.paymentStatus,
          transactionId: result.data.transactionId,
          paymentMethod: result.data.paymentMethod
        } : null);
        toast.success("Payment status updated");
      }
    } catch (error: any) {
      toast.error("Failed to refresh payment status");
      console.error("Payment status refresh error:", error);
    } finally {
      setRefreshingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "unpaid": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "refunded":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "manual":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: // pending
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 mr-1 animate-spin" />;
      case "failed":
        return <X className="h-4 w-4 mr-1" />;
      case "refunded":
        return <Undo2 className="h-4 w-4 mr-1" />;
      case "manual":
        return <Banknote className="h-4 w-4 mr-1" />;
      default: // pending
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  const getEmailStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEmailStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Clock className="h-3 w-3" />;
      case "delivered": return <Check className="h-3 w-3" />;
      case "failed": return <X className="h-3 w-3" />;
      default: return <Mail className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground mt-1">Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Invoice
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>

          {/* Email Send Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              onClick={() => setIsEmailDropdownOpen(!isEmailDropdownOpen)}
              disabled={sendingEmail || !invoice.clientEmail}
              variant="outline"
              className="flex items-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Dropdown Menu */}
            {isEmailDropdownOpen && !sendingEmail && invoice.clientEmail && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    handleQuickSend();
                    setIsEmailDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2 rounded-t-lg"
                >
                  <Zap className="h-4 w-4" />
                  Quick Send
                </button>
                <button
                  onClick={() => {
                    setEmailDialogOpen(true);
                    setIsEmailDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2 rounded-b-lg"
                >
                  <Edit className="h-4 w-4" />
                  Customize & Send
                </button>
              </div>
            )}
          </div>

          {invoice.status !== "paid" && (
            <Button onClick={handleMarkAsPaid}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          <Button onClick={handleDownload} className="bg-gradient-primary text-primary-foreground">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Status and Metadata */}
      <div className="flex justify-between items-center">
        <Badge className={`text-sm px-3 py-1 ${getStatusColor(invoice.status)}`}>
          {invoice.status.toUpperCase()}
        </Badge>
        <div className="text-sm text-muted-foreground">
          Created: {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
          {invoice.lastSentAt && (
            <span className="ml-4">
              Last Sent: {format(new Date(invoice.lastSentAt), "MMM dd, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Payment Status Section */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPaymentStatus}
              disabled={refreshingPayment}
            >
              <RefreshCw className={`h-4 w-4 ${refreshingPayment ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Current Status */}
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-sm px-3 py-2 text-base",
                    getPaymentStatusColor(invoice.paymentStatus)
                  )}
                >
                  {getPaymentStatusIcon(invoice.paymentStatus)}
                  {invoice.paymentStatus.toUpperCase()}
                </Badge>
                {invoice.paymentStatus === 'paid' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="text-sm font-medium">
                {invoice.paymentMethod ? (
                  <div className="flex items-center gap-2">
                    {invoice.paymentMethod === 'stripe' && <CreditCard className="h-4 w-4" />}
                    {invoice.paymentMethod === 'paypal' && <span>🅿️</span>}
                    {invoice.paymentMethod === 'bank_transfer' && <Banknote className="h-4 w-4" />}
                    {invoice.paymentMethod === 'manual' && <FileText className="h-4 w-4" />}
                    {invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1)}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not specified</span>
                )}
              </div>
            </div>

            {/* Transaction ID */}
            {invoice.transactionId && (
              <div className="space-y-2 md:col-span-2">
                <Label>Transaction ID</Label>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {invoice.transactionId}
                </code>
              </div>
            )}

            {/* Payment Date */}
            {invoice.paymentDate && (
              <div className="space-y-2 md:col-span-2">
                <Label>Paid On</Label>
                <div className="text-sm">
                  {new Date(invoice.paymentDate).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Timeline */}
      <PaymentTimeline invoice={invoice} />

      {/* Enhanced Payment Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Stripe Payment Generation */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h4 className="font-semibold flex items-center gap-2 text-blue-800">
                <Zap className="h-5 w-5" />
                Secure Stripe Payments
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Generate a professional payment link with automatic tracking
              </p>
            </div>
            <Button 
              onClick={handleGenerateStripeLink}
              disabled={!invoice.clientEmail || invoice.paymentStatus === 'paid'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="mr-2 h-4 w-4" />
              {invoice.paymentLink?.includes('stripe.com') ? 'Regenerate Link' : 'Generate Stripe Link'}
            </Button>
          </div>

          {/* Manual Payment Options */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Manual Payment Options
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Record bank transfers, checks, or other manual payments
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentMethods(true)}
                disabled={!invoice.clientEmail}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Process Payment
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowManualPaymentDialog(true)}
              >
                <Banknote className="mr-2 h-4 w-4" />
                Mark as Paid
              </Button>
            </div>
          </div>

          {/* Generated Payment Link Display */}
          {invoice.paymentLink && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Payment Link Ready
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Share this link with your client for secure payment
                  </p>
                  <div className="mt-2">
                    <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded break-all">
                      {invoice.paymentLink}
                    </code>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.paymentLink!);
                    toast.success('Payment link copied to clipboard');
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {/* Payment Recovery Section */}
          {invoice.paymentStatus === 'failed' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Payment Failed
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    The payment attempt failed. You can try recovery options.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowRecoveryDialog(true)}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Recovery Options
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business and Client Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{invoice.businessName}</p>
            <p className="text-muted-foreground">{invoice.businessEmail}</p>
            <p className="text-muted-foreground whitespace-pre-line">{invoice.businessAddress}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{invoice.clientName}</p>
            <p className="text-muted-foreground">{invoice.clientEmail}</p>
            <p className="text-muted-foreground whitespace-pre-line">{invoice.clientAddress}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-semibold">{format(new Date(invoice.date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-semibold">{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-semibold">{invoice.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-border last:border-b-0">
                <div className="flex-1">
                  <p className="font-semibold">{item.description}</p>
                </div>
                <div className="flex items-center gap-8">
                  <p className="w-20 text-right">Qty: {item.quantity}</p>
                  <p className="w-24 text-right">Price: {invoice.currency} {item.price.toFixed(2)}</p>
                  <p className="w-28 text-right font-semibold">
                    {invoice.currency} {item.total.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
              <span>{invoice.currency} {invoice.tax.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span>- {invoice.currency} {invoice.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span>Total:</span>
              <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emailHistory.length > 0 ? (
            <div className="space-y-3">
              {emailHistory.map((email, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">{email.recipient}</p>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getEmailStatusColor(email.status)} flex items-center gap-1`}
                      >
                        {getEmailStatusIcon(email.status)}
                        {email.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent: {format(new Date(email.sentAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                    {email.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {email.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No emails sent yet</p>
              <p className="text-sm mt-1">Send your first email using the button above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        invoice={invoice}
        onSend={handleCustomSend}
        loading={sendingEmail}
      />

      <PaymentMethodDialog
        open={showPaymentMethods}
        onOpenChange={setShowPaymentMethods}
        invoice={invoice}
        onPaymentInitiated={(method) => {
          fetchInvoice(invoice.id);
        }}
      />

      <ManualPaymentDialog
        open={showManualPaymentDialog}
        onOpenChange={setShowManualPaymentDialog}
        invoice={invoice}
        onPaymentUpdated={() => {
          fetchInvoice(invoice.id);
        }}
      />

      {/* Payment Recovery Dialog */}
      <PaymentRecoveryDialog
        open={showRecoveryDialog}
        onOpenChange={setShowRecoveryDialog}
        invoice={invoice}
        onRecoveryComplete={() => {
          fetchInvoice(invoice.id);
          fetchEmailHistory(invoice.id);
        }}
      />
    </div>
  );
}
