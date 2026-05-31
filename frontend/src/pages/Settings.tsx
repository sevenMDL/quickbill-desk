import { useState, useEffect } from "react";
import { Save, Upload, X, Mail, Zap, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsType } from "@/lib/types";
import { settingsApi, backupApi } from "@/lib/api";
import { toast } from "sonner";
import { handleError, processError } from '@/lib/errorMessages';

/**
 * Default email template with variable placeholders
 */
const defaultEmailTemplate = `Dear {clientName},

Please find your invoice {invoiceNumber} for {totalAmount} attached.

Due date: {dueDate}

Thank you for your business!

{businessName}`;

/**
 * Default email subject template
 */
const defaultEmailSubject = 'Invoice {invoiceNumber} from {businessName}';

/**
 * Settings - Comprehensive application configuration interface
 * @component
 * @returns {JSX.Element} Business, invoice, email, and backup settings management
 */
export default function Settings() {
  const [formData, setFormData] = useState<SettingsType>({
    defaultCurrency: "USD",
    defaultTaxRate: 0,
    invoicePrefix: "INV",
    autoNumbering: true,
    businessName: "",
    businessEmail: "",
    businessAddress: "",
    businessLogo: "",
    emailSubject: defaultEmailSubject,
    emailTemplate: defaultEmailTemplate,
    emailFrom: "",
    autoBackup: false,
    backupEncryption: false,
    retentionDays: 30,
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

		/**
		 * Fetches current application settings
		 */
		const fetchSettings = async () => {
		  try {
		    const data = await settingsApi.get();
		    setFormData({
		      defaultCurrency: data.defaultCurrency || "USD",
		      defaultTaxRate: data.defaultTaxRate || 0,
		      invoicePrefix: data.invoicePrefix || "INV",
		      autoNumbering: data.autoNumbering !== false,
		      businessName: data.businessName || "",
		      businessEmail: data.businessEmail || "",
		      businessAddress: data.businessAddress || "",
		      businessLogo: data.businessLogo || "",
		      emailSubject: data.emailSubject || defaultEmailSubject,
		      emailTemplate: data.emailTemplate || defaultEmailTemplate,
		      emailFrom: data.emailFrom || "",
		      paymentTerms: data.paymentTerms,
		      defaultDueDays: data.defaultDueDays,
		      autoBackup: data.autoBackup || false,
		      backupEncryption: data.backupEncryption || false,
		      retentionDays: data.retentionDays || 30,
		    });
		    if (data.businessLogo) {
		      setLogoPreview(data.businessLogo);
		    }
		  } catch (error) {
		    const userMessage = handleError(error, 'Settings-Fetch');
		    console.error("Settings fetch error:", userMessage);
		    // Don't show toast - settings load failure is handled by the loading state
		  } finally {
		    setLoading(false);
		  }
		};

		/**
		 * Handles business logo upload with validation
		 */
		const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		  const file = e.target.files?.[0];
		  if (file) {
		    try {
		      if (!file.type.startsWith('image/')) {
		        toast.error("Please upload an image file");
		        return;
		      }

		      if (file.size > 2 * 1024 * 1024) {
		        toast.error("Image must be less than 2MB");
		        return;
		      }

		      const reader = new FileReader();
		      reader.onload = (event) => {
		        const result = event.target?.result as string;
		        setLogoPreview(result);
		        setFormData(prev => ({ ...prev, businessLogo: result }));
		      };
		      reader.onerror = () => {
		        throw new Error("Failed to read image file");
		      };
		      reader.readAsDataURL(file);
		    } catch (error) {
		      const userMessage = handleError(error, 'Settings-LogoUpload');
		      toast.error(userMessage);
		    }
		  }
		};

  /**
   * Removes business logo from settings
   */
  const handleRemoveLogo = () => {
    setLogoPreview("");
    setFormData(prev => ({ ...prev, businessLogo: "" }));
  };

  /**
   * Validates form data for required fields and email format
   * @returns {string[]} Array of validation error messages
   */
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (formData.businessEmail && !isValidEmail(formData.businessEmail)) {
      errors.push("Business email is invalid");
    }

    if (formData.emailFrom && !isValidEmail(formData.emailFrom)) {
      errors.push("From email is invalid");
    }

    if (!formData.businessName.trim()) {
      errors.push("Business name is required");
    }

    if (!formData.businessEmail.trim()) {
      errors.push("Business email is required");
    }

    return errors;
  };

  /**
   * Validates email format using regex
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

		/**
		 * Handles settings form submission with validation
		 */
		const handleSubmit = async (e: React.FormEvent) => {
		  e.preventDefault();
		  
		  const errors = validateForm();
		  if (errors.length > 0) {
		    errors.forEach(error => toast.error(error));
		    return;
		  }

		  setSaving(true);
		  try {
		    await settingsApi.update(formData);
		    toast.success("Settings saved successfully");
		  } catch (error: any) {
		    const userMessage = handleError(error, 'Settings-Save');
		    toast.error(userMessage);
		    console.error("Settings save error:", error);
		  } finally {
		    setSaving(false);
		  }
		};

  /**
   * Inserts template variable at current cursor position
   * @param {string} variable - Template variable to insert
   */
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('emailTemplate') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + variable + text.substring(end);

      setFormData(prev => ({ ...prev, emailTemplate: newText }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

		/**
		 * Resets email templates to default values
		 */
		const useDefaultTemplate = () => {
		  try {
		    setFormData(prev => ({
		      ...prev,
		      emailSubject: defaultEmailSubject,
		      emailTemplate: defaultEmailTemplate
		    }));
		    toast.success("Default template applied");
		  } catch (error) {
		    const userMessage = handleError(error, 'Settings-UseDefaultTemplate');
		    toast.error(userMessage);
		  }
		};

		/**
		 * Previews email template with sample data
		 */
		const previewTemplate = () => {
		  try {
		    const sampleData = {
		      businessName: formData.businessName || "Your Business",
		      invoiceNumber: "INV-001",
		      clientName: "John Client",
		      totalAmount: "$150.00",
		      dueDate: new Date().toLocaleDateString()
		    };

		    const previewSubject = formData.emailSubject
		      .replace(/{businessName}/g, sampleData.businessName)
		      .replace(/{invoiceNumber}/g, sampleData.invoiceNumber)
		      .replace(/{clientName}/g, sampleData.clientName)
		      .replace(/{totalAmount}/g, sampleData.totalAmount)
		      .replace(/{dueDate}/g, sampleData.dueDate);

		    const previewBody = formData.emailTemplate
		      .replace(/{businessName}/g, sampleData.businessName)
		      .replace(/{invoiceNumber}/g, sampleData.invoiceNumber)
		      .replace(/{clientName}/g, sampleData.clientName)
		      .replace(/{totalAmount}/g, sampleData.totalAmount)
		      .replace(/{dueDate}/g, sampleData.dueDate);

		    toast.info(
		      <div className="space-y-2">
		        <div className="font-semibold">Template Preview:</div>
		        <div className="text-sm">
		          <strong>Subject:</strong> {previewSubject}
		        </div>
		        <div className="text-sm whitespace-pre-wrap">{previewBody}</div>
		      </div>,
		      { duration: 8000 }
		    );
		  } catch (error) {
		    const userMessage = handleError(error, 'Settings-PreviewTemplate');
		    toast.error("Failed to generate template preview: " + userMessage);
		  }
		};

		/**
		 * Creates manual backup with optional encryption
		 */
		const handleCreateBackup = async (encrypt: boolean) => {
		  try {
		    const result = await backupApi.createBackup({ encrypt });
		    if (result.success) {
		      toast.success("Backup created successfully");
		    } else {
		      throw new Error(result.error || "Failed to create backup");
		    }
		  } catch (error: any) {
		    const userMessage = handleError(error, 'Settings-CreateBackup');
		    toast.error(userMessage);
		    console.error("Backup creation error:", error);
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
    <div className="max-w-4xl space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your invoice defaults and business information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              This information will be used as default for all new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                placeholder="Your Business Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email *</Label>
              <Input
                id="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={(e) =>
                  setFormData({ ...formData, businessEmail: e.target.value })
                }
                placeholder="business@example.com"
                className={
                  formData.businessEmail && !isValidEmail(formData.businessEmail) 
                    ? "border-red-500 focus:border-red-500" 
                    : ""
                }
              />
              {formData.businessEmail && !isValidEmail(formData.businessEmail) && (
                <p className="text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) =>
                  setFormData({ ...formData, businessAddress: e.target.value })
                }
                placeholder="123 Business St, City, Country"
                rows={2}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessLogo">Business Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview || formData.businessLogo ? (
                  <div className="relative">
                    <img
                      src={logoPreview || formData.businessLogo}
                      alt="Business Logo"
                      className="h-16 w-16 object-contain border border-border rounded"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-border rounded flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1">
                  <Input
                    id="businessLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 150x150px, PNG or JPG, max 2MB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Defaults</CardTitle>
            <CardDescription>
              Set default values for new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Select
                value={formData.defaultCurrency}
                onValueChange={(value) =>
                  setFormData({ ...formData, defaultCurrency: value })
                }
              >
                <SelectTrigger id="defaultCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.defaultTaxRate}
                onChange={(e) =>
                  setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
              <Input
                id="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={(e) =>
                  setFormData({ ...formData, invoicePrefix: e.target.value })
                }
                placeholder="INV"
              />
              <p className="text-xs text-muted-foreground">
                Example: {formData.invoicePrefix}-0001
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoNumbering">Auto-numbering</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically generate invoice numbers
                  </p>
                </div>
                <Switch
                  id="autoNumbering"
                  checked={formData.autoNumbering}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoNumbering: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <CardDescription>
              Customize how your invoice emails look. Use variables to personalize each email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="emailSubject">Email Subject Template</Label>
              <Input
                id="emailSubject"
                value={formData.emailSubject}
                onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                placeholder="Invoice {invoiceNumber} from {businessName}"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{businessName}"}, {"{invoiceNumber}"}, {"{clientName}"}, {"{totalAmount}"}, {"{dueDate}"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailTemplate">Email Body Template</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={previewTemplate}>
                    <Zap className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={useDefaultTemplate}>
                    Use Default
                  </Button>
                </div>
              </div>
              <Textarea
                id="emailTemplate"
                value={formData.emailTemplate}
                onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                placeholder={defaultEmailTemplate}
                rows={8}
                className="font-mono text-sm"
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quick insert variables:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable('{businessName}')}
                  >
                    Business Name
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable('{invoiceNumber}')}
                  >
                    Invoice Number
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable('{clientName}')}
                  >
                    Client Name
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable('{totalAmount}')}
                  >
                    Total Amount
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable('{dueDate}')}
                  >
                    Due Date
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailFrom">From Email Address</Label>
              <Input
                id="emailFrom"
                type="email"
                value={formData.emailFrom || ""}
                onChange={(e) => setFormData({ ...formData, emailFrom: e.target.value })}
                placeholder="noreply@yourbusiness.com"
                className={
                  formData.emailFrom && !isValidEmail(formData.emailFrom) 
                    ? "border-red-500 focus:border-red-500" 
                    : ""
                }
              />
              {formData.emailFrom && !isValidEmail(formData.emailFrom) && (
                <p className="text-xs text-red-600">Please enter a valid email address</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to use your business email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup Settings
            </CardTitle>
            <CardDescription>
              Configure automatic backups and data protection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoBackup">Automatic Backups</Label>
                <p className="text-xs text-muted-foreground">
                  Create daily backups automatically
                </p>
              </div>
              <Switch
                id="autoBackup"
                checked={formData.autoBackup || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoBackup: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backupEncryption">Encrypt Backups</Label>
                <p className="text-xs text-muted-foreground">
                  Encrypt backup files for security
                </p>
              </div>
              <Switch
                id="backupEncryption"
                checked={formData.backupEncryption || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, backupEncryption: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retentionDays">Backup Retention (days)</Label>
              <Select
                value={formData.retentionDays?.toString() || "30"}
                onValueChange={(value) => setFormData({ ...formData, retentionDays: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long to keep backup files before automatic deletion
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Backup Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Backup Actions</CardTitle>
            <CardDescription>
              Manual backup operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateBackup(false)}
              >
                <Download className="mr-2 h-4 w-4" />
                Create Backup
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateBackup(true)}
              >
                <Shield className="mr-2 h-4 w-4" />
                Create Encrypted Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms & Notes</CardTitle>
            <CardDescription>
              These terms will be automatically added to new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Default Payment Terms</Label>
              <Textarea
                id="paymentTerms"
                value={formData.paymentTerms || ""}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="Payment is due within 30 days. Late payments may incur additional charges. Thank you for your business!"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This text will appear in the "Notes" section of new invoices
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDueDays">Default Due Days</Label>
              <Select
                value={formData.defaultDueDays?.toString() || "30"}
                onValueChange={(value) => setFormData({ ...formData, defaultDueDays: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically set due date to this many days from invoice date
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
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
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
