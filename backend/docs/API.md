# QuickBill Desk API Documentation

**Version**: 1.0.0  
**Base URL**: http://localhost:3001

## Authentication

### POST /api/auth/login

Authenticate admin user and receive JWT token

---

## System

### GET /api/health

Get comprehensive system health status

---

## Invoices

### GET /api/invoices

Retrieve all invoices with optional filtering

**Authentication Required**: Yes

**Parameters**:

- `search` (query): Search in invoice number or client name
- `status` (query): Filter by invoice status

---

### POST /api/invoices

Create a new invoice

**Authentication Required**: Yes

---

### GET /api/invoices/{id}

Retrieve a specific invoice by its ID

**Authentication Required**: Yes

**Parameters**:

- `id` (path): No description

---

### PUT /api/invoices/{id}

Update an existing invoice

**Authentication Required**: Yes

**Parameters**:

- `id` (path): No description

---

### DELETE /api/invoices/{id}

Delete an invoice by ID

**Authentication Required**: Yes

**Parameters**:

- `id` (path): No description

---

## Clients

### GET /api/clients

Retrieve all clients with optional search

**Authentication Required**: Yes

**Parameters**:

- `search` (query): Search in client name or email

---

### POST /api/clients

Create a new client

**Authentication Required**: Yes

---

