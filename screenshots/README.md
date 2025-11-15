# QuickBill Desk

**QuickBill Desk** is a modern, enterprise-ready invoicing and client management system built with a clean architecture, complete frontend, and backend stack.  

---

## 🚀 Features Overview

- **Client Management**: Easily manage clients, add new clients, and view client details.
- **Invoice Handling**: Create, view, and manage invoices.
- **Dashboard Analytics**: Gain insights from admin dashboards.
- **Settings & Configuration**: Customize system behavior.
- **Secure Authentication**: Login and role-based access control.
- **Backup & Recovery**: Automated backups for data protection.

---

## 📂 Project Structure

Refer to [Project Structure](./docs/project-structure.md) for a detailed file and folder architecture.

---

## 🎨 UI Showcase

### Login Screens
| Empty Login | Filled Login |
|------------|--------------|
| ![Login Empty](screenshots/Login_Page_Empty.jpg) | ![Login Filled](screenshots/Login_Page_Filled.jpg) |

### Admin Dashboard
| Dashboard Light | Dashboard Dark | Bulk Operations |
|-----------------|----------------|----------------|
| ![Dashboard Light](screenshots/Admin_Dashboard_Page_A.jpg) | ![Dashboard Dark](screenshots/Dashboard_Dark.jpg) | ![Bulk Operations](screenshots/Dashboard_Page_Bulk.jpg) |

### Client Management
| Client List | Create Client |
|-------------|---------------|
| ![Clients](screenshots/ClinetManagement_Page.jpg) | ![Create Client](screenshots/Create_Clinet_Form.jpg) |

### Invoice Management
| Create Invoice | Invoice History | PDF Export |
|----------------|----------------|------------|
| ![Create Invoice](screenshots/Create_Invoce_Page.jpg) | ![Invoice History](screenshots/InvoiceHistory_Page.jpg) | ![Invoice PDF](Invoice_Pdf/INV-0014.pdf) |

### Settings
| Settings Overview | Full Settings |
|------------------|---------------|
| ![Settings](screenshots/Settings_Page.jpg) | ![Full Settings](screenshots/Settings_Page_Full.jpg) |

---

## ⚙️ Technical Highlights

### Backend
- **MVC Pattern** with separation of concerns
- **Controllers**: Auth, Client, Invoice, Bulk, Email, Settings, Health
- **Models**: MongoDB schemas for Client, Invoice, Settings
- **Utilities**: PDF generation, backup automation, validation, and more

### Frontend
- **React + TypeScript** for type safety
- **71+ UI Components** built with Shadcn/ui
- **Pages**: 12 core pages including Dashboard, Clients, Invoices, Settings
- **Tailwind CSS** for responsive UI

### Production Features
- Docker-ready deployment
- API documentation in `docs/`
- Automated data backups
- Testing scripts for backend validation

---

## 📚 Documentation

- [API Overview](./docs/api-overview.md)  
- [System Design](./docs/system-design.md)  
- [Modules Summary](./docs/modules-summary.md)  
- [UI Showcase](./docs/ui-showcase.md)  
- [Purchase Process](./docs/purchase-process.md)  
- [Startup Guide](./startup-guide.md)  

---

*QuickBill Desk is designed for scalability, security, and ease of use for small to medium enterprises.*
