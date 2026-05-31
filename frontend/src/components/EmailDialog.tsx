import { useState, useEffect } from "react";
import { Send, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Invoice } from "@/lib/types";
import { settingsApi } from "@/lib/api";
import { handleError } from '@/lib/errorMessages';
import { toast } from "sonner";

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onSend: (emailData: {
    to: string;
    subject: string;
    message: string;
    includePDF: boolean;
  }) => void;
  loading: boolean;
}

/**
 * EmailDialog - Modal component for composing and sending invoice emails
 * @component
 * @param {EmailDialogProps} props - Component properties for email dialog
 * @returns {JSX.Element} Email composition dialog with template support
 */
export default function EmailDialog({
  open,
  onOpenChange,
  invoice,
  onSend,
  loading
}: EmailDialogProps) {
  const [emailData, setEmailData] = useState({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${invoice.businessName}`,
    message: `Dear ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.total.toFixed(2)} attached.\n\nDue date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n\n${invoice.businessName}`,
    includePDF: true,
    sendCopy: false
  });

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadSettings();
      generateFromTemplates();
    }
  }, [open, invoice]);

		/**
		 * Loads application settings for email templates
		 */
		const loadSettings = async () => {
		  try {
		    const data = await settingsApi.get();
		    setSettings(data);
		  } catch (error) {
		    const userMessage = handleError(error, 'EmailDialog-LoadSettings');
		    console.error("Failed to load settings:", userMessage);
		    // Don't show toast - this is a background operation
		  }
		};

		/**
		 * Generates email content from saved templates
		 */
		const generateFromTemplates = () => {
		  try {
		    if (!settings) return;

		    const subject = settings.emailSubject
		      ? settings.emailSubject
		          .replace(/{businessName}/g, invoice.businessName)
		          .replace(/{invoiceNumber}/g, invoice.invoiceNumber)
		          .replace(/{clientName}/g, invoice.clientName)
		          .replace(/{totalAmount}/g, `${invoice.currency} ${invoice.total.toFixed(2)}`)
		          .replace(/{dueDate}/g, new Date(invoice.dueDate).toLocaleDateString())
		      : `Invoice ${invoice.invoiceNumber} from ${invoice.businessName}`;

		    const message = settings.emailTemplate
		      ? settings.emailTemplate
		          .replace(/{businessName}/g, invoice.businessName)
		          .replace(/{invoiceNumber}/g, invoice.invoiceNumber)
		          .replace(/{clientName}/g, invoice.clientName)
		          .replace(/{totalAmount}/g, `${invoice.currency} ${invoice.total.toFixed(2)}`)
		          .replace(/{dueDate}/g, new Date(invoice.dueDate).toLocaleDateString())
		      : `Dear ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.total.toFixed(2)} attached.\n\nDue date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n\n${invoice.businessName}`;

		    setEmailData(prev => ({
		      ...prev,
		      subject,
		      message
		    }));
		  } catch (error) {
		    const userMessage = handleError(error, 'EmailDialog-GenerateTemplates');
		    console.error("Template generation failed:", userMessage);
		    // Fallback to basic template
		    setEmailData(prev => ({
		      ...prev,
		      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.businessName}`,
		      message: `Dear ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.total.toFixed(2)} attached.\n\nDue date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n\n${invoice.businessName}`
		    }));
		  }
		};

		const handleSend = () => {
		  if (!emailData.to) {
		    toast.error("Please enter a recipient email address");
		    return;
		  }

		  if (!isValidEmail(emailData.to)) {
		    toast.error("Please enter a valid email address for the recipient");
		    return;
		  }

		  onSend({
		    to: emailData.to,
		    subject: emailData.subject,
		    message: emailData.message,
		    includePDF: emailData.includePDF
		  });
		};

		/**
		 * Validates email format
		 */
		const isValidEmail = (email: string): boolean => {
		  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		  return emailRegex.test(email);
		};

		/**
		 * Applies template content to email fields
		 */
		const useTemplate = () => {
		  try {
		    generateFromTemplates();
		    toast.success("Email template applied successfully");
		  } catch (error) {
		    const userMessage = handleError(error, 'EmailDialog-UseTemplate');
		    toast.error(userMessage);
		  }
		};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoiceNumber} to {invoice.clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="emailTo">To</Label>
            <Input
              id="emailTo"
              value={emailData.to}
              onChange={(e) => setEmailData({...emailData, to: e.target.value})}
              placeholder="client@example.com"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="emailSubject">Subject</Label>
            <Input
              id="emailSubject"
              value={emailData.subject}
              onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
              placeholder="Invoice subject..."
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailMessage">Message</Label>
              {settings?.emailTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useTemplate}
                  className="h-8 text-xs"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Use Template
                </Button>
              )}
            </div>
            <Textarea
              id="emailMessage"
              value={emailData.message}
              onChange={(e) => setEmailData({...emailData, message: e.target.value})}
              rows={8}
              placeholder="Email message..."
              className="resize-none"
            />
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePDF"
                checked={emailData.includePDF}
                onCheckedChange={(checked) => 
                  setEmailData({...emailData, includePDF: checked as boolean})
                }
              />
              <Label htmlFor="includePDF" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Include PDF attachment
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendCopy"
                checked={emailData.sendCopy}
                onCheckedChange={(checked) => 
                  setEmailData({...emailData, sendCopy: checked as boolean})
                }
              />
              <Label htmlFor="sendCopy">
                Send copy to {invoice.businessEmail}
              </Label>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-semibold text-sm mb-2">Invoice Preview</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Invoice:</strong> {invoice.invoiceNumber}</p>
              <p><strong>Client:</strong> {invoice.clientName}</p>
              <p><strong>Amount:</strong> {invoice.currency} {invoice.total.toFixed(2)}</p>
              <p><strong>Due:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
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
          <Button 
            onClick={handleSend} 
            disabled={loading || !emailData.to}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
