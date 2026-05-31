openapi: 3.0.0
info:
  title: QuickBill Desk API
  description: |
    Professional invoicing and client management system for small businesses.
    
    ## Key Features:
    - Complete invoice management with PDF generation
    - Client management with search and filtering
    - Bulk operations (status updates, email sending, PDF downloads)
    - Automated email system with templates
    - Backup and restore functionality
    - Real-time health monitoring
    - Revision history and audit trails
    
    ## Authentication:
    All protected endpoints require JWT token in Authorization header:
    `Authorization: Bearer <your_jwt_token>`
    
  version: 1.0.0
  contact:
    name: API Support
    email: support@quickbill.com
  license:
    name: Commercial
    url: https://quickbill.com/license

servers:
  - url: http://localhost:3001
    description: Development server
  - url: https://api.quickbill.com/v1
    description: Production server

tags:
  - name: Authentication
    description: User authentication and token management
  - name: Clients
    description: Client management operations
  - name: Invoices
    description: Invoice creation, management, and operations
  - name: Bulk Operations
    description: Bulk actions on multiple invoices
  - name: Email
    description: Email sending and templates
  - name: Settings
    description: Application configuration
  - name: System
    description: Health checks and system monitoring
  - name: Backup
    description: Data backup and restoration

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from login endpoint

  schemas:
    Error:
      type: object
      required:
        - success
        - message
      properties:
        success:
          type: boolean
          example: false
          description: Always false for error responses
        message:
          type: string
          example: "Resource not found"
          description: Human-readable error message
        details:
          type: array
          items:
            type: object
          description: Additional error details (development only)
        stack:
          type: string
          description: Stack trace (development only)

    Success:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
          example: true
          description: Always true for successful responses
        message:
          type: string
          example: "Operation completed successfully"
          description: Success message

    Client:
      type: object
      required:
        - name
        - email
        - address
      properties:
        _id:
          type: string
          format: objectid
          example: "507f1f77bcf86cd799439011"
          description: MongoDB unique identifier
        name:
          type: string
          example: "John Doe"
          description: Client's full name
        email:
          type: string
          format: email
          example: "john@example.com"
          description: Client's email address
        address:
          type: string
          example: "123 Main St, New York, NY 10001"
          description: Client's complete address
        phone:
          type: string
          example: "+1-555-0123"
          description: Client's phone number
        createdAt:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
          description: Creation timestamp
        updatedAt:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
          description: Last update timestamp

    InvoiceItem:
      type: object
      required:
        - description
        - quantity
        - price
      properties:
        description:
          type: string
          example: "Web Development Services"
          description: Item description
        quantity:
          type: number
          minimum: 1
          example: 1
          description: Quantity of items
        price:
          type: number
          minimum: 0
          example: 1000.00
          description: Unit price
        total:
          type: number
          minimum: 0
          example: 1000.00
          description: Calculated total (quantity × price)

    Invoice:
      type: object
      required:
        - clientId
        - clientName
        - clientEmail
        - clientAddress
        - businessName
        - businessEmail
        - businessAddress
        - items
        - date
        - dueDate
        - taxRate
      properties:
        _id:
          type: string
          format: objectid
          example: "507f1f77bcf86cd799439012"
          description: MongoDB unique identifier
        invoiceNumber:
          type: string
          example: "INV-0001"
          description: Auto-generated invoice number
        clientId:
          type: string
          format: objectid
          example: "507f1f77bcf86cd799439011"
          description: Reference to client
        clientName:
          type: string
          example: "John Doe"
          description: Client name (cached for performance)
        clientEmail:
          type: string
          format: email
          example: "john@example.com"
          description: Client email
        clientAddress:
          type: string
          example: "123 Main St, New York, NY 10001"
          description: Client address
        businessName:
          type: string
          example: "QuickBill Desk Inc."
          description: Your business name
        businessEmail:
          type: string
          format: email
          example: "billing@quickbill.com"
          description: Your business email
        businessAddress:
          type: string
          example: "456 Business Ave, San Francisco, CA 94102"
          description: Your business address
        businessLogo:
          type: string
          example: "data:image/png;base64,..."
          description: Base64 encoded logo image
        items:
          type: array
          items:
            $ref: '#/components/schemas/InvoiceItem'
          minItems: 1
          description: Invoice line items
        subtotal:
          type: number
          minimum: 0
          example: 1000.00
          description: Sum of all items totals
        tax:
          type: number
          minimum: 0
          example: 100.00
          description: Calculated tax amount
        taxRate:
          type: number
          minimum: 0
          maximum: 100
          example: 10
          description: Tax rate percentage
        discount:
          type: number
          minimum: 0
          example: 0
          description: Discount amount
        total:
          type: number
          minimum: 0
          example: 1100.00
          description: Final total amount
        currency:
          type: string
          default: "USD"
          example: "USD"
          description: Currency code (ISO 4217)
        status:
          type: string
          enum: [draft, unpaid, paid, overdue]
          default: "draft"
          example: "unpaid"
          description: Invoice status
        date:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
          description: Invoice date
        dueDate:
          type: string
          format: date-time
          example: "2024-02-14T10:30:00Z"
          description: Payment due date
        notes:
          type: string
          example: "Payment due within 30 days"
          description: Additional notes
        createdAt:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
        updatedAt:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"

    LoginRequest:
      type: object
      required:
        - username
        - password
      properties:
        username:
          type: string
          example: "admin"
          description: Admin username
        password:
          type: string
          format: password
          example: "secure_password_123"
          description: Admin password

    LoginResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: "Login successful"
        token:
          type: string
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          description: JWT token for authenticated requests
        expiresIn:
          type: string
          example: "7d"
          description: Token expiration period
        user:
          type: object
          properties:
            username:
              type: string
              example: "admin"
            role:
              type: string
              example: "admin"

    BulkStatusUpdate:
      type: object
      required:
        - invoiceIds
        - status
      properties:
        invoiceIds:
          type: array
          items:
            type: string
            format: objectid
          minItems: 1
          maxItems: 100
          example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
          description: Array of invoice IDs to update
        status:
          type: string
          enum: [draft, unpaid, paid, overdue]
          example: "paid"
          description: New status for all invoices

    BulkEmailRequest:
      type: object
      required:
        - invoiceIds
      properties:
        invoiceIds:
          type: array
          items:
            type: string
            format: objectid
          minItems: 1
          maxItems: 50
          example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
        subject:
          type: string
          example: "Invoice {invoiceNumber} from {businessName}"
          description: Email subject (supports template variables)
        message:
          type: string
          example: "Dear {clientName}, please find your invoice attached."
          description: Email body (supports template variables)
        includePDF:
          type: boolean
          default: true
          description: Attach PDF invoice

    EmailHistory:
      type: object
      properties:
        recipient:
          type: string
          format: email
          example: "john@example.com"
        sentAt:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
        status:
          type: string
          enum: [sent, delivered, failed]
          example: "sent"
        subject:
          type: string
          example: "Invoice INV-0001 from QuickBill Desk"
        errorMessage:
          type: string
          example: "SMTP connection failed"
        messageId:
          type: string
          example: "<20240115103000.12345@quickbill.com>"

    Settings:
      type: object
      properties:
        defaultCurrency:
          type: string
          default: "USD"
          example: "USD"
        defaultTaxRate:
          type: number
          default: 0
          minimum: 0
          maximum: 100
          example: 10
        invoicePrefix:
          type: string
          default: "INV"
          example: "INV"
        autoNumbering:
          type: boolean
          default: true
        businessName:
          type: string
          example: "QuickBill Desk Inc."
        businessEmail:
          type: string
          format: email
          example: "hello@quickbill.com"
        businessAddress:
          type: string
          example: "123 Business St, City, Country"
        businessLogo:
          type: string
          example: "data:image/png;base64,..."
        paymentTerms:
          type: string
          example: "Payment due within 30 days"
        defaultDueDays:
          type: number
          default: 30
          minimum: 1
          example: 30
        emailSubject:
          type: string
          example: "Invoice {invoiceNumber} from {businessName}"
        emailTemplate:
          type: string
          example: "Dear {clientName}, please find your invoice attached."
        emailFrom:
          type: string
          format: email
          example: "billing@quickbill.com"
        autoBackup:
          type: boolean
          default: false
        backupEncryption:
          type: boolean
          default: false
        retentionDays:
          type: number
          default: 30
          minimum: 1
          maximum: 365
          example: 30
        backupSchedule:
          type: string
          default: "0 2 * * *"
          example: "0 2 * * *"
          description: Cron expression for automatic backups

    HealthStatus:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
          example: "healthy"
        timestamp:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
        version:
          type: string
          example: "1.0.0"
        responseTime:
          type: string
          example: "45ms"
        database:
          type: object
          properties:
            status:
              type: string
              example: "connected"
            type:
              type: string
              example: "mongodb"
            latency:
              type: string
              example: "12ms"
        system:
          type: object
          properties:
            uptime:
              type: string
              example: "2 days 5 hours"
            memory_usage:
              type: object
              properties:
                used:
                  type: string
                  example: "45MB"
                total:
                  type: string
                  example: "128MB"
                percentage:
                  type: string
                  example: "35.2%"
        business_metrics:
          type: object
          properties:
            total_invoices:
              type: number
              example: 25
            total_clients:
              type: number
              example: 10
            total_revenue:
              type: number
              example: 12500.50
            unpaid_amount:
              type: number
              example: 3500.00

    BackupInfo:
      type: object
      properties:
        filename:
          type: string
          example: "quickbill-backup-2024-01-15T10-30-00Z.json"
        filePath:
          type: string
          example: "/backups/quickbill-backup-2024-01-15T10-30-00Z.json"
        size:
          type: number
          example: 102400
        sizeMB:
          type: string
          example: "0.10MB"
        created:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
        encrypted:
          type: boolean
          example: false
        isValid:
          type: boolean
          example: true

  parameters:
    ClientId:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: objectid
      description: Client ID
    InvoiceId:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: objectid
      description: Invoice ID
    SearchQuery:
      name: search
      in: query
      required: false
      schema:
        type: string
      description: Search term for name or email
    StatusFilter:
      name: status
      in: query
      required: false
      schema:
        type: string
        enum: [draft, unpaid, paid, overdue, all]
      description: Filter by status

  responses:
    Unauthorized:
      description: Authentication required or invalid token
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            message: "Access denied. No token provided."
    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            message: "Invoice not found"
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            message: "Invalid email format"
    RateLimitExceeded:
      description: Too many requests
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            message: "Too many requests, please try again later."

paths:
  /api/auth/login:
    post:
      summary: Admin Login
      description: Authenticate admin user and receive JWT token
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
            example:
              username: "admin"
              password: "secure_password_123"
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /api/auth/logout:
    post:
      summary: Logout
      description: Invalidate current session (client-side token disposal)
      tags: [Authentication]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Logout successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
              example:
                success: true
                message: "Logout successful"
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/auth/validate:
    get:
      summary: Validate Token
      description: Validate JWT token and return user information
      tags: [Authentication]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Token is valid
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  user:
                    type: object
                    properties:
                      username:
                        type: string
                        example: "admin"
                      role:
                        type: string
                        example: "admin"
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/health:
    get:
      summary: System Health Check
      description: Get comprehensive system health status with caching
      tags: [System]
      parameters:
        - name: detailed
          in: query
          required: false
          schema:
            type: boolean
            default: false
          description: Return detailed system information
      responses:
        '200':
          description: Health status retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'

  /api/clients:
    get:
      summary: Get All Clients
      description: Retrieve all clients with optional search filtering
      tags: [Clients]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/SearchQuery'
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Page number for pagination
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Number of clients per page
      responses:
        '200':
          description: Clients retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 15
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Client'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: Create Client
      description: Create a new client
      tags: [Clients]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Client'
            example:
              name: "John Doe"
              email: "john@example.com"
              address: "123 Main St, New York, NY 10001"
              phone: "+1-555-0123"
      responses:
        '201':
          description: Client created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Client'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/clients/{id}:
    get:
      summary: Get Client by ID
      description: Retrieve a specific client by its ID
      tags: [Clients]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/ClientId'
      responses:
        '200':
          description: Client retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Client'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update Client
      description: Update an existing client
      tags: [Clients]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/ClientId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Client'
            example:
              name: "John Smith"
              email: "john.smith@example.com"
      responses:
        '200':
          description: Client updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Client'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete Client
      description: Delete a client (only if no invoices exist)
      tags: [Clients]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/ClientId'
      responses:
        '200':
          description: Client deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
              example:
                success: true
                message: "Client deleted successfully"
        '400':
          description: Cannot delete client with existing invoices
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Cannot delete client with existing invoices"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/invoices:
    get:
      summary: Get All Invoices
      description: Retrieve all invoices with optional filtering and search
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/SearchQuery'
        - $ref: '#/components/parameters/StatusFilter'
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Page number for pagination
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Number of invoices per page
      responses:
        '200':
          description: Invoices retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 25
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Invoice'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: Create Invoice
      description: Create a new invoice with auto-generated invoice number
      tags: [Invoices]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Invoice'
            example:
              clientId: "507f1f77bcf86cd799439011"
              clientName: "John Doe"
              clientEmail: "john@example.com"
              clientAddress: "123 Main St, New York, NY 10001"
              businessName: "QuickBill Desk Inc."
              businessEmail: "billing@quickbill.com"
              businessAddress: "456 Business Ave, San Francisco, CA 94102"
              items:
                - description: "Web Development Services"
                  quantity: 1
                  price: 1000.00
                - description: "Domain Registration"
                  quantity: 1
                  price: 15.00
              date: "2024-01-15T10:30:00Z"
              dueDate: "2024-02-14T10:30:00Z"
              taxRate: 10
              currency: "USD"
              status: "draft"
      responses:
        '201':
          description: Invoice created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Invoice'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          description: Client not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Client not found"

  /api/invoices/{id}:
    get:
      summary: Get Invoice by ID
      description: Retrieve a specific invoice by its ID with client population
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '200':
          description: Invoice retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Invoice'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update Invoice
      description: Update an existing invoice with revision tracking
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Invoice'
      responses:
        '200':
          description: Invoice updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Invoice'
                  changes:
                    type: array
                    items:
                      type: object
                  message:
                    type: string
                    example: "Invoice updated with revision tracking"
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete Invoice
      description: Delete an invoice by ID
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '200':
          description: Invoice deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
              example:
                success: true
                message: "Invoice deleted successfully"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/invoices/stats:
    get:
      summary: Get Invoice Statistics
      description: Get dashboard statistics for invoices
      tags: [Invoices]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Statistics retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      totalInvoices:
                        type: number
                        example: 25
                      totalRevenue:
                        type: number
                        example: 12500.50
                      unpaidCount:
                        type: number
                        example: 5
                      unpaidAmount:
                        type: number
                        example: 3500.00
                      overdueCount:
                        type: number
                        example: 2
                      paidCount:
                        type: number
                        example: 18
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/invoices/{id}/status:
    put:
      summary: Update Invoice Status
      description: Update invoice status only
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [draft, unpaid, paid, overdue]
                  example: "paid"
      responses:
        '200':
          description: Status updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Invoice'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/invoices/duplicate/{id}:
    post:
      summary: Duplicate Invoice
      description: Duplicate existing invoice with new invoice number
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '201':
          description: Invoice duplicated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Invoice'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/invoices/generate/pdf:
    post:
      summary: Generate PDF
      description: Generate professional PDF document for invoice
      tags: [Invoices]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - invoice
              properties:
                invoice:
                  $ref: '#/components/schemas/Invoice'
      responses:
        '200':
          description: PDF generated successfully
          content:
            application/pdf:
              schema:
                type: string
                format: binary
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          description: PDF generation failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Failed to generate PDF"

  /api/invoices/{id}/revisions:
    get:
      summary: Get Invoice Revisions
      description: Get invoice revision history for audit trail
      tags: [Invoices]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '200':
          description: Revision history retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      revisionHistory:
                        type: array
                        items:
                          type: object
                      currentVersion:
                        type: number
                        example: 2
                      lastRevisedAt:
                        type: string
                        format: date-time
                      revisedBy:
                        type: string
                        example: "admin"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/bulk/invoices/status:
    put:
      summary: Bulk Update Invoice Status
      description: Bulk update invoice status for multiple invoices
      tags: [Bulk Operations]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkStatusUpdate'
      responses:
        '200':
          description: Bulk operation completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Updated 15 invoices, 2 failed"
                  data:
                    type: object
                    properties:
                      processed:
                        type: number
                        example: 17
                      succeeded:
                        type: number
                        example: 15
                      failed:
                        type: number
                        example: 2
                      failures:
                        type: array
                        items:
                          type: object
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/bulk/invoices:
    delete:
      summary: Bulk Delete Invoices
      description: Bulk delete multiple invoices
      tags: [Bulk Operations]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - invoiceIds
              properties:
                invoiceIds:
                  type: array
                  items:
                    type: string
                    format: objectid
                  minItems: 1
                  maxItems: 100
      responses:
        '200':
          description: Bulk deletion completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Deleted 10 invoices, 1 failed"
                  data:
                    type: object
                    properties:
                      processed:
                        type: number
                        example: 11
                      succeeded:
                        type: number
                        example: 10
                      failed:
                        type: number
                        example: 1
                      failures:
                        type: array
                        items:
                          type: object
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/bulk/invoices/send-email:
    post:
      summary: Bulk Send Emails
      description: Bulk send emails for multiple invoices
      tags: [Bulk Operations]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkEmailRequest'
      responses:
        '200':
          description: Bulk email operation completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Sent 8 emails, 2 failed"
                  data:
                    type: object
                    properties:
                      processed:
                        type: number
                        example: 10
                      succeeded:
                        type: number
                        example: 8
                      failed:
                        type: number
                        example: 2
                      failures:
                        type: array
                        items:
                          type: object
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/bulk/invoices/download-pdfs:
    post:
      summary: Bulk Download PDFs
      description: Bulk download PDFs for multiple invoices as ZIP archive
      tags: [Bulk Operations]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - invoiceIds
              properties:
                invoiceIds:
                  type: array
                  items:
                    type: string
                    format: objectid
                  minItems: 1
                  maxItems: 50
      responses:
        '200':
          description: ZIP file containing PDFs
          content:
            application/zip:
              schema:
                type: string
                format: binary
          headers:
            Content-Disposition:
              schema:
                type: string
              example: "attachment; filename=invoices-1705311000000.zip"
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/bulk/invoices/validate:
    post:
      summary: Validate Bulk Operation
      description: Validate invoices for bulk operations
      tags: [Bulk Operations]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - invoiceIds
              properties:
                invoiceIds:
                  type: array
                  items:
                    type: string
                    format: objectid
                  minItems: 1
                  maxItems: 100
      responses:
        '200':
          description: Validation completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      validCount:
                        type: number
                        example: 15
                      invalidCount:
                        type: number
                        example: 2
                      missingIds:
                        type: array
                        items:
                          type: string
                      invoices:
                        type: array
                        items:
                          type: object
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/email/invoices/{id}/send-email:
    post:
      summary: Send Invoice Email
      description: Send invoice via email with optional PDF attachment
      tags: [Email]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                to:
                  type: string
                  format: email
                  example: "john@example.com"
                subject:
                  type: string
                  example: "Invoice INV-0001 from QuickBill Desk"
                message:
                  type: string
                  example: "Dear John, please find your invoice attached."
                includePDF:
                  type: boolean
                  default: true
      responses:
        '200':
          description: Email sent successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Invoice sent successfully"
                  data:
                    type: object
                    properties:
                      messageId:
                        type: string
                        example: "<20240115103000.12345@quickbill.com>"
                      status:
                        type: string
                        example: "sent"
                      recipient:
                        type: string
                        example: "john@example.com"
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          description: Email sending failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Failed to send email: SMTP connection failed"

  /api/email/invoices/{id}/quick-send:
    post:
      summary: Quick Send Invoice
      description: Quick send invoice using template settings
      tags: [Email]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '200':
          description: Email sent successfully using template
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Invoice sent successfully using template"
                  data:
                    type: object
                    properties:
                      messageId:
                        type: string
                      status:
                        type: string
                      recipient:
                        type: string
        '400':
          description: Invoice has no client email
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Invoice has no client email address"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/email/invoices/{id}/email-history:
    get:
      summary: Get Email History
      description: Get email history for an invoice
      tags: [Email]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/InvoiceId'
      responses:
        '200':
          description: Email history retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      emailHistory:
                        type: array
                        items:
                          $ref: '#/components/schemas/EmailHistory'
                      lastSentAt:
                        type: string
                        format: date-time
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/settings:
    get:
      summary: Get Settings
      description: Get current application settings
      tags: [Settings]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Settings retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Settings'
        '401':
          $ref: '#/components/responses/Unauthorized'

    put:
      summary: Update Settings
      description: Update application settings with validation
      tags: [Settings]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Settings'
      responses:
        '200':
          description: Settings updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Settings'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/admin/backup:
    post:
      summary: Create Backup
      description: Create a new database backup
      tags: [Backup]
      security:
        - bearerAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                encrypt:
                  type: boolean
                  default: false
                  description: Override encryption setting
      responses:
        '200':
          description: Backup created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Backup created successfully"
                  data:
                    type: object
                    properties:
                      filename:
                        type: string
                      filePath:
                        type: string
                      stats:
                        type: object
                      fileSize:
                        type: number
                      encrypted:
                        type: boolean
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /api/admin/backups:
    get:
      summary: List Backups
      description: List all available backups
      tags: [Backup]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Backups listed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      backups:
                        type: array
                        items:
                          $ref: '#/components/schemas/BackupInfo'
                      total:
                        type: number
                        example: 5
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/admin/backup/download/{filename}:
    get:
      summary: Download Backup
      description: Download backup file
      tags: [Backup]
      security:
        - bearerAuth: []
      parameters:
        - name: filename
          in: path
          required: true
          schema:
            type: string
          description: Name of backup file to download
      responses:
        '200':
          description: Backup file downloaded
          content:
            application/json:
              schema:
                type: string
                format: binary
          headers:
            Content-Disposition:
              schema:
                type: string
              example: "attachment; filename=quickbill-backup-2024-01-15T10-30-00Z.json"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          description: Backup file not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                success: false
                message: "Backup file not found"
