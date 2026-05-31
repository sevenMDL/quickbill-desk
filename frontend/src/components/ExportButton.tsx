import React, { useState } from "react";
import { Download, FileText, Table, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportFormat, ReportType } from "@/lib/types";
import { exportApi } from "@/lib/api";
import { toast } from "sonner";
import { handleError } from '@/lib/errorMessages';

interface ExportButtonProps {
  reportType: ReportType;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  filters?: any;
  disabled?: boolean;
}

/**
 * ExportButton - Universal export component for various report types
 * @component
 * @param {ExportButtonProps} props - Component properties
 * @returns {JSX.Element} Dropdown menu with export format options
 */
export default function ExportButton({
  reportType,
  variant = "outline",
  size = "default",
  label = "Export",
  filters,
  disabled = false
}: ExportButtonProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

		/**
		 * Handles export generation and download
		 */
		const handleExport = async (format: ExportFormat) => {
		  setExporting(format);
		  
		  try {
		    let response;
		    
		    switch (reportType) {
		      case 'dashboard_summary':
		        response = await exportApi.exportDashboard(format);
		        break;
		      case 'invoice_list':
		        response = await exportApi.exportInvoices(format);
		        break;
		      case 'client_list':
		        response = await exportApi.exportClients(format);
		        break;
		      default:
		        response = await exportApi.generateExport({
		          reportType,
		          format,
		          filters
		        });
		    }

		    if (response.success && response.data) {
		      // Create download link
		      const a = document.createElement('a');
		      a.href = response.data.downloadUrl;
		      a.download = response.data.filename;
		      document.body.appendChild(a);
		      a.click();
		      document.body.removeChild(a);

		      // Clean up URL after download
		      setTimeout(() => {
		        window.URL.revokeObjectURL(response.data.downloadUrl);
		      }, 1000);

		      toast.success(`Exported as ${format.toUpperCase()}`);
		    } else {
		      throw new Error(response.error || "Export failed");
		    }
		  } catch (error: any) {
		    const userMessage = handleError(error, `ExportButton-${reportType}`);
		    toast.error(userMessage);
		    console.error('Export error:', error);
		  } finally {
		    setExporting(null);
		  }
		};
  /**
   * Gets display name for report type
   * @returns {string} Human-readable report type name
   */
  const getReportTypeName = (): string => {
    const names: Record<ReportType, string> = {
      dashboard_summary: 'Dashboard Summary',
      invoice_list: 'Invoice List',
      client_list: 'Client List',
      invoice_details: 'Invoice Details'
    };
    return names[reportType] || reportType;
  };

  /**
   * Gets icon for export format
   * @param {ExportFormat} format - Export format
   * @returns {JSX.Element} Format icon
   */
  const getFormatIcon = (format: ExportFormat): JSX.Element => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <Table className="h-4 w-4" />;
      case 'excel':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  /**
   * Gets display name for export format
   * @param {ExportFormat} format - Export format
   * @returns {string} Human-readable format name
   */
  const getFormatName = (format: ExportFormat): string => {
    return format.toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={disabled || exporting !== null}
          className="flex items-center gap-2"
        >
          {exporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Exporting {exporting.toUpperCase()}...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Export {getReportTypeName()} as:
        </div>
        
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          className="flex items-center gap-2"
        >
          {getFormatIcon('pdf')}
          <span>PDF Document</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          disabled={exporting !== null}
          className="flex items-center gap-2"
        >
          {getFormatIcon('csv')}
          <span>CSV Spreadsheet</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
          className="flex items-center gap-2"
        >
          {getFormatIcon('excel')}
          <span>Excel Workbook</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
