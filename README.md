# Data Weaver

> **Backend:** this project now runs on a MongoDB + Express API instead of
> Supabase. See [`server/README.md`](./server/README.md) to set it up — in
> short: `cd server && cp .env.example .env` (point `MONGODB_URI` at your
> Mongo instance), `npm install`, `npm run seed`, `npm run dev`. Then set
> `VITE_API_URL` in this project's `.env` to that server's `/api` URL
> (defaults to `http://localhost:4000/api`) and run the frontend as usual.
> The section below is the original project brief and refers to Supabase;
> it's kept for history but no longer reflects how data is stored.

MASTER PROMPT — CONNECT MY EXISTING PROJECT TO A FREE DATABASE

I have uploaded my existing project as a ZIP file.

I want you to work on this existing project, not create a completely new project from scratch.

1. FIRST — ANALYZE THE EXISTING PROJECT

Before making changes:

Extract and inspect the entire project.

Understand the existing folder structure.

Identify the frontend framework and technologies being used.

Identify all pages, components, forms, tables, dashboards, authentication screens, APIs, models, and existing data-handling logic.

Identify which data is currently static, hardcoded, stored in localStorage, mock JSON, or temporary state.

Identify every place where data needs permanent database storage.

Check for existing backend/API/database code.

Check the project for errors and broken functionality.

Do not immediately rewrite the project.

First understand how the existing application works.

2. IMPORTANT — KEEP MY EXISTING PROJECT

I want to preserve the existing project.

Do NOT unnecessarily change:

Existing UI

Existing design

Existing layout

Existing colors

Existing pages

Existing navigation

Existing components

Existing animations

Existing functionality

Existing business logic

Only modify the parts required to add proper database functionality and backend/data connectivity.

If something already works correctly, do not rebuild it unnecessarily.

3. DATABASE REQUIREMENT

I want a FREE database solution that works properly with this project.

Use the database/backend solution that is natively supported by Lovable and is available on the free tier.

Prefer:

Lovable Cloud / Supabase

If Supabase is used, create and configure the required database tables and backend functionality.

I do NOT want to pay for a database or backend service.

Do not add unnecessary paid services.

4. CONNECT THE ENTIRE APPLICATION TO THE DATABASE

Find every part of the application where data should be persistent.

Replace temporary/mock/static data with real database operations.

For example:

CREATE

When a user submits a form:

Form
 ↓
Validation
 ↓
Database
 ↓
Success message
 ↓
Refresh displayed data


READ

When a page/dashboard loads:

Database
 ↓
Fetch data
 ↓
Display data in existing UI


UPDATE

When a user edits something:

Edit Form
 ↓
Validation
 ↓
Update Database
 ↓
Refresh UI


DELETE

When a user deletes something:

Delete button
 ↓
Confirmation
 ↓
Delete from Database
 ↓
Refresh UI


Every important CRUD operation must use the database.

5. IDENTIFY REQUIRED DATABASE TABLES

Based on my existing application, determine the required database schema.

Do NOT blindly create random tables.

Analyze the project and create only the tables required by the existing features.

For every table, determine:

Table name

Primary key

Columns

Data types

Required fields

Optional fields

Created date

Updated date

Relationships

Foreign keys where required

Example structure:

users
profiles
students
employees
subjects
classes
attendance
attendance_records
projects
orders
products
settings
notifications


These are only examples.

Use the actual entities found in my uploaded project.

6. RELATIONSHIPS

Create proper relationships between related data.

For example:

User
 ↓
Profile

Student
 ↓
Attendance

Subject
 ↓
Attendance

Class
 ↓
Students


Use foreign keys and proper relational design where appropriate.

Avoid duplicating the same data unnecessarily.

7. AUTHENTICATION

If my existing project has login/signup functionality:

Connect authentication to a proper authentication system.

Support, where required:

Sign up

Login

Logout

Session persistence

Password reset

User profile

Protected pages

Authentication state

Do not store passwords in localStorage or in plain text.

If the existing application already has authentication, preserve its UI and connect the existing screens to proper authentication.

8. USER-SPECIFIC DATA

If different users should see different data, make sure data is associated with the authenticated user.

For example:

User A → User A's data

User B → User B's data


A normal user must NOT be able to access another user's private data.

Implement appropriate database security policies.

9. ADMIN FUNCTIONALITY

If the existing project contains an admin dashboard:

Create appropriate admin permissions.

Admin should be able to perform the operations already supported by the application, such as:

View records

Add records

Edit records

Delete records

Manage users

View reports

View statistics

Manage application data

Do not give admin privileges to normal users.

Use proper database-level security rather than relying only on frontend checks.

10. REMOVE MOCK DATA

Search the entire project for:

Hardcoded arrays

Mock JSON

Dummy users

Fake API responses

Temporary objects

Static dashboard numbers

localStorage data

sessionStorage data

Test records

Determine which ones should be replaced with real database data.

Replace them with real database queries.

Do not remove static content that is intentionally part of the UI.

11. LOCAL STORAGE

If the application currently uses localStorage for important application data:

Analyze each usage.

If the data needs to survive across devices/users, move it to the database.

For example:

localStorage
     ↓
Database


Keep localStorage only when it is appropriate for things such as:

UI preferences

Theme

Temporary state

Non-critical client-side settings

Important business/application data should be stored in the database.

12. DASHBOARD DATA

All dashboard statistics must come from the real database.

Do NOT use fake numbers.

For example:

Total Users
Total Records
Present
Absent
Revenue
Orders
Projects
Activities


These values must be calculated from actual database records.

Charts and graphs must also use real database data.

13. FORMS

Check every form in the project.

For every form:

Validate input.

Show useful validation messages.

Submit data to the database.

Show loading state.

Handle errors.

Show success notification.

Clear/reset the form when appropriate.

Refresh the displayed data.

Do not allow invalid or incomplete data to be inserted.

14. ERROR HANDLING

Implement proper error handling.

For database/API errors:

Show user-friendly error messages.

Do not expose sensitive technical information.

Log useful errors for debugging.

Handle network failures.

Handle empty results.

Handle duplicate records.

Handle invalid IDs.

Handle unauthorized requests.

The application should not crash if the database is temporarily unavailable.

15. LOADING STATES

Add proper loading states wherever database requests happen.

Examples:

Loading...
Saving...
Updating...
Deleting...
Fetching data...


Disable buttons when necessary to prevent duplicate submissions.

16. EMPTY STATES

When there is no database data, show a proper empty state.

Example:

No records found.

Add your first record to get started.


Do not display fake data just to fill the UI.

17. DATABASE SECURITY

Security is extremely important.

Configure appropriate database security policies.

Users should only be able to:

Read data they are authorized to read.

Create data they are authorized to create.

Update data they are authorized to update.

Delete data they are authorized to delete.

Do not rely only on frontend restrictions.

18. ENVIRONMENT VARIABLES

If the project requires database credentials or environment variables:

Use environment variables.

Do NOT hardcode:

API keys

Database passwords

Secret keys

Service-role keys

Authentication secrets

Never expose server-side secret keys in frontend code.

19. FREE-TIER REQUIREMENT

This project must be implemented using free-tier services wherever possible.

Do not add:

Paid APIs

Paid databases

Paid authentication services

Paid storage

Paid hosting

Unnecessary third-party services

If a required feature cannot be implemented within the free tier, clearly explain the limitation before using a paid service.

20. DATA PERSISTENCE TEST

After connecting the database, test the following:

Test 1

Create a record.

Refresh the browser.

The record must still exist.

Test 2

Close the browser.

Open the application again.

The record must still exist.

Test 3

Update a record.

Refresh the page.

The updated information must remain.

Test 4

Delete a record.

Refresh the page.

The record must remain deleted.

Test 5

Login with another authorized account.

Verify that user-specific data and permissions work correctly.

21. DO NOT BREAK EXISTING FEATURES

After database integration, test the entire application.

Check:

Navigation

Routing

Login

Logout

Forms

Buttons

Tables

Search

Filters

Sorting

Pagination

Modals

Dashboards

Charts

Reports

CRUD operations

Responsive design

Mobile layout

Fix any errors introduced during integration.

22. PERFORMANCE

Keep the application efficient.

Avoid:

Unnecessary database requests

Repeated API calls

Fetching the same data multiple times

Large unnecessary queries

Use appropriate:

Query filters

Pagination

Indexes

Caching where appropriate

Efficient database queries

23. DATABASE DOCUMENTATION

After implementation, provide me with a clear explanation of:

Database

Database provider

Tables created

Columns

Relationships

Authentication setup

Security policies

Application

Explain:

Frontend
   ↓
Authentication
   ↓
Database
   ↓
CRUD operations
   ↓
Dashboard


24. FINAL REQUIREMENT

I want the final application to be:

✅ My existing project
✅ Same UI/design wherever possible
✅ Fully connected to a real database
✅ Persistent data
✅ Real CRUD operations
✅ Authentication if required
✅ Proper user permissions
✅ Secure database rules
✅ No fake application data
✅ No unnecessary backend complexity
✅ Free-tier compatible
✅ Production-ready as much as the free tier allows
✅ Responsive
✅ Error-free

VERY IMPORTANT

Do not start by creating a new application.

Do not replace my existing UI with a generic template.

Do not delete existing features just because they are difficult to connect.

First understand my uploaded ZIP project.

Then:

Analyze

Identify data requirements

Design database

Create database

Connect authentication

Connect CRUD operations

Replace mock/local data where necessary

Add security policies

Test every feature

Fix errors

Verify persistence

Give me a final implementation summary

If something is unclear, inspect the existing code and infer the correct implementation from the current application's behavior rather than rebuilding the application from scratch.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/987ce57e-2318-43ee-9584-6af46b6eea78).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
