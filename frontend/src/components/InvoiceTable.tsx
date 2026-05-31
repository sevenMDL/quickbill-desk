import { useState } from "react";
import { Download, Eye, Copy, Trash2, Check, MoreVertical } from "lucide-react";
import { Invoice, PaymentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onMarkAsPaid?: (invoice: Invoice) => void;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onBulkAction?: (action: string, invoices: Invoice[]) => void;
}

const getStatusColor = (status: Invoice["status"]) => {
  switch (status) {
    case "paid":
      return "bg-success/10 text-success hover:bg-success/20";
    case "unpaid":
      return "bg-warning/10 text-warning hover:bg-warning/20";
    case "overdue":
      return "bg-destructive/10 text-destructive hover:bg-destructive/20";
    case "draft":
      return "bg-muted text-muted-foreground hover:bg-muted/80";
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
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function InvoiceTable({
  invoices,
  onView,
  onDownload,
  onDuplicate,
  onDelete,
  onMarkAsPaid,
  selectedIds = [],
  onSelectionChange,
  onBulkAction,
}: InvoiceTableProps) {
  const toggleSelection = (id: string) => {
    if (onSelectionChange) {
      const newSelectedIds = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelectedIds);
    }
  };

  const toggleAll = () => {
    if (onSelectionChange) {
      const newSelectedIds = selectedIds.length === invoices.length
        ? []
        : invoices.map((inv) => inv.id);
      onSelectionChange(newSelectedIds);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedIds.length === invoices.length && invoices.length > 0}
                onChange={toggleAll}
                className="rounded border-border"
              />
            </TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onView(invoice)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(invoice.id)}
                    onChange={() => toggleSelection(invoice.id)}
                    className="rounded border-border"
                  />
                </TableCell>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.clientName}</TableCell>
                <TableCell className="font-semibold">
                  {invoice.currency} {invoice.total.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      getPaymentStatusColor(invoice.paymentStatus)
                    )}
                  >
                    {invoice.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(invoice.date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => onView(invoice)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownload?.(invoice)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate?.(invoice)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {invoice.status !== "paid" && (
                        <DropdownMenuItem onClick={() => onMarkAsPaid?.(invoice)}>
                          <Check className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDelete?.(invoice)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
