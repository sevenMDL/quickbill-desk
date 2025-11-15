# Project Structure

## 🏗️ Complete Codebase Architecture

quickbill-desk/
├──backend/
│├── src/
││   ├── config/          # Database & app configuration
││   ├── controllers/     # API route handlers (7 controllers)
││   ├── middleware/      # Auth, validation, security (7 middleware)
││   ├── models/          # MongoDB schemas (Client, Invoice, Settings)
││   ├── routes/          # API endpoints (8 route files)
││   ├── services/        # Business logic (AutoBackup, Bulk, Email)
││   ├── utils/           # Utilities (PDF, Backup, Validation - 8 utils)
││   └── validation/      # Data validation schemas
│├── docs/               # API documentation
│├── scripts/            # Database helpers & testing
│└── backups/            # Automated backup files
└──frontend/
├── src/
│   ├── components/     # 71+ React components
│   │   ├── ui/         # Shadcn/ui component library
│   │   ├── AuthProvider.tsx
│   │   ├── BulkActionsBar.tsx
│   │   ├── InvoiceForm.tsx
│   │   └── InvoiceTable.tsx
│   ├── pages/          # 12 application pages
│   ├── hooks/          # Custom React hooks
│   └── lib/            # API clients, types, utilities
├── public/             # Static assets
└── configuration/      # Build & linting config

## 🔧 Key Technical Highlights

### Backend Architecture
- **MVC Pattern**: Clean separation of concerns
- **7 Controllers**: Auth, Invoice, Client, Bulk, Email, Health, Settings
- **8 Middleware**: Comprehensive request processing
- **3 Data Models**: Optimized MongoDB schemas
- **8 Utility Modules**: PDF generation, backup management, etc.

### Frontend Architecture  
- **71+ Components**: Extensive UI library
- **12 Pages**: Complete application workflow
- **TypeScript**: Full type safety
- **Modern Stack**: React, Vite, Tailwind, Shadcn/ui

### Production Features
- **Docker Ready**: Containerized deployment
- **API Documentation**: OpenAPI specs included
- **Testing Scripts**: Backend validation tools
- **Backup System**: Automated data protection

## 📊 Scale & Completeness
- **160+ Files**: Comprehensive codebase
- **23 Directories**: Organized architecture  
- **7,000+ Lines**: Production-quality code
- **Full Documentation**: API specs, deployment guides

*Structure demonstrates enterprise-ready application architecture*
