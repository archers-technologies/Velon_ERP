# Velon ERP — Tenant Workspace User Manual

A step-by-step guide for business owners and team members who run day-to-day operations inside Velon after signing in.

**Audience:** Non-technical users  
**Last updated:** July 2026

---

## Table of contents

1. [What is the tenant workspace?](#1-what-is-the-tenant-workspace)
2. [Before you sign in](#2-before-you-sign-in)
3. [Signing in and landing on your dashboard](#3-signing-in-and-landing-on-your-dashboard)
4. [How the workspace is laid out](#4-how-the-workspace-is-laid-out)
5. [Your dashboard — start here every day](#5-your-dashboard--start-here-every-day)
6. [Quick actions and Quick Create](#6-quick-actions-and-quick-create)
7. [Sidebar modules explained](#7-sidebar-modules-explained)
8. [Managing your team and roles](#8-managing-your-team-and-roles)
9. [Settings — personal vs workspace admin](#9-settings--personal-vs-workspace-admin)
10. [Notifications and alerts](#10-notifications-and-alerts)
11. [Common tasks — quick reference](#11-common-tasks--quick-reference)
12. [Troubleshooting](#12-troubleshooting)
13. [Glossary](#13-glossary)

---

## 1. What is the tenant workspace?

Velon ERP has two sides:

| Area                          | Who it is for   | What you do there                                           |
| ----------------------------- | --------------- | ----------------------------------------------------------- |
| **Public website**            | Anyone browsing | Learn about Velon, view pricing, book a demo                |
| **Tenant workspace** (`/app`) | Your team only  | Run your business — sales, stock, customers, money, reports |

**Tenant workspace** is your private command center inside Velon. Think of it as your company's office in the app.

### Key ideas (in plain language)

| Term                | What it means                                                                          |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Tenant**          | Your company as a Velon customer (billing and legal entity)                            |
| **Workspace**       | Your company's operational environment — where all business data lives                 |
| **Company profile** | Your business identity on invoices and documents (name, address, tax ID, logo)         |
| **Seat**            | One licensed user slot on your plan                                                    |
| **Role preset**     | A simple job title (Sales, Accountant, Viewer, etc.) that controls what someone can do |

At launch, each company has **one tenant = one workspace = one company profile**.

---

## 2. Before you sign in

### Book a demo (optional)

If you are still evaluating Velon, go to **Book demo** (`/demo`). Fill in your details so the sales team can walk you through the product. The demo form is not your daily workspace.

### Try the demo workspace

1. Open **Sign in** (`/login`).
2. Enter any work email **except** the Super Admin address.
3. Use the demo password shown on the login page: **`demo123`**.

> **Note:** The Super Admin email opens the **platform console** (`/admin`) for Velon staff — not the business workspace. For normal business use, use any other email with the demo password.

Demo data is sample data. Use it to explore safely. Always confirm tax and accounting decisions with your accountant for real books.

---

## 3. Signing in and landing on your dashboard

After a successful sign-in you are taken to:

**Dashboard** → `/app`

You will see:

- A greeting with your **company name**
- Your workspace **currency** (e.g. INR, USD, SAR)
- An optional **Getting started** checklist (for new workspaces)
- **Quick action** buttons for common tasks
- Summary cards: customers, open quotes, products, low stock

If your session expires, Velon asks you to sign in again. Use the **Sign in again** button on the error screen.

---

## 4. How the workspace is laid out

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Workspace name       Currency · Location · 🌙 🔔 👤 │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  Page title + content                            │
│ (Menu)   │                                                  │
│          │                                    [Quick create]│
└──────────┴──────────────────────────────────────────────────┘
```

### Left sidebar (Menu)

The sidebar uses everyday business words — not heavy ERP jargon:

| Menu item        | Path               | What it is for                                |
| ---------------- | ------------------ | --------------------------------------------- |
| **Dashboard**    | `/app`             | Today's overview and shortcuts                |
| **Sales**        | `/app/sales-crm`   | Leads, opportunities, quotations, proposals   |
| **Purchases**    | `/app/procurement` | Buying stock from vendors                     |
| **Inventory**    | `/app/inventory`   | Products, categories, warehouses, stock       |
| **Customers**    | `/app/customers`   | Customer records, contacts, activities, notes |
| **Vendors**      | `/app/suppliers`   | Supplier records and purchase orders          |
| **Accounting**   | `/app/accounting`  | Money in, money out, journals, bank feed      |
| **HR & Payroll** | `/app/hr-payroll`  | Team, departments, branches (people hub)      |
| **Reports**      | `/app/reports`     | Financial reports and charts                  |
| **Settings**     | `/app/settings`    | Your preferences and workspace configuration  |

The **Reports** item may show a badge when there are unread alerts.

### Top header

| Control            | What it does                                        |
| ------------------ | --------------------------------------------------- |
| **Books in**       | Shows the currency used across invoices and reports |
| **Location**       | Your business city and region (on larger screens)   |
| **Sun / Moon**     | Switch between light and dark mode                  |
| **Bell**           | Open recent notifications; link to all alerts       |
| **Profile avatar** | Your account menu (profile, settings, sign out)     |

### Profile menu (top right)

Click your avatar to open:

- **My Profile** — your name, email, avatar
- **Workspace settings** — personal and display preferences
- **Switch workspace** — only appears if you belong to more than one company
- **Sign out**

### Quick Create button (bottom right)

A floating **+** button on every workspace page. Tap it to create invoices, customers, products, payments, quotations, or purchases without going back to the dashboard.

On mobile it appears as a round button; on desktop it shows **Quick create** with a label.

---

## 5. Your dashboard — start here every day

The dashboard answers: _"What is happening in my business right now?"_

### Getting started checklist

New workspaces see a **Getting started** card with five steps:

| Step                         | Why it matters                              | Where it takes you                       |
| ---------------------------- | ------------------------------------------- | ---------------------------------------- |
| Add company details          | Name, phone, and address appear on invoices | Settings → Workspace admin → Company     |
| Add first customer           | You need buyers before you can sell         | Customers                                |
| Add first product or service | Define what you sell or stock               | Inventory → Products                     |
| Create first invoice         | Bill a customer and track payment           | Billing & POS                            |
| Invite team member           | Give staff their own login                  | Settings → Workspace admin → Invitations |

- Progress is shown as a bar (e.g. `2/5`).
- Completed steps are crossed out with a green check.
- Click any incomplete step to jump straight to that task.
- Dismiss the checklist with the **X** button when you no longer need it.

The checklist hides automatically when all steps are done.

### Summary metrics

Four cards give you a quick health check:

| Card            | Meaning                                  |
| --------------- | ---------------------------------------- |
| **Customers**   | How many active customers you have       |
| **Open quotes** | Quotations waiting for customer approval |
| **Products**    | Items in your catalog                    |
| **Low stock**   | Products that need restocking            |

### Needs your attention

When relevant, a panel links you to:

- Pending purchase orders
- Open sales opportunities

---

## 6. Quick actions and Quick Create

Both use the same six daily actions. Use whichever is closer on screen.

| Action               | What it does                     | Goes to              |
| -------------------- | -------------------------------- | -------------------- |
| **Create Invoice**   | Bill a customer                  | Billing & POS        |
| **Add Customer**     | Save a new buyer                 | Customers            |
| **Add Product**      | List something you sell or stock | Inventory → Products |
| **Record Payment**   | Log money received or paid       | Billing & POS        |
| **Create Quotation** | Send a price quote               | Sales → Quotations   |
| **Add Purchase**     | Buy stock from a vendor          | Purchases            |

**Tip:** On the dashboard, quick actions appear as a grid under _"What do you want to do today?"_ On other pages, use the **Quick create** floating button.

---

## 7. Sidebar modules explained

### Sales (`/app/sales-crm`)

Opens the **Sales CRM** area. The sales pipeline is organized in tabs:

| Tab               | Purpose                               |
| ----------------- | ------------------------------------- |
| **Leads**         | New prospects not yet qualified       |
| **Opportunities** | Active deals in your pipeline         |
| **Quotations**    | Formal price quotes for customers     |
| **Proposals**     | Detailed proposals sent to prospects  |
| **Pipelines**     | Visual view of deal stages            |
| **Templates**     | Reusable quote and proposal templates |

**Typical flow:** Lead → Opportunity → Quotation → Invoice (in Billing)

At the top you may see live stats: total leads, qualified leads, open opportunities, won/lost deals, pipeline value, and expected revenue.

---

### Purchases (`/app/procurement`)

Manage buying from vendors:

- Create and track purchase orders
- Monitor pending purchases (also surfaced on the dashboard)

Use **Add Purchase** from Quick Create to jump here quickly.

---

### Inventory (`/app/inventory`)

Track what you sell and what you hold in stock.

| Sub-area   | Path                        | Purpose                            |
| ---------- | --------------------------- | ---------------------------------- |
| Products   | `/app/inventory/products`   | Your product and service catalog   |
| Categories | `/app/inventory/categories` | Group products for easier browsing |
| Warehouses | `/app/inventory/warehouses` | Storage locations                  |

Empty modules show a friendly **empty state** with a button to add your first item.

Enable **low stock email alerts** in Settings → General to get notified when stock runs low.

---

### Customers (`/app/customers`)

Your customer relationship hub. Four tabs:

| Tab            | Purpose                              |
| -------------- | ------------------------------------ |
| **Customers**  | Company and individual buyer records |
| **Contacts**   | People linked to customer accounts   |
| **Activities** | Calls, meetings, follow-ups          |
| **Notes**      | Free-form notes on accounts          |

**Adding a customer:**

1. Go to **Customers** → **Customers** tab.
2. Fill in company name, email, phone, and country.
3. Click save.

Use **More options** to reveal additional fields when needed.

---

### Vendors (`/app/suppliers`)

Mirror of Customers for your suppliers:

- Supplier profiles
- Purchase orders
- Communication threads
- Payables and delivery KPIs

---

### Accounting (`/app/accounting`)

Your financial command center:

- Cashbook, receivables, payables
- Journal entries and bank feed
- AP bills and aging reports
- Audit trail

Pair this with **Reports** for a full financial picture.

---

### HR & Payroll (`/app/hr-payroll`)

A people hub that links to team management (full payroll features roll out over time):

| Card              | Links to                      |
| ----------------- | ----------------------------- |
| **Team members**  | Workspace admin → Users       |
| **Departments**   | Workspace admin → Departments |
| **Invite people** | Workspace admin → Invitations |
| **Branches**      | Branches module               |

Use this when you think _"I need to manage my team"_ rather than digging through settings.

---

### Reports (`/app/reports`)

Financial reporting with charts and export options:

- Revenue and expenses (month to date)
- Cash flow trends
- Expense breakdown
- Report catalog for deeper analysis
- Role lenses (e.g. CFO vs Controller view)

Amounts respect your workspace currency settings.

---

### Branches (`/app/branches`)

For multi-location businesses:

- Add stores, offices, or warehouses
- Track per-location sales and stock
- Monitor operational health across the network

Reach it from **HR & Payroll** or directly at `/app/branches`.

---

### Billing & POS (`/app/billing-pos`)

Create invoices, run point-of-sale transactions, and record payments. Linked from **Create Invoice** and **Record Payment** quick actions.

Printer settings (receipt format, auto-print) are under **Settings → Printers**.

---

### Other tools (available from navigation or links)

| Module      | Path               | Purpose                             |
| ----------- | ------------------ | ----------------------------------- |
| Documents   | `/app/documents`   | File and document management        |
| AI Copilot  | `/app/ai-copilot`  | AI assistant for business questions |
| Automations | `/app/automations` | Workflow automation                 |
| Alerts      | `/app/alerts`      | Full notification history           |

---

## 8. Managing your team and roles

Only **Owners** and **Admins** can open **Workspace admin** (`/app/settings/admin`).

### Opening workspace admin

1. Go to **Settings** (`/app/settings`).
2. Click **Manage workspace** (or use the shortcut card at the top).
3. Or go directly to `/app/settings/admin`.

### Admin tabs

| Tab             | What you manage                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Company**     | Legal name, email, phone, address, industry, website, tax ID, logo |
| **Workspace**   | Workspace name, timezone, currency, language                       |
| **Users**       | Active team members, roles, enable/disable                         |
| **Departments** | Team groups (e.g. Sales, Warehouse)                                |
| **Seats**       | Plan, seats used, seats remaining                                  |
| **Invitations** | Pending invites; send new ones                                     |
| **Security**    | Security policies for the workspace                                |
| **Audit**       | Who did what and when                                              |

### Role presets

When inviting someone, pick a **role preset** instead of technical permission names:

| Role           | Best for                 | Can access                               |
| -------------- | ------------------------ | ---------------------------------------- |
| **Owner**      | Business owner           | Everything — billing, users, all modules |
| **Admin**      | Office manager / IT lead | Users, settings, reports                 |
| **Manager**    | Team lead                | Sales, purchases, inventory              |
| **Accountant** | Finance staff            | Accounting, reports, payments            |
| **Sales**      | Sales reps               | Customers, quotations, invoices          |
| **Inventory**  | Warehouse staff          | Products, stock, purchases               |
| **Viewer**     | Read-only stakeholders   | View reports and records only            |

You can change a person's role anytime from the **Users** tab.

### Inviting a team member

1. Open **Workspace admin** → **Invitations**.
2. Enter their full name and email.
3. Choose a **role preset** and optional **department**.
4. Click send.

They receive an invitation email (in development environments a link may also appear on screen).

### Departments

1. Open **Workspace admin** → **Departments**.
2. Create a department with a name and description.
3. Assign members to departments from the **Users** tab.

### Seat limits

Your subscription plan includes a fixed number of seats (e.g. 5 on Starter). The **Seats** tab shows:

- Current plan
- Active seats used vs limit
- Remaining seats

Upgrade your plan under **Settings → Subscription & billing** if you need more seats.

---

## 9. Settings — personal vs workspace admin

Settings are split so everyday users are not overwhelmed by admin screens.

### User settings (`/app/settings`)

Available to everyone. Five tabs:

| Tab                       | What you configure                                                   |
| ------------------------- | -------------------------------------------------------------------- |
| **General**               | Low stock alerts, daily summary email, dark mode, reset preferences  |
| **Business localization** | Country, currency, timezone, date/number formats, address, tax ID    |
| **Printers**              | Receipt format (A4, thermal, etc.), auto-print on charge, test print |
| **My profile**            | Your display name, email, avatar                                     |
| **Security**              | Password and account security                                        |

**Business localization** changes apply workspace-wide when saved by an Owner.

### Subscription & billing (`/app/settings/billing`)

Owners can:

- View current plan and renewal date
- See invoices and payment history
- Manage payment methods

Shortcut: **Pay now** card at the top of Settings pages (Owners only).

### Workspace admin (`/app/settings/admin`)

Owners only — covered in [Section 8](#8-managing-your-team-and-roles).

---

## 10. Notifications and alerts

### Header bell icon

- Shows unread count as a badge.
- Click to preview recent notifications.
- **Mark all read** clears the badge.
- **View All Notifications** opens `/app/alerts`.

### Reports badge

The **Reports** sidebar item may show a count when there are unread items tied to reporting or alerts.

### Email notifications

Enable in **Settings → General**:

- **Low stock email alerts** — when products cross reorder thresholds
- **Daily summary report** — morning roll-up of sales, dues, and exceptions

---

## 11. Common tasks — quick reference

| I want to…                    | Go to…                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| See today's business snapshot | Dashboard (`/app`)                                                |
| Bill a customer               | Quick Create → **Create Invoice** or Billing & POS                |
| Add a new buyer               | Quick Create → **Add Customer** or Customers                      |
| Send a price quote            | Quick Create → **Create Quotation** or Sales → Quotations         |
| Add something I sell          | Quick Create → **Add Product** or Inventory → Products            |
| Buy stock from a supplier     | Quick Create → **Add Purchase** or Purchases                      |
| Record a payment              | Quick Create → **Record Payment** or Billing & POS                |
| Update company name or logo   | Settings → Workspace admin → Company                              |
| Change currency or timezone   | Settings → Business localization (or Workspace admin → Workspace) |
| Invite a colleague            | Settings → Workspace admin → Invitations                          |
| Check seat usage              | Settings → Workspace admin → Seats                                |
| Manage my team                | HR & Payroll or Settings → Workspace admin                        |
| View financial reports        | Reports                                                           |
| Switch dark / light mode      | Sun/Moon icon in header, or Settings → General                    |
| Update my name or photo       | Profile menu → My Profile                                         |
| Sign out                      | Profile menu → Sign out                                           |
| Upgrade plan or pay invoice   | Settings → Subscription & billing                                 |

---

## 12. Troubleshooting

### "Session expired"

Your login timed out. Click **Sign in again** and enter your credentials.

### "Could not load workspace dashboard"

Usually a temporary connection issue. Click **Retry connection**. If it persists, check your internet or contact your administrator.

### "API URL is not configured"

This is a technical setup issue on the server side. Contact your Velon administrator or support team.

### "Tenant Owner access is required"

You tried to open Workspace admin without Owner/Admin rights. Ask your workspace owner to grant you a higher role or to complete the task for you.

### Empty screens with "Add your first…"

Normal for a new workspace. Click the action button in the empty state or follow the **Getting started** checklist on the dashboard.

### I don't see Subscription & billing or Manage workspace

Those shortcuts appear only for Owners and Admins. Team members with Sales or Viewer roles will not see them.

### Quick Create button is in the way on mobile

It sits at the bottom-right so you can reach it with your thumb. Open it only when you need to create something new.

---

## 13. Glossary

| Term          | Definition                                                 |
| ------------- | ---------------------------------------------------------- |
| **AR**        | Accounts receivable — money customers owe you              |
| **AP**        | Accounts payable — money you owe vendors                   |
| **CRM**       | Customer relationship management — leads, deals, quotes    |
| **POS**       | Point of sale — in-store or counter sales                  |
| **SKU**       | Stock keeping unit — a unique product identifier           |
| **Pipeline**  | Stages a sales deal moves through before it is won or lost |
| **Quotation** | A formal price offer sent to a customer before invoicing   |
| **Seat**      | One paid user license on your Velon plan                   |
| **Workspace** | Your company's private area inside Velon at `/app`         |

---

## Where to get help

- **Book a demo** — `/demo` for a guided walkthrough with the Velon team
- **Workspace admin** — ask your company's Velon Owner for access changes
- **Velon support** — contact details on the public website

---

_This guide describes the tenant workspace as implemented in Velon ERP. Some modules are actively being expanded; empty states and placeholder KPIs indicate areas still being connected to live data._
