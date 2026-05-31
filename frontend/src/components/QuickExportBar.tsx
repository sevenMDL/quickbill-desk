import React from "react";
import { Download, FileText, Users, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ExportButton from "./ExportButton";
import { ReportType } from "@/lib/types";

interface QuickExportBarProps {
  className?: string;
}

/**
 * QuickExportBar - Provides quick access to common exports
 * @component
 * @param {QuickExportBarProps} props - Component properties
 * @returns {JSX.Element} Card with quick export options
 */
export default function QuickExportBar({ className = "" }: QuickExportBarProps) {
  const quickExports: Array<{
    type: ReportType;
    label: string;
    description: string;
    icon: JSX.Element;
  }> = [
    {
      type: 'dashboard_summary',
      label: 'Dashboard Summary',
      description: 'Current stats and overview',
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      type: 'invoice_list',
      label: 'Invoice List', 
      description: 'All invoices with details',
      icon: <FileText className="h-5 w-5" />
    },
    {
      type: 'client_list',
      label: 'Client Directory',
      description: 'Client contact information',
      icon: <Users className="h-5 w-5" />
    }
  ];

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-sm">Quick Exports</h3>
              <p className="text-xs text-muted-foreground">
                Export your data for analysis and reporting
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickExports.map((item) => (
            <div 
              key={item.type}
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ExportButton
                reportType={item.type}
                variant="ghost"
                size="sm"
                label=""
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
