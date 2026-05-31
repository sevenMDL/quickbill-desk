import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client } from "@/lib/types";
import { clientApi } from "@/lib/api";
import { toast } from "sonner";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import ExportButton from "@/components/ExportButton";
import { handleError, processError } from '@/lib/errorMessages';

/**
 * ClientManagement - Comprehensive client information management interface
 * @component
 * @returns {JSX.Element} Client CRUD operations with search and filtering
 */
export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    client: Client | null;
  }>({ open: false, client: null });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

		/**
		 * Fetches all clients from the API
		 */
		const fetchClients = async () => {
		  try {
		    const data = await clientApi.getAll();
		    setClients(data);
		  } catch (error) {
		    const userMessage = handleError(error, 'ClientManagement-FetchClients');
		    toast.error(userMessage);
		  } finally {
		    setLoading(false);
		  }
		};

  /**
   * Filters clients based on search term matching name or email
   */
  const filterClients = () => {
    if (searchTerm) {
      setFilteredClients(
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredClients(clients);
    }
  };

  /**
   * Opens client dialog for create or edit operations
   * @param {Client} [client] - Client data for edit mode, undefined for create
   */
  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        address: client.address,
        phone: client.phone || "",
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", email: "", address: "", phone: "" });
    }
    setIsDialogOpen(true);
  };

  /**
   * Closes client dialog and resets form state
   */
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData({ name: "", email: "", address: "", phone: "" });
  };

  /**
   * Opens deletion confirmation dialog for client
   * @param {Client} client - Client to be deleted
   */
  const handleOpenDeleteDialog = (client: Client) => {
    setDeleteDialog({ open: true, client });
  };


		/**
		 * Handles client deletion after user confirmation
		 */
		const handleDelete = async () => {
		  const { client } = deleteDialog;
		  if (!client) return;

		  try {
		    await clientApi.delete(client.id);
		    toast.success("Client deleted successfully");
		    fetchClients();
		  } catch (error: any) {
		    const errorInfo = processError(error);
		    
		    // Check for specific client has invoices error
		    if (error.message?.includes('Cannot delete client with existing invoices') || 
		        error.errorCode === 'CLIENT_HAS_INVOICES') {
		      toast.error(`Cannot delete client "${client.name}" because they have ${error.invoiceCount || 'existing'} invoices.`);
		    } else {
		      const userMessage = handleError(error, 'ClientManagement-Delete');
		      toast.error(userMessage);
		    }
		  } finally {
		    setDeleteDialog({ open: false, client: null });
		  }
		};

		/**
		 * Handles client form submission for both create and update operations
		 */
		const handleSubmit = async (e: React.FormEvent) => {
		  e.preventDefault();
		  setFormLoading(true);
		  try {
		    if (editingClient) {
		      await clientApi.update(editingClient.id, formData);
		      toast.success("Client updated successfully");
		    } else {
		      await clientApi.create(formData);
		      toast.success("Client created successfully");
		    }
		    fetchClients();
		    handleCloseDialog();
		  } catch (error) {
		    const userMessage = handleError(error, `ClientManagement-${editingClient ? 'Update' : 'Create'}`);
		    toast.error(userMessage);
		  } finally {
		    setFormLoading(false);
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client information and contacts
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            reportType="client_list"
            variant="outline"
            label="Export Clients"
          />
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
								  placeholder="Search clients by name or email..."
								  value={searchTerm}
								  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
								  className="pl-10"
								/>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredClients.length} of {clients.length} clients
      </div>

      {/* Clients Table */}
      <div className="rounded-lg border border-border bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {clients.length === 0 ? "No clients added yet" : "No clients match your search"}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {client.address}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(client)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(client)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <Plus className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add your first client to quickly fill invoice details
          </p>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Client St, City, Country"
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={formLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {formLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {editingClient ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingClient ? "Update Client" : "Create Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Deletion Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Client"
        description={`Are you sure you want to delete "${deleteDialog.client?.name}"? This action cannot be undone.`}
        confirmText="Delete Client"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
