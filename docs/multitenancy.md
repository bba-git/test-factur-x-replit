# 🔐 Multi-Tenant Access Control

## Overview

This application implements a multi-tenant architecture where each user belongs to a company and can only access data that belongs to their company. This is enforced at both the API and database levels.

## Key Components

### 1. User Authentication & Session Management

- Users are authenticated via session tokens stored in cookies
- Each user is linked to a `company_profile_id` in the `users` table
- Sessions are stored in the `sessions` table with a reference to the user

### 2. Data Access Control

All entities (customers, invoices, products) must be scoped to the user's company:

- **Customers**: Can only be created/viewed by users from the same company
- **Invoices**: Can only be created for customers belonging to the same company
- **Products**: (Future) Will be scoped to the company that created them

### 3. Security Rules

1. **Never Trust Client Input**
   - Company IDs are always derived from the authenticated user's session
   - Client-provided company IDs are ignored
   - All write operations must use the authenticated user's company

2. **Cross-Company Validation**
   - When creating invoices, validate that the customer belongs to the same company
   - All GET requests filter by company_profile_id
   - No direct access to other companies' data

3. **Middleware Enforcement**
   - `getAuthenticatedUser` middleware attaches user and company context
   - All protected routes use this middleware
   - Frontend automatically inherits scoped access via filtered API responses

## Implementation Details

### Database Schema

```sql
users (
  id uuid primary key,
  email text unique,
  company_profile_id uuid references company_profiles(id)
)

sessions (
  id uuid primary key,
  user_id uuid references users(id),
  session_token text unique
)

customers (
  id uuid primary key,
  company_profile_id uuid references company_profiles(id),
  -- other fields
)

invoices (
  id uuid primary key,
  company_profile_id uuid references company_profiles(id),
  customer_id uuid references customers(id),
  -- other fields
)
```

### API Endpoints

All API endpoints enforce company scoping:

- `GET /api/customers` - Only returns customers for the user's company
- `POST /api/customers` - Automatically links to user's company
- `GET /api/invoices` - Only returns invoices for the user's company
- `POST /api/invoices` - Validates customer ownership and uses user's company

## Best Practices

1. Always use the `getAuthenticatedUser` middleware for protected routes
2. Never accept company IDs from the client
3. Always validate cross-entity relationships (e.g., customer-invoice)
4. Use the shared `insertAndReturn` utility for consistent data handling
5. Keep frontend forms simple - they don't need to handle company scoping 