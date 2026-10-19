# Acme Enterprise CRM & Billing (StageDock Database Test Suite)

Is project mein **3 Relational PostgreSQL Tables** (`customers`, `orders`, `audit_logs`), **Prisma Schema** (`prisma/schema.prisma`), **SQL Schema** (`schema.sql`), aur **Interactive Data Tables Dashboard** shamil hai.

## Ismein Kya-Kya Dikhne Ko Milega:
1. **3 Live Database Tables UI:**
   - `customers` table (with live **+ Insert Row into DB Table** form!)
   - `orders` table (Foreign-key linked invoices in ₹ INR)
   - `audit_logs` table (API route & security monitor)
2. **StageDock Seeder & AST Guard Ready:**
   - `prisma/schema.prisma` aur `schema.sql` dono diye gaye hain taaki **StageDock Sandbox** database tables ko introspect kar sake aur **StageDock Guard** schema/API changes ko pakad sake.

## PR Testing Kaise Karein:
1. Is ZIP ko unzip karke sabhi files apne GitHub repo mein upload (commit) kar dein.
2. PR test karne ke liye:
   - **Visual Test:** `server.js` mein `THEME_ACCENT` ko `#10b981` (Green) karein ya `ANNOUNCEMENT_TEXT` badlein.
   - **Database / Guard Test:** `prisma/schema.prisma` mein kisi column ko hatayein ya `server.js` mein `/api/orders` route ka naam badal kar Pull Request banayein — StageDock Guard turant breaking change pakad lega!
