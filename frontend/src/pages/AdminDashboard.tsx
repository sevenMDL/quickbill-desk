import { useState, useEffect, useRef } from "react";
import { Shield, Database, Server, Users, FileText, Download, Upload, Activity, TrendingUp, TrendingDown, DollarSign, Calendar, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/AuthProvider";
import { healthApi, backupApi, invoiceApi } from "@/lib/api";
import { toast } from "sonner";
import { Invoice } from "@/lib/types";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import ExportButton from "@/components/ExportButton";
import { handleError, processError } from '@/lib/errorMessages';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: {
    status: string;
    latency: string;
    type: string;
  };
  services: {
    email: string;
    pdf_generation: string;
    backup: string;
  };
  business_metrics: {
    total_invoices: number;
    total_clients: number;
    unpaid_amount: number;
  };
}

interface Backup {
  filename: string;
  size: string;
  created: string;
  encrypted: boolean;
  stats: {
    invoices: number;
    clients: number;
    settings: number;
  };
}

interface BusinessInsights {
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  averageInvoiceAmount: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

const defaultHealth: SystemHealth = {
  status: 'unhealthy',
  timestamp: new Date().toISOString(),
  database: {
    status: 'unknown',
    latency: 'unknown',
    type: 'unknown'
  },
  services: {
    email: 'unknown',
    pdf_generation: 'unknown',
    backup: 'unknown'
  },
  business_metrics: {
    total_invoices: 0,
    total_clients: 0,
    unpaid_amount: 0
  }
};

const defaultBusinessInsights: BusinessInsights = {
  paidInvoices: 0,
  unpaidInvoices: 0,
  overdueInvoices: 0,
  averageInvoiceAmount: 0,
  recentActivity: []
};

/**
 * AdminDashboard - Administrative interface for system monitoring and management
 * @component
 * @returns {JSX.Element} Comprehensive admin dashboard with system health and backup management
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth>(defaultHealth);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [businessInsights, setBusinessInsights] = useState<BusinessInsights>(defaultBusinessInsights);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    filename: string;
  }>({ open: false, filename: "" });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    fetchData(signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [retryCount]);

		/**
		 * Fetches comprehensive admin data from multiple endpoints
		 */
		const fetchData = async (signal?: AbortSignal) => {
		  if (signal?.aborted) return;

		  try {
		    setLoading(true);

		    const [healthResult, backupsResult, invoicesResult] = await Promise.allSettled([
		      healthApi.getSystemHealth(),
		      backupApi.listBackups(),
		      invoiceApi.getAll()
		    ]);

		    if (signal?.aborted) return;

		    // Health data
		    if (healthResult.status === 'fulfilled') {
		      setHealth(healthResult.value || defaultHealth);
		    } else {
		      const errorInfo = processError(healthResult.reason);
		      console.error('Health fetch failed:', errorInfo.userMessage);
		      setHealth(defaultHealth);
		    }

		    // Backup data
		    if (backupsResult.status === 'fulfilled') {
		      const backupResult = backupsResult.value;
		      const backupData = backupResult.data?.backups || [];
		      setBackups(backupData);
		    } else {
		      const errorInfo = processError(backupsResult.reason);
		      console.error('Backups fetch failed:', errorInfo.userMessage);
		      setBackups([]);
		    }

		    // Invoice data for business insights
		    if (invoicesResult.status === 'fulfilled') {
		      const invoicesData = invoicesResult.value || [];
		      
		      const paidInvoices = invoicesData.filter((inv: Invoice) => inv.status === 'paid').length;
		      const unpaidInvoices = invoicesData.filter((inv: Invoice) => inv.status === 'unpaid').length;
		      const overdueInvoices = invoicesData.filter((inv: Invoice) => inv.status === 'overdue').length;
		      const totalAmount = invoicesData.reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0);
		      const averageInvoiceAmount = invoicesData.length > 0 ? totalAmount / invoicesData.length : 0;

		      const recentActivity = invoicesData
		        .sort((a: Invoice, b: Invoice) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
		        .slice(0, 5)
		        .map((inv: Invoice) => ({
		          type: 'invoice_created',
		          description: `Invoice ${inv.invoiceNumber} created for ${inv.clientName}`,
		          timestamp: inv.createdAt || new Date().toISOString()
		        }));

		      setBusinessInsights({
		        paidInvoices,
		        unpaidInvoices,
		        overdueInvoices,
		        averageInvoiceAmount,
		        recentActivity
		      });
		    } else {
		      const errorInfo = processError(invoicesResult.reason);
		      console.error('Invoices fetch failed:', errorInfo.userMessage);
		      setBusinessInsights(defaultBusinessInsights);
		    }

		  } catch (error) {
		    if (error instanceof DOMException && error.name === 'AbortError') {
		      return;
		    }
		    const userMessage = handleError(error, 'AdminDashboard-FetchData');
		    toast.error(userMessage);
		  } finally {
		    if (!signal?.aborted) {
		      setLoading(false);
		    }
		  }
		};

		/**
		 * Retries data fetching with cleanup of previous requests
		 */
		const handleRetry = () => {
		  if (abortControllerRef.current) {
		    abortControllerRef.current.abort();
		  }
		  setRetryCount(prev => prev + 1);
		  toast.info('Refreshing admin data...');
		};
		/**
		 * Creates new system backup with optional encryption
		 */
		const handleCreateBackup = async (encrypt: boolean = true) => {
		  setCreatingBackup(true);
		  try {
		    const result = await backupApi.createBackup({ encrypt });
		    if (result.success) {
		      toast.success("Backup created successfully");
		      const controller = new AbortController();
		      fetchData(controller.signal);
		    } else {
		      throw new Error(result.error || "Failed to create backup");
		    }
		  } catch (error: any) {
		    if (error instanceof DOMException && error.name === 'AbortError') return;
		    const userMessage = handleError(error, 'AdminDashboard-CreateBackup');
		    toast.error(userMessage);
		  } finally {
		    setCreatingBackup(false);
		  }
		};

  /**
   * Opens restore confirmation dialog for backup restoration
   * @param {string} filename - Backup filename to restore
   */
  const handleOpenRestoreDialog = (filename: string) => {
    setRestoreDialog({ open: true, filename });
  };

		/**
		 * Handles backup restoration after user confirmation
		 */
		const handleRestoreBackup = async () => {
		  const { filename } = restoreDialog;

		  try {
		    const result = await backupApi.restoreBackup(filename);
		    if (result.success) {
		      toast.success("Backup restored successfully");
		      // Refresh data after restoration
		      const controller = new AbortController();
		      fetchData(controller.signal);
		    } else {
		      throw new Error(result.error || "Failed to restore backup");
		    }
		  } catch (error: any) {
		    const userMessage = handleError(error, 'AdminDashboard-RestoreBackup');
		    toast.error(userMessage);
		  } finally {
		    setRestoreDialog({ open: false, filename: "" });
		  }
		};

		/**
		 * Downloads a backup file
		 */
		const handleDownloadBackup = async (filename: string) => {
		  try {
		    toast.info(`Starting download: ${filename}`);
		    await backupApi.downloadBackup(filename);
		    toast.success(`Downloaded: ${filename}`);
		  } catch (error: any) {
		    const userMessage = handleError(error, 'AdminDashboard-DownloadBackup');
		    toast.error(userMessage);
		  }
		};

  /**
   * Formats file size for user-friendly display
   * @param {string} sizeMB - Size in MB as string
   * @param {number} sizeBytes - Size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = (sizeMB: string, sizeBytes?: number): string => {
    const mbValue = parseFloat(sizeMB);
    
    if (mbValue < 0.01 && sizeBytes) {
      // Show in KB for very small files
      const kbSize = (sizeBytes / 1024).toFixed(1);
      return `${kbSize} KB`;
    } else if (mbValue < 1) {
      // Show in MB with more precision for files under 1MB
      return `${mbValue.toFixed(3)} MB`;
    } else {
      // Use the original MB format for larger files
      return `${sizeMB} MB`;
    }
  };

  /**
   * Gets badge color based on system status
   * @param {string} status - System or service status
   * @returns {string} Tailwind CSS classes for badge styling
   */
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';

    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  const currentHealth = health || defaultHealth;
  const currentInsights = businessInsights || defaultBusinessInsights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            reportType="dashboard_summary"
            variant="outline"
            label="Export Report"
          />
          <Badge variant="secondary" className="capitalize">
            {user?.role || 'user'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="backups">Backup Management</TabsTrigger>
          <TabsTrigger value="health">Detailed Health</TabsTrigger>
          <TabsTrigger value="reports">Reports & Exports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge className={getStatusColor(currentHealth.status)}>
                    {currentHealth.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked: {new Date(currentHealth.timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge className={getStatusColor(currentHealth.database.status)}>
                    {currentHealth.database.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {currentHealth.database.latency} • {currentHealth.database.type}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentHealth.business_metrics.total_invoices}</div>
                <p className="text-xs text-muted-foreground">
                  Total invoices in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentHealth.business_metrics.total_clients}</div>
                <p className="text-xs text-muted-foreground">
                  Active clients
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Business Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Business Insights</CardTitle>
              <CardDescription>
                Key performance indicators and recent activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-600">{currentInsights.paidInvoices}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unpaid Invoices</p>
                    <p className="text-2xl font-bold text-yellow-600">{currentInsights.unpaidInvoices}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{currentInsights.overdueInvoices}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Invoice</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${currentInsights.averageInvoiceAmount.toFixed(2)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {currentInsights.recentActivity.length > 0 ? (
                    currentInsights.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>
                Current status of all system services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(currentHealth.services).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{service.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">Service</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => handleCreateBackup(true)}
                  disabled={creatingBackup}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  {creatingBackup ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={handleRetry}>
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Management Tab */}
        <TabsContent value="backups" className="space-y-6">
          <div className="grid gap-6">
            {/* Backup Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Backup Actions</CardTitle>
                <CardDescription>
                  Create new backups and manage existing ones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleCreateBackup(false)}
                    variant="outline"
                    disabled={creatingBackup}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {creatingBackup ? "Creating..." : "Create Backup"}
                  </Button>
                  <Button
                    onClick={() => handleCreateBackup(true)}
                    variant="outline"
                    disabled={creatingBackup}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {creatingBackup ? "Creating..." : "Create Encrypted Backup"}
                  </Button>
                </div>
              </CardContent>
            </Card>

												{/* Backup Files List */}
												<Card>
												  <CardHeader>
												    <CardTitle className="flex items-center gap-2">
												      <File className="h-5 w-5" />
												      Backup Files
												      <Badge variant="outline">{backups.length}</Badge>
												    </CardTitle>
												    <CardDescription className="flex items-center justify-between">
												      <span>Available backup files for download and restoration</span>
												      <Button
												        variant="outline"
												        size="sm"
												        onClick={handleRetry}
												        disabled={loading}
												      >
												        {loading ? "Refreshing..." : "Refresh"}
												      </Button>
												    </CardDescription>
												  </CardHeader>
												  <CardContent>
												    {loading ? (
												      <div className="text-center py-8">
												        <div className="text-muted-foreground">Loading backup files...</div>
												      </div>
												    ) : backups.length === 0 ? (
												      <div className="text-center py-8 text-muted-foreground">
												        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
												        <p>No backup files found</p>
												        <p className="text-sm mt-1">Create your first backup to see it here</p>
												      </div>
												    ) : (
												      <div className="space-y-3">
												        {backups.map((backup, index) => (
												          <Card key={backup.filename || index}>
												            <CardContent className="p-4">
												              <div className="flex items-center justify-between">
												                <div className="flex items-center space-x-3">
												                  <File className="h-8 w-8 text-muted-foreground" />
												                  <div>
												                    <div className="font-medium">{backup.filename}</div>
												                    <div className="text-sm text-muted-foreground mt-1">
												                      Size: {formatFileSize(backup.sizeMB, backup.size)} •
												                      Created: {new Date(backup.created).toLocaleDateString()} •
												                      {backup.encrypted ? ' 🔒 Encrypted' : ' 🔓 Not Encrypted'}
												                    </div>
												                  </div>
												                </div>
												                <div className="flex items-center space-x-2">
												                  <Button
												                    className="bg-gradient-primary text-primary-foreground hover:opacity-90"
												                    size="sm"
												                    onClick={() => handleDownloadBackup(backup.filename)}
												                  >
												                    <Download className="h-4 w-4 mr-1" />
												                    Download
												                  </Button>

												                  <Button
												                    className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
												                    size="sm"
												                    onClick={() => handleOpenRestoreDialog(backup.filename)}
												                  >
												                    <Upload className="h-4 w-4 mr-1" />
												                    Restore
												                  </Button>
												                </div>
												              </div>
												            </CardContent>
												          </Card>
												        ))}
												      </div>
												    )}
												  </CardContent>
												</Card>
          </div>
        </TabsContent>

        {/* Detailed Health Tab */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Detailed System Health</CardTitle>
              <CardDescription>
                Comprehensive system metrics and performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Database Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge className={getStatusColor(currentHealth.database.status)}>
                          {currentHealth.database.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency:</span>
                        <span>{currentHealth.database.latency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="capitalize">{currentHealth.database.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Business Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Invoices:</span>
                        <span>{currentHealth.business_metrics.total_invoices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Clients:</span>
                        <span>{currentHealth.business_metrics.total_clients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unpaid Amount:</span>
                        <span>${currentHealth.business_metrics.unpaid_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Service Status</h4>
                  <div className="grid gap-3">
                    {Object.entries(currentHealth.services).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="capitalize">{service.replace('_', ' ')}</span>
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(currentHealth.timestamp).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports & Exports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6">
            {/* Quick Export Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Dashboard Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Current system stats, revenue overview, and performance metrics
                  </p>
                  <ExportButton
                    reportType="dashboard_summary"
                    variant="outline"
                    size="sm"
                    label="Export Dashboard"
                  />
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Invoice Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete invoice list with status, amounts, and client details
                  </p>
                  <ExportButton
                    reportType="invoice_list"
                    variant="outline"
                    size="sm"
                    label="Export Invoices"
                  />
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Client Directory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Client contact information with invoice statistics and revenue data
                  </p>
                  <ExportButton
                    reportType="client_list"
                    variant="outline"
                    size="sm"
                    label="Export Clients"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Export Formats Info */}
            <Card>
              <CardHeader>
                <CardTitle>Export Formats</CardTitle>
                <CardDescription>
                  Available export formats and their use cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <FileText className="h-6 w-6 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">PDF Documents</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Professional reports for printing and sharing. Includes charts and formatted layouts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <FileText className="h-6 w-6 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">CSV Spreadsheets</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Raw data for analysis in spreadsheet software. Ideal for data processing and calculations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <FileText className="h-6 w-6 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Excel Workbooks</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Advanced formatting for Microsoft Excel. Includes multiple sheets and formulas.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Export Actions</CardTitle>
                <CardDescription>
                  Export multiple reports at once for comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Complete Business Report</h4>
                      <p className="text-sm text-muted-foreground">
                        All dashboard data, invoices, and client information in one package
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ExportButton
                        reportType="dashboard_summary"
                        variant="outline"
                        size="sm"
                        label="PDF"
                      />
                      <ExportButton
                        reportType="dashboard_summary"
                        variant="outline"
                        size="sm"
                        label="CSV"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Financial Overview</h4>
                      <p className="text-sm text-muted-foreground">
                        Revenue, expenses, and profitability analysis
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ExportButton
                        reportType="dashboard_summary"
                        variant="outline"
                        size="sm"
                        label="PDF"
                      />
                      <ExportButton
                        reportType="dashboard_summary"
                        variant="outline"
                        size="sm"
                        label="Excel"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Backup Restoration Confirmation Dialog */}
      <ConfirmationDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog(prev => ({ ...prev, open }))}
        title="Restore Backup"
        description={`Are you sure you want to restore from backup "${restoreDialog.filename}"?\n\nThis action will replace all current data with the backup data and cannot be undone.`}
        confirmText="Restore Backup"
        variant="destructive"
        onConfirm={handleRestoreBackup}
      />
    </div>
  );
}
