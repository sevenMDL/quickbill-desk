/**
 * API Documentation Generator - OpenAPI specification and markdown documentation
 * @module utils/apiDocsGenerator
 * @requires fs
 * @requires path
 * @requires ./logger
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * API documentation generator.
 * @class ApiDocsGenerator
 */
class ApiDocsGenerator {
  /**
   * Generate OpenAPI 3.0 specification
   * @returns {Object} OpenAPI specification object
   */
  static generateOpenAPISpec() {
    const openAPISpec = {
      openapi: "3.0.0",
      info: {
        title: "QuickBill Desk API",
        description: "Comprehensive invoicing and client management system",
        version: "1.0.0",
        contact: {
          name: "API Support",
          email: "support@quickbill.com"
        }
      },
      servers: [
        {
          url: "http://localhost:3001",
          description: "Development server"
        },
        {
          url: "https://your-production-domain.com",
          description: "Production server"
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: false
              },
              message: {
                type: "string",
                example: "Error description"
              }
            }
          },
          Client: {
            type: "object",
            properties: {
              _id: {
                type: "string",
                example: "507f1f77bcf86cd799439011"
              },
              name: {
                type: "string",
                example: "John Doe"
              },
              email: {
                type: "string",
                example: "john@example.com"
              },
              address: {
                type: "string",
                example: "123 Main St, City, Country"
              },
              phone: {
                type: "string",
                example: "+1234567890"
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            }
          },
          Invoice: {
            type: "object",
            properties: {
              _id: {
                type: "string",
                example: "507f1f77bcf86cd799439012"
              },
              invoiceNumber: {
                type: "string",
                example: "INV-0001"
              },
              clientId: {
                type: "string",
                example: "507f1f77bcf86cd799439011"
              },
              clientName: {
                type: "string",
                example: "John Doe"
              },
              clientEmail: {
                type: "string",
                example: "john@example.com"
              },
              clientAddress: {
                type: "string",
                example: "123 Main St, City, Country"
              },
              businessName: {
                type: "string",
                example: "Your Business Name"
              },
              businessEmail: {
                type: "string",
                example: "billing@yourbusiness.com"
              },
              businessAddress: {
                type: "string",
                example: "456 Business Ave, City, Country"
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string",
                      example: "Web Development Services"
                    },
                    quantity: {
                      type: "number",
                      example: 1
                    },
                    price: {
                      type: "number",
                      example: 1000.00
                    },
                    total: {
                      type: "number",
                      example: 1000.00
                    }
                  }
                }
              },
              subtotal: {
                type: "number",
                example: 1000.00
              },
              tax: {
                type: "number",
                example: 100.00
              },
              taxRate: {
                type: "number",
                example: 10
              },
              discount: {
                type: "number",
                example: 0
              },
              total: {
                type: "number",
                example: 1100.00
              },
              currency: {
                type: "string",
                example: "USD"
              },
              status: {
                type: "string",
                enum: ["draft", "unpaid", "paid", "overdue"],
                example: "unpaid"
              },
              date: {
                type: "string",
                format: "date-time"
              },
              dueDate: {
                type: "string",
                format: "date-time"
              },
              notes: {
                type: "string",
                example: "Payment due within 30 days"
              },
              createdAt: {
                type: "string",
                format: "date-time"
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              }
            }
          }
        }
      },
      paths: {}
    };

    // Add paths from our actual routes
    const paths = this.generatePathsFromRoutes();
    openAPISpec.paths = paths;

    return openAPISpec;
  }

  /**
   * Generate API paths from application routes
   * @returns {Object} OpenAPI paths object
   */
  static generatePathsFromRoutes() {
    return {
      "/api/auth/login": {
        post: {
          summary: "Admin Login",
          description: "Authenticate admin user and receive JWT token",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username", "password"],
                  properties: {
                    username: {
                      type: "string",
                      example: "admin"
                    },
                    password: {
                      type: "string",
                      example: "secure_password_123"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      token: { type: "string" },
                      expiresIn: { type: "string" },
                      user: {
                        type: "object",
                        properties: {
                          username: { type: "string" },
                          role: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/health": {
        get: {
          summary: "System Health Check",
          description: "Get comprehensive system health status",
          tags: ["System"],
          responses: {
            "200": {
              description: "Health status retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      timestamp: { type: "string" },
                      version: { type: "string" },
                      database: { type: "object" },
                      system: { type: "object" },
                      services: { type: "object" },
                      business_metrics: { type: "object" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/invoices": {
        get: {
          summary: "Get All Invoices",
          description: "Retrieve all invoices with optional filtering",
          tags: ["Invoices"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "search",
              in: "query",
              description: "Search in invoice number or client name",
              required: false,
              schema: { type: "string" }
            },
            {
              name: "status",
              in: "query",
              description: "Filter by invoice status",
              required: false,
              schema: { 
                type: "string",
                enum: ["draft", "unpaid", "paid", "overdue", "all"]
              }
            }
          ],
          responses: {
            "200": {
              description: "Invoices retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      count: { type: "number" },
                      data: {
                        type: "array",
                        items: {
                          "$ref": "#/components/schemas/Invoice"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: "Create Invoice",
          description: "Create a new invoice",
          tags: ["Invoices"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  "$ref": "#/components/schemas/Invoice"
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Invoice created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        "$ref": "#/components/schemas/Invoice"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/invoices/{id}": {
        get: {
          summary: "Get Invoice by ID",
          description: "Retrieve a specific invoice by its ID",
          tags: ["Invoices"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Invoice retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        "$ref": "#/components/schemas/Invoice"
                      }
                    }
                  }
                }
              }
            },
            "404": {
              description: "Invoice not found",
              content: {
                "application/json": {
                  schema: {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        },
        put: {
          summary: "Update Invoice",
          description: "Update an existing invoice",
          tags: ["Invoices"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  "$ref": "#/components/schemas/Invoice"
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Invoice updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        "$ref": "#/components/schemas/Invoice"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        delete: {
          summary: "Delete Invoice",
          description: "Delete an invoice by ID",
          tags: ["Invoices"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Invoice deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/clients": {
        get: {
          summary: "Get All Clients",
          description: "Retrieve all clients with optional search",
          tags: ["Clients"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "search",
              in: "query",
              description: "Search in client name or email",
              required: false,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Clients retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      count: { type: "number" },
                      data: {
                        type: "array",
                        items: {
                          "$ref": "#/components/schemas/Client"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: "Create Client",
          description: "Create a new client",
          tags: ["Clients"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  "$ref": "#/components/schemas/Client"
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Client created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        "$ref": "#/components/schemas/Client"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Save OpenAPI specification to JSON file
   * @returns {string} Path to generated file
   */
  static saveDocsToFile() {
    try {
      const docsDir = path.join(process.cwd(), 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      const spec = this.generateOpenAPISpec();
      const filePath = path.join(docsDir, 'api-spec.json');
      
      fs.writeFileSync(filePath, JSON.stringify(spec, null, 2));
      
      logger.info('API documentation generated successfully', {
        filePath,
        endpoints: Object.keys(spec.paths).length
      });
      
      return filePath;
    } catch (error) {
      logger.error('Failed to generate API documentation:', error);
      throw error;
    }
  }

  /**
   * Generate markdown documentation from OpenAPI specification
   * @returns {string} Path to generated markdown file
   */
  static generateMarkdownDocs() {
    const spec = this.generateOpenAPISpec();
    let markdown = `# QuickBill Desk API Documentation\n\n`;
    markdown += `**Version**: ${spec.info.version}  \n`;
    markdown += `**Base URL**: http://localhost:3001\n\n`;

    // Group by tags
    const endpointsByTag = {};
    
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, details]) => {
        const tag = details.tags?.[0] || 'Other';
        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({ path, method: method.toUpperCase(), ...details });
      });
    });

    // Generate sections for each tag
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      markdown += `## ${tag}\n\n`;
      
      endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        markdown += `${endpoint.description}\n\n`;
        
        if (endpoint.security) {
          markdown += `**Authentication Required**: Yes\n\n`;
        }
        
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += `**Parameters**:\n\n`;
          endpoint.parameters.forEach(param => {
            markdown += `- \`${param.name}\` (${param.in}): ${param.description || 'No description'}\n`;
          });
          markdown += '\n';
        }
        
        markdown += '---\n\n';
      });
    });

    const mdPath = path.join(process.cwd(), 'docs', 'API.md');
    fs.writeFileSync(mdPath, markdown);
    
    logger.info('Markdown documentation generated', { filePath: mdPath });
    return mdPath;
  }
}

module.exports = ApiDocsGenerator;
