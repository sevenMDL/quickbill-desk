import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Eye, FileText, Check, ChevronsUpDown, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Invoice, InvoiceItem, Client } from "@/lib/types";
import { clientApi, settingsApi, invoiceApi } from "@/lib/api";
import { handleError } from '@/lib/errorMessages';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave: (invoiceData: Partial<Invoice>) => void;
  loading: boolean;
  mode: 'create' | 'edit';
}

/**
 * SmartNumberInput - Enhanced number input with intelligent clearing behavior
 */
interface SmartNumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  type?: 'number' | 'text';
  min?: number;
  step?: number;
}

const SmartNumberInput = ({ 
  value, 
  onChange, 
  placeholder = "0",
  ...props 
}: SmartNumberInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value === 0 || value === "0") {
      setLocalValue("");
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setLocalValue("0");
      onChange(0);
    } else {
      const numValue = Number(e.target.value);
      onChange(isNaN(numValue) ? 0 : numValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
};

export default function InvoiceForm({ invoice, onSave, loading, mode }: InvoiceFormProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [formData, setFormData] = useState(() => {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    
    const baseData = {
      businessName: "",
      businessEmail: "",
      businessAddress: "",
      clientId: "",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      dueDate: defaultDueDate.toISOString().split("T")[0],
      currency: "USD",
      taxRate: 0,
      discount: 0,
      paymentLink: "",
      notes: "",
      status: "unpaid" as Invoice["status"],
    };

    if (mode === 'edit' && invoice) {
      return {
        ...baseData,
        businessName: invoice.businessName || "",
        businessEmail: invoice.businessEmail || "",
        businessAddress: invoice.businessAddress || "",
        clientId: invoice.clientId || "",
        clientName: invoice.clientName || "",
        clientEmail: invoice.clientEmail || "",
        clientAddress: invoice.clientAddress || "",
        invoiceNumber: invoice.invoiceNumber || "",
        date: invoice.date ? invoice.date.split('T')[0] : baseData.date,
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : baseData.dueDate,
        currency: invoice.currency || "USD",
        taxRate: invoice.taxRate || 0,
        discount: invoice.discount || 0,
        paymentLink: invoice.paymentLink,
        notes: invoice.notes || "",
        status: invoice.status || "unpaid",
      };
    }

    return baseData;
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, price: 0, total: 0 },
  ]);

  useEffect(() => {
    fetchClients();
    fetchSettings();

    if (mode === 'edit' && invoice) {
      if (invoice.items && invoice.items.length > 0) {
        setItems(invoice.items.map((item, index) => ({
          id: item.id || `item-${index}`,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total || item.quantity * item.price
        })));
      }
    }
  }, [invoice, mode]);

		const fetchSettings = async () => {
		  try {
		    const data = await settingsApi.get();
		    setSettings(data);

		    if (mode === 'create' && data) {
		      setFormData(prev => {
		        const updatedFormData = {
		          ...prev,
		          businessName: data.businessName || "",
		          businessEmail: data.businessEmail || "",
		          businessAddress: data.businessAddress || "",
		          currency: data.defaultCurrency || "USD",
		          taxRate: data.defaultTaxRate || 0,
		          notes: prev.notes || data.paymentTerms || "",
		        };

		        if (data.defaultDueDays && !prev.dueDate) {
		          const dueDate = new Date();
		          dueDate.setDate(dueDate.getDate() + data.defaultDueDays);
		          updatedFormData.dueDate = dueDate.toISOString().split("T")[0];
		        }

		        return updatedFormData;
		      });
		    }
		  } catch (error) {
		    // NEW ERROR HANDLING - One liner!
		    const userMessage = handleError(error, 'InvoiceForm-FetchSettings');
		    console.error("Failed to fetch settings:", userMessage);
		    // Don't show toast for settings fetch - it's not critical
		  }
		};

		const fetchClients = async () => {
		  setClientsLoading(true);
		  try {
		    const data = await clientApi.getAll();
		    setClients(data);
		  } catch (error) {
		    // NEW ERROR HANDLING - One liner!
		    const userMessage = handleError(error, 'InvoiceForm-FetchClients');
		    toast.error(userMessage);
		  } finally {
		    setClientsLoading(false);
		  }
		};

  const generateInvoiceNumber = () => {
    const prefix = settings?.invoicePrefix || "INV";

    if (settings?.autoNumbering && mode === 'create') {
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: `${prefix}-[AUTO]`
      }));
    } else if (mode === 'create') {
      const number = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: `${prefix}-${number}`
      }));
    }
  };

  useEffect(() => {
    if (settings && mode === 'create') {
      generateInvoiceNumber();
    }
  }, [settings, mode]);

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientAddress: client.address,
      }));
    }
  };

  const addItem = () => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setItems([...items, { id: newId, description: "", quantity: 1, price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { 
            ...item, 
            [field]: value,
            quantity: field === 'quantity' ? Math.max(1, Number(value) || 1) : item.quantity,
            price: field === 'price' ? Math.max(0, Number(value) || 0) : item.price
          };
          updated.total = Number(updated.quantity) * Number(updated.price);
          return updated;
        }
        return item;
      })
    );
  };

  const calculateDaysUntilDue = () => {
    if (!formData.dueDate) return 0;
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = (subtotal * formData.taxRate) / 100;
    const total = subtotal + tax - formData.discount;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

		const handlePreview = async () => {
		  setIsGeneratingPreview(true);
		  try {
		    const previewInvoice = {
		      invoiceNumber: formData.invoiceNumber || 'PREVIEW-TEMP',
		      clientName: formData.clientName || 'Preview Client',
		      clientEmail: formData.clientEmail || 'preview@example.com',
		      clientAddress: formData.clientAddress || 'Preview Client Address',
		      businessName: formData.businessName || 'Your Business Name',
		      businessEmail: formData.businessEmail || 'billing@yourbusiness.com',
		      businessAddress: formData.businessAddress || 'Your Business Address',
		      date: formData.date,
		      dueDate: formData.dueDate,
		      status: formData.status,
		      currency: formData.currency,
		      paymentLink: formData.paymentLink,
		      items: items.map(item => ({
		        description: item.description || 'Item description',
		        quantity: item.quantity || 1,
		        price: item.price || 0,
		        total: (item.quantity || 1) * (item.price || 0)
		      })),
		      subtotal: subtotal,
		      tax: tax,
		      taxRate: formData.taxRate,
		      discount: formData.discount,
		      total: total,
		      notes: formData.notes || '',
		      businessLogo: settings?.businessLogo || '',
		      id: 'preview',
		      createdAt: new Date().toISOString(),
		      updatedAt: new Date().toISOString()
		    };

		    console.log('Preview invoice with paymentLink:', formData.paymentLink);
		    const blob = await invoiceApi.generatePDF(previewInvoice as any);
		    
		    // Create and trigger download
		    const url = window.URL.createObjectURL(blob);
		    const a = document.createElement("a");
		    a.href = url;
		    a.download = `preview-${formData.invoiceNumber || 'invoice'}.pdf`;
		    document.body.appendChild(a);
		    a.click();
		    document.body.removeChild(a);
		    window.URL.revokeObjectURL(url);
		    
		    toast.success("PDF preview generated successfully");
		  } catch (error) {
		    // NEW ERROR HANDLING - One liner!
		    const userMessage = handleError(error, 'InvoiceForm-Preview');
		    toast.error(userMessage);
		  } finally {
		    setIsGeneratingPreview(false);
		  }
		};

		const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
		  e.preventDefault();
		  
		  // Validation remains the same
		  if (!formData.clientName || !formData.clientEmail) {
		    toast.error("Please select a client from the dropdown");
		    return;
		  }

		  if (!formData.businessName || !formData.businessEmail) {
		    toast.error("Please fill in business information");
		    return;
		  }

		  if (items.some(item => !item.description.trim() || item.price <= 0)) {
		    toast.error("Please ensure all items have description and valid price > 0");
		    return;
		  }

		  try {
		    const invoicePayload = {
		      clientId: formData.clientId,
		      clientName: formData.clientName,
		      clientEmail: formData.clientEmail, 
		      clientAddress: formData.clientAddress,
		      businessName: formData.businessName,
		      businessEmail: formData.businessEmail,
		      businessAddress: formData.businessAddress,
		      businessLogo: formData.businessLogo,
		      invoiceNumber: formData.invoiceNumber,
		      date: formData.date,
		      dueDate: formData.dueDate,
		      currency: formData.currency,
		      taxRate: formData.taxRate,
		      discount: formData.discount,
		      notes: formData.notes,
		      paymentLink: formData.paymentLink,
		      status: mode === 'edit' ? formData.status : (isDraft ? "draft" : "unpaid"),
		      items: items.map(item => ({
		        description: item.description,
		        quantity: item.quantity,
		        price: item.price
		      })),
		    };

		    console.log('Submitting invoice with paymentLink:', formData.paymentLink);
		    
		    // Call the parent onSave function
		    await onSave(invoicePayload);
		    
		    // Show success message
		    const action = mode === 'create' 
		      ? (isDraft ? 'saved as draft' : 'created') 
		      : 'updated';
		    toast.success(`Invoice ${action} successfully!`);
		    
		  } catch (error) {
		    // NEW ERROR HANDLING - One liner!
		    const userMessage = handleError(error, `InvoiceForm-${mode === 'create' ? 'Create' : 'Update'}`);
		    toast.error(userMessage);
		  }
		};

  return (
    <form
      id="invoice-form"
      onSubmit={(e) => handleSubmit(e, false)}
      className="space-y-6"
    >
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={isGeneratingPreview}
        >
          {isGeneratingPreview ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Preview PDF
            </>
          )}
        </Button>

        {mode === 'create' && (
          <>
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, true)} 
              variant="secondary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {settings?.businessLogo && (
            <div className="md:col-span-2 flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <img
                src={settings.businessLogo}
                alt="Business Logo"
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-sm font-medium">Your logo will appear on the invoice</p>
                <p className="text-xs text-muted-foreground">Uploaded in Settings</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Acme Corporation Inc."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Business Email *</Label>
            <Input
              id="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
              placeholder="billing@acmecorp.com"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="businessAddress">Business Address *</Label>
            <Textarea
              id="businessAddress"
              value={formData.businessAddress}
              onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
              placeholder="123 Business Street, Suite 100&#10;New York, NY 10001&#10;United States"
              rows={3}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {mode === 'create' && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client">Select Client *</Label>
              
              {clientsLoading ? (
                // Loading state
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg bg-muted/20">
                  <div className="mb-3 rounded-full bg-muted p-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                  <p className="text-sm font-medium mb-1">Loading clients...</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Please wait while we load your client list
                  </p>
                </div>
              ) : clients.length === 0 ? (
                // Empty state when no clients
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg bg-muted/20">
                  <div className="mb-3 rounded-full bg-muted p-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium mb-1">No clients found</p>
                  <p className="text-xs text-muted-foreground mb-4 text-center">
                    Add your first client to get started with invoice creation
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => navigate("/clients")}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add New Client
                  </Button>
                </div>
              ) : (
                // Searchable combobox when clients exist
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientOpen}
                      className="w-full justify-between"
                    >
                      {formData.clientId
                        ? clients.find((client) => client.id === formData.clientId)?.name
                        : "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-0" 
                    align="start"
                  >
                    <Command>
                      <CommandInput 
                        placeholder="Search clients by name or email..." 
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="mb-2 rounded-full bg-muted p-2">
                              <Plus className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-medium mb-1">No client found</p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Try a different search or add a new client
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setClientOpen(false);
                                navigate("/clients");
                              }}
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Add New Client
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={`${client.name} ${client.email}`}
                              onSelect={() => {
                                handleClientSelect(client.id);
                                setClientOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientId === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{client.name}</span>
                                <span className="text-xs text-muted-foreground">{client.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              
              <p className="text-xs text-muted-foreground">
                {clientsLoading 
                  ? "Loading your client list..."
                  : clients.length === 0 
                    ? "No clients available. Click 'Add New Client' to create one."
                    : "Search and select a client. To add new clients, visit the Clients page."
                }
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
              placeholder="Select a client above"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Client Email *</Label>
            <Input
              id="clientEmail"
              type="email"
              value={formData.clientEmail}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
              placeholder="Select a client above"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clientAddress">Client Address</Label>
            <Textarea
              id="clientAddress"
              value={formData.clientAddress}
              readOnly
              className="bg-muted/50 cursor-not-allowed resize-none"
              placeholder="Select a client above"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            {mode === 'create' && settings?.autoNumbering ? (
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                readOnly
                className="text-muted-foreground italic bg-muted/50 cursor-not-allowed"
                placeholder="Auto-generated by system"
              />
            ) : (
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="INV-2024-001"
                required
              />
            )}
            {mode === 'create' && settings?.autoNumbering && (
              <p className="text-xs text-muted-foreground">Auto-generated by system</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Invoice Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              min={formData.date}
            />
            {formData.dueDate && (
              <p className="text-xs text-muted-foreground">
                {calculateDaysUntilDue()} days from now
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ ADDED: Status Field - Only show in edit mode */}
          {mode === 'edit' && (
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="status">Invoice Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Invoice["status"]) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current status of this invoice
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid gap-4 md:grid-cols-12 items-end p-4 border border-border rounded-lg bg-secondary/20">
              <div className="space-y-2 md:col-span-5">
                <Label>Description *</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  placeholder="Web Development Services"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Quantity</Label>
                <SmartNumberInput
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(value: number) => updateItem(item.id, "quantity", value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Price</Label>
                <SmartNumberInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(value: number) => updateItem(item.id, "price", value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Total</Label>
                <Input 
                  value={item.total.toFixed(2)}
                  readOnly 
                  className="font-semibold bg-muted/50 cursor-not-allowed" 
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

						{/* Add this card after the "Invoice Details" section */}
						<Card>
						  <CardHeader>
						    <CardTitle className="flex items-center gap-2">
						      <CreditCard className="h-5 w-5" />
						      Payment Settings
						    </CardTitle>
						  </CardHeader>
						  <CardContent className="space-y-4">
						    <div className="space-y-2">
						      <Label htmlFor="paymentLink">Payment Link (Optional)</Label>
						      <Input
						        id="paymentLink"
						        type="url"
						        value={formData.paymentLink}
						        onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
						        placeholder="https://paypal.me/yourbusiness or https://yourbank.com/pay"
						      />
						      <p className="text-xs text-muted-foreground">
						        Add a direct payment link from your bank, PayPal, Stripe, or other payment provider. 
						        This will add a "Pay Now" button to invoices.
						      </p>
						    </div>
						    
						    {formData.paymentLink && (
						      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
						        <p className="text-sm text-green-800 font-medium">
						          ✅ Payment link added! Clients will see a "Pay Now" option.
						        </p>
						        <p className="text-xs text-green-700 mt-1">
						          Test your link: <a href={formData.paymentLink} target="_blank" rel="noopener noreferrer" className="underline">Open payment page</a>
						        </p>
						      </div>
						    )}
						  </CardContent>
						</Card>

      {/* Totals & Additional Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <SmartNumberInput
                id="taxRate"
                value={formData.taxRate}
                onChange={(value: number) => setFormData({ ...formData, taxRate: value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount Amount</Label>
              <SmartNumberInput
                id="discount"
                value={formData.discount}
                onChange={(value: number) => setFormData({ ...formData, discount: value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Payment Terms</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or payment terms..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formData.currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({formData.taxRate}%):</span>
              <span className="font-medium">{formData.currency} {tax.toFixed(2)}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium">- {formData.currency} {formData.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formData.currency} {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
