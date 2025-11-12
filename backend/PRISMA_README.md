Postgres + Prisma setup

This project includes a Prisma schema at `prisma/schema.prisma` for PostgreSQL.

Steps to initialize (on your machine):

1) Create a Postgres database and set DATABASE_URL in your environment. Example:

For Windows cmd.exe:

```cmd
set DATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public
set JWT_SECRET=your_jwt_secret
```

Or PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/mydb?schema=public"
$env:JWT_SECRET = "your_jwt_secret"
```

2) Install dependencies and generate Prisma client:

```cmd
cd d:\\bank\\backend
npm install
npx prisma generate
```

3) Create initial migration and apply (dev):

```cmd
npx prisma migrate dev --name init
```

This will create the tables described in `prisma/schema.prisma`.

Notes
- If you prefer to test locally without Postgres, you can temporarily change the `datasource` provider in `prisma/schema.prisma` to `sqlite` and set DATABASE_URL to a sqlite file, e.g. `file:./dev.db`.
- After running migrations, the server will use Prisma client (imported in `src/prisma.ts`) to access the database.

If you want I can also add a small SQL seed script or automatic seeding via Prisma.
