# MedLab - Secure Medical Results Platform

Multi-tenant SaaS platform for secure medical results delivery via SMS with OTP verification.

## Quick Start

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@medlab.cm | pass123 |
| Lab Admin | lab@medlab.cm | pass123 |
| Technician | tech@medlab.cm | pass123 |

---

## 🔐 Production Security Checklist

### Environment Variables (Required)

```env
NODE_ENV=production
JWT_SECRET=your_very_long_secret_at_least_32_chars
DATABASE_URL=postgresql://user:pass@host:5432/db
FRONTEND_URL=https://your-frontend-domain.com
```

### Railway Deployment Checklist

- [ ] **Database Security**
  - Go to Database Service → Settings → Networking
  - Ensure **Public Networking is DISABLED**
  - Database should only be accessible from within Railway's private network

- [ ] **Environment Variables**
  - Set `NODE_ENV` to `production`
  - Set `JWT_SECRET` (minimum 32 characters!)
  - Set `FRONTEND_URL` to your deployed frontend URL

- [ ] **Backend Service**
  - Verify `Start Command` is `npm run start:prod`
  - Check logs for "Environment validation passed"

- [ ] **CORS Verification**
  - Open browser console on frontend
  - Verify no CORS errors on API calls
  - Blocked origins will log: "CORS blocked request from: ..."

### Security Features Implemented

| Feature | Description |
|---------|-------------|
| **Helmet** | Secure HTTP headers (CSP, HSTS, X-Frame-Options) |
| **CORS** | Strict origin validation, no wildcards |
| **Rate Limiting** | 10 req/min for auth, 100 req/min for API |
| **Env Validation** | Startup check for JWT_SECRET length |
| **Prisma Logging** | Disabled in production (PHI protection) |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   PostgreSQL    │
│   (React)       │     │   (NestJS)      │     │   (Prisma)      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │   S3    │  │  Email  │  │   SMS   │
              │ Storage │  │ Service │  │ Gateway │
              └─────────┘  └─────────┘  └─────────┘
```

## License

Private - All Rights Reserved
