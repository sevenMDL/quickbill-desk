import { useState } from "react";
import { Check, Mail, Download, Trash2, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { handleError } from '@/lib/errorMessages';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkStatusUpdate: (status: 'paid' | 'unpaid' | 'draft') => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onBulkEmail: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

/**
 * BulkActionsBar - Floating action bar for bulk invoice operations
 * @component
 * @param {BulkActionsBarProps} props - Component properties for bulk actions
 * @returns {JSX.Element} Fixed bottom bar with bulk action controls
 */
export default function BulkActionsBar({
  selectedCount,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkDownload,
  onBulkEmail,
  onClearSelection,
  loading = false
}: BulkActionsBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (selectedCount === 0) return null;

		/**
		 * Handles quick action execution from dropdown menu
		 */
		const handleQuickAction = (action: string) => {
		  try {
		    switch (action) {
		      case 'mark-paid':
		        onBulkStatusUpdate('paid');
		        break;
		      case 'mark-unpaid':
		        onBulkStatusUpdate('unpaid');
		        break;
		      case 'download':
		        onBulkDownload();
		        break;
		      case 'email':
		        onBulkEmail();
		        break;
		      case 'delete':
		        onBulkDelete();
		        break;
		      default:
		        console.warn(`Unknown bulk action: ${action}`);
		    }
		    setIsDropdownOpen(false);
		  } catch (error) {
		    const userMessage = handleError(error, 'BulkActionsBar-QuickAction');
		    console.error('Bulk action failed:', userMessage);
		    setIsDropdownOpen(false);
		  }
		};

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 min-w-80">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            {selectedCount} selected
          </Badge>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Invoice{selectedCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {/* Mark as Paid - Primary Action */}
          <Button
            size="sm"
            onClick={() => handleQuickAction('mark-paid')}
            disabled={loading}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8 px-3"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Mark Paid
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                disabled={loading}
                className="h-8 px-2 border-border"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-popover w-48">
              <DropdownMenuItem onClick={() => handleQuickAction('mark-unpaid')}>
                <Check className="h-4 w-4 mr-2" />
                Mark as Unpaid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickAction('download')}>
                <Download className="h-4 w-4 mr-2" />
                Download PDFs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickAction('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Send Emails
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleQuickAction('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={loading}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 ml-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
