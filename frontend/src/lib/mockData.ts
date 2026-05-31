import { Invoice, Client, DashboardStats } from "./types";

/**
 * Mock client data for development and testing
 */
export const mockClients: Client[] = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "contact@acme.com",
    address: "123 Business Ave, New York, NY 10001",
    phone: "+1 (555) 123-4567",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Tech Solutions Inc.",
    email: "hello@techsolutions.com",
    address: "456 Innovation Drive, San Francisco, CA 94102",
    phone: "+1 (555) 987-6543",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Mock invoice data for development and testing
 */
export const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-0001",
    clientId: "1",
    clientName: "Acme Corporation",
    clientEmail: "contact@acme.com",
    clientAddress: "123 Business Ave, New York, NY 10001",
    businessName: "QuickBill Solutions",
    businessEmail: "billing@quickbill.com",
    businessAddress: "789 Commerce St, Austin, TX 78701",
    items: [
      {
        id: "1",
        description: "Website Development",
        quantity: 1,
        price: 5000,
        total: 5000,
      },
      {
        id: "2",
        description: "SEO Optimization",
        quantity: 1,
        price: 1500,
        total: 1500,
      },
    ],
    subtotal: 6500,
    tax: 650,
    taxRate: 10,
    discount: 0,
    total: 7150,
    currency: "USD",
    status: "paid",
    date: "2025-01-15",
    dueDate: "2025-02-14",
    notes: "Thank you for your business!",
    createdAt: new Date("2025-01-15").toISOString(),
    updatedAt: new Date("2025-01-15").toISOString(),
  },
  {
    id: "2",
    invoiceNumber: "INV-0002",
    clientId: "2",
    clientName: "Tech Solutions Inc.",
    clientEmail: "hello@techsolutions.com",
    clientAddress: "456 Innovation Drive, San Francisco, CA 94102",
    businessName: "QuickBill Solutions",
    businessEmail: "billing@quickbill.com",
    businessAddress: "789 Commerce St, Austin, TX 78701",
    items: [
      {
        id: "1",
        description: "Mobile App Design",
        quantity: 1,
        price: 8000,
        total: 8000,
      },
    ],
    subtotal: 8000,
    tax: 800,
    taxRate: 10,
    discount: 500,
    total: 8300,
    currency: "USD",
    status: "unpaid",
    date: "2025-02-01",
    dueDate: "2025-03-03",
    createdAt: new Date("2025-02-01").toISOString(),
    updatedAt: new Date("2025-02-01").toISOString(),
  },
];

/**
 * Mock dashboard statistics for development and testing
 */
export const mockStats: DashboardStats = {
  totalInvoices: 2,
  totalRevenue: 15450,
  unpaidCount: 1,
  unpaidAmount: 8300,
  overdueCount: 0,
  paidCount: 1,
};
