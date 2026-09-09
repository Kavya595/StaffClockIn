# StaffClockIn server

Express + MongoDB (Mongoose) API that replaced this project's Supabase
backend. It implements the same data model and access rules the old
Postgres schema + row-level-security policies did, as plain REST routes
with JWT-based auth.

## Setup

```sh
cd server
cp .env.example .env     # then edit MONGODB_URI / JWT_SECRET / CORS_ORIGIN
npm install
npm run seed              # optional: loads demo departments/staff/holidays/attendance
npm run dev                # starts the API on http://localhost:4000
```

`MONGODB_URI` can point at:
- a local MongoDB (`mongodb://127.0.0.1:27017/staffclockin`), or
- a free-tier MongoDB Atlas cluster (`mongodb+srv://...`).

Then, in the **frontend** project root, set:

```
VITE_API_URL="http://localhost:4000/api"
```

## First run

The database starts with no login accounts (the seed script only loads
directory/reference data, never credentials). Open the app and go to the
Admin sign-in page — since no administrator exists yet, it will show a
"set up your administrator account" form instead of a login form. That
calls `POST /api/auth/bootstrap-admin`, which only works once (it refuses
once any admin account exists).

From there, use the admin console's Staff page to create staff portal
logins (email + password) for each directory entry that needs one.

## Data model

| Collection      | Mongoose model           | Notes                                            |
|------------------|---------------------------|---------------------------------------------------|
| `users`          | `User`                    | Login accounts (admin or staff), bcrypt-hashed password |
| `staff`          | `Staff`                   | Directory rows; `_id` matches the app's `stf_...` ids |
| `attendances`    | `Attendance`               | One row per staff member per day |
| `leaves`         | `Leave`                    | Leave requests |
| `departments`, `leavetypes`, `leavereasons`, `holidays` | — | Admin-managed reference data |
| `appsettings`    | `AppSetting`               | Single `app` document holding the settings blob |
| `loginevents`    | `LoginEvent`               | Append-only login/logout/failed-login audit trail |

Every collection uses the app's own string ids (e.g. `stf_abc123`) as the
Mongo `_id`, so records round-trip to/from the frontend without any id
translation.

## Authorization

There's no database-level row-level security in MongoDB, so the same rules
the old Postgres policies enforced are re-implemented in the route
handlers (see `src/routes/`):

- An **admin** account can read and write everything.
- A **staff** account can only ever see and modify its own `staff`,
  `attendance`, and `leaves` rows, and can only cancel (not approve) its
  own pending leave requests. Reference data (departments, holidays, leave
  types/reasons, settings) is admin-write / everyone-read.
- Login-activity rows are append-only and can't be bulk-replaced or
  deleted by non-admins.

## API surface

All routes are mounted under `/api` and (except where noted) require an
`Authorization: Bearer <token>` header from `/api/auth/login` or
`/api/auth/staff-login`.

- `GET /api/auth/admin-exists`, `POST /api/auth/bootstrap-admin` — first-run setup, no auth
- `POST /api/auth/login`, `POST /api/auth/staff-login` — sign in, returns `{ token, user }`
- `GET /api/auth/me` — current session
- `POST /api/auth/change-password`
- `POST /api/auth/staff-accounts`, `PUT /api/auth/staff-accounts/:staffId/password`, `DELETE /api/auth/staff-accounts/:staffId` — admin-only portal-account management
- `GET|POST /api/staff`, `PATCH|DELETE /api/staff/:id`
- `GET|PUT|POST /api/attendance`, `PATCH|DELETE /api/attendance/:id`
- `GET|PUT|POST /api/leaves`, `PATCH|DELETE /api/leaves/:id`
- `GET|POST /api/login-events`, `PATCH|DELETE /api/login-events/:id` (no bulk `PUT` — append-only)
- `GET|PUT /api/settings`
- `GET|PUT|POST /api/departments`, `/api/leave-types`, `/api/leave-reasons`, `/api/holidays`, each with `PATCH|DELETE /:id`
