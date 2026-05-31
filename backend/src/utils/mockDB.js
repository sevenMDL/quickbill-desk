/**
 * In-Memory Database - Development fallback when MongoDB is unavailable
 * @module utils/mockDB
 * @description Simple in-memory database for development and testing
 */

// Simple in-memory database for development
let clients = [];
let invoices = [];
let settings = [{
  defaultCurrency: "USD",
  defaultTaxRate: 0,
  invoicePrefix: "INV",
  autoNumbering: true,
  businessName: "QuickBill Desk",
  businessEmail: "hello@quickbill.com",
  businessAddress: "123 Business St, City, Country",
  businessLogo: "",
  paymentTerms: "Payment is due within 30 days.",
  defaultDueDays: 30
}];

/**
 * Generate unique ID for mock records
 * @returns {string} Unique identifier
 */
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

module.exports = {
  // Client operations
  clients: {
    find: (query = {}) => {
      let results = [...clients];
      
      if (query.$or) {
        results = results.filter(client => 
          query.$or.some(condition => 
            Object.entries(condition).some(([field, value]) => 
              client[field] && client[field].toString().toLowerCase().includes(value.$regex.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            )
          )
        );
      }
      
      return {
        sort: (sortCriteria) => {
          if (sortCriteria.createdAt === -1) {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return {
            lean: () => results
          };
        },
        lean: () => results
      };
    },
    
    findById: (id) => {
      const client = clients.find(c => c.id === id);
      return {
        lean: () => client
      };
    },
    
    create: (data) => {
      const newClient = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      clients.push(newClient);
      return newClient;
    },
    
    findByIdAndUpdate: (id, updateData) => {
      const index = clients.findIndex(c => c.id === id);
      if (index !== -1) {
        clients[index] = {
          ...clients[index],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        return clients[index];
      }
      return null;
    },
    
    findByIdAndDelete: (id) => {
      const index = clients.findIndex(c => c.id === id);
      if (index !== -1) {
        return clients.splice(index, 1)[0];
      }
      return null;
    },
    
    countDocuments: () => {
      return clients.length;
    }
  },

  // Invoice operations
  invoices: {
    find: (query = {}) => {
      let results = [...invoices];
      
      // Search filter
      if (query.$or) {
        results = results.filter(invoice => 
          query.$or.some(condition => 
            Object.entries(condition).some(([field, value]) => 
              invoice[field] && invoice[field].toString().toLowerCase().includes(value.$regex.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            )
          )
        );
      }
      
      // Status filter
      if (query.status) {
        results = results.filter(invoice => invoice.status === query.status);
      }
      
      return {
        populate: () => ({
          sort: (sortCriteria) => {
            if (sortCriteria.createdAt === -1) {
              results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
            return {
              lean: () => results
            };
          }
        }),
        sort: (sortCriteria) => {
          if (sortCriteria.createdAt === -1) {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return {
            lean: () => results
          };
        },
        lean: () => results
      };
    },
    
    findById: (id) => {
      const invoice = invoices.find(i => i.id === id);
      return {
        populate: () => ({
          lean: () => invoice
        }),
        lean: () => invoice
      };
    },
    
    create: (data) => {
      const newInvoice = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      invoices.push(newInvoice);
      return newInvoice;
    },
    
    findByIdAndUpdate: (id, updateData) => {
      const index = invoices.findIndex(i => i.id === id);
      if (index !== -1) {
        invoices[index] = {
          ...invoices[index],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        return invoices[index];
      }
      return null;
    },
    
    findByIdAndDelete: (id) => {
      const index = invoices.findIndex(i => i.id === id);
      if (index !== -1) {
        return invoices.splice(index, 1)[0];
      }
      return null;
    },
    
    aggregate: () => {
      const stats = {
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
        unpaidCount: invoices.filter(inv => inv.status === 'unpaid').length,
        unpaidAmount: invoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + inv.total, 0),
        overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
        paidCount: invoices.filter(inv => inv.status === 'paid').length
      };
      
      return [stats];
    },
    
    findOne: (query = {}) => {
      if (query.invoiceNumber) {
        const invoice = invoices.find(i => i.invoiceNumber === query.invoiceNumber.$regex.replace(/^\^|\$$/g, ''));
        return {
          sort: () => ({
            lean: () => invoice
          }),
          lean: () => invoice
        };
      }
      return {
        sort: () => ({
          lean: () => null
        }),
        lean: () => null
      };
    }
  },

  // Settings operations
  settings: {
    findOne: () => {
      return {
        lean: () => settings[0]
      };
    },
    
    create: (data) => {
      settings[0] = {
        ...settings[0],
        ...data,
        updatedAt: new Date().toISOString()
      };
      return settings[0];
    },
    
    findOneAndUpdate: (query, updateData) => {
      settings[0] = {
        ...settings[0],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      return settings[0];
    }
  }
};
