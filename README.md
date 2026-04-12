# AI Career Coach - Production-Ready Application

A secure, scalable AI-powered career coaching platform built with Next.js, PostgreSQL, and advanced security practices.

**Note**: This project has been upgraded with enterprise-grade security, performance optimizations, and comprehensive testing infrastructure.

## Quick Links
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Setup](#project-setup)
- [Environment Configuration](#environment-configuration)
- [Authentication Flow](#authentication-flow)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)

## Features

### User Features
- **Personalized Industry Insights**: Real-time market trends and salary data
- **AI-Powered Resume Building**: Suggestions and ATS optimization
- **Cover Letter Generation**: Tailored to job descriptions
- **Mock Interview Prep**: AI simulations with feedback
- **Progress Tracking**: Comprehensive assessment and improvement tracking

### Technical Improvements
- 🔒 **Enterprise-Grade Security**: JWT-based auth, rate limiting, CSRF protection
- 🚀 **Performance Optimized**: Next.js 16 with Turbopack, optimized database queries
- 📊 **Scalable Architecture**: Redis-based distributed rate limiting, async job processing
- 🧪 **Comprehensive Testing**: Unit, integration, E2E, and load testing
- 📱 **Responsive Design**: Mobile-first UI with Shadcn/UI components
- 🔔 **Email Notifications**: Brevo integration for transactional emails

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Components**: Shadcn/UI + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context + Server Actions

### Backend
- **Runtime**: Node.js 20
- **API**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with HttpOnly cookies (secure)
- **Rate Limiting**: Upstash Redis (distributed)
- **Background Jobs**: Inngest
- **AI**: Google Gemini API v2.0+

### Infrastructure & DevOps
- **Deployment**: Vercel (recommended)
- **Database Hosting**: Neon PostgreSQL
- **Redis**: Upstash
- **Email Service**: Brevo
- **CI/CD**: GitHub Actions with security scanning

## Project Setup

### Prerequisites
- Node.js 20+ and npm/pnpm
- PostgreSQL 14+ (local or cloud)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ai-career-coach.git
cd ai-career-coach
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment
```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your actual values
# Required: DATABASE_URL, JWT_SECRET, BREVO_API_KEY, etc.
nano .env.local
```

### 4. Setup Database
```bash
# Generate Prisma Client
npm run db:generate

# Create/migrate database
npm run db:push
```

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` - app is ready!

## Environment Configuration

### Critical Variables (Required)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/db_name
DIRECT_URL=postgresql://user:password@host:5432/db_name

# Security (Generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-minimum-32-characters-required
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Get from https://app.brevo.com)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com

# Redis (Get from https://console.upstash.io)
UPSTASH_REDIS_REST_URL=https://your-project.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# AI (Get from https://makersuite.google.com)
GEMINI_API_KEY=your-gemini-api-key
```

See [.env.example](.env.example) for complete configuration reference.

## Authentication Flow

### 1. Sign Up
```
User Input → Validation → Hash Password → Generate OTP → Send Email
     ↓ User Verifies OTP ↓
Create Account → Generate JWT → Set HttpOnly Cookie → Dashboard
```

Rate Limit: 5 attempts per 10 minutes

### 2. Sign In
```
User Credentials → Rate Check → Find User → Verify Password
     ↓
Generate JWT → Set HttpOnly Cookie → Dashboard
```

Rate Limit: 8 attempts per 10 minutes  
Account Lockout: 5 failures for 15 minutes

### 3. Password Reset
```
Email → Generate OTP → Send Email → User Verifies OTP
     ↓
Enter New Password → Update DB → Generate JWT → Dashboard
```

Rate Limit: 8 attempts per 10 minutes

**Security**: All tokens stored in HttpOnly, Secure, SameSite:Strict cookies

## API Documentation

### Authentication Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|-----------------|
| `/api/auth/sign-up` | POST | Create account | ❌ |
| `/api/auth/sign-in` | POST | Login | ❌ |
| `/api/auth/verify-code` | POST | Verify OTP | ❌ |
| `/api/auth/forgot-password` | POST | Request password reset | ❌ |
| `/api/auth/reset-password` | POST | Complete password reset | ❌ |
| `/api/auth/me` | GET | Get user profile | ✅ |
| `/api/auth/sign-out` | POST | Logout | ✅ |

### Example: Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false
  }
}
```

### Rate Limit Headers
Every response includes:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 2024-04-11T10:30:00Z
```

When limit exceeded (429):
```
Retry-After: 300
```

## Testing

### Run All Tests
```bash
npm test
```

### Unit Tests
```bash
npm run test:unit

# With coverage report
npm run test:coverage
```

Test files in: `__tests__/unit/`

### Integration Tests
```bash
npm run test:integration
```

Test files in: `__tests__/integration/`

### End-to-End Tests (Playwright)
```bash
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

Test files in: `__tests__/e2e/`

### Load Testing (k6)
```bash
npm run test:load
```

Test files in: `__tests__/load/`

## Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Connect repository
vercel link

# Deploy
vercel deploy --prod
```

### Option 2: Manual Deployment

```bash
# Build
npm run build

# Start
npm start
```

### Environment Variables in Production

1. **Add to your hosting platform** (Vercel, Railway, etc.)
2. **Run migrations**:
   ```bash
   npm run db:migrate:deploy
   ```
3. **Verify deployment**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

### Database Setup
```bash
# Baseline existing database (if migrating)
npx prisma migrate resolve --applied migration_name

# Deploy pending migrations
npx prisma migrate deploy
```

### GitHub Actions CI/CD
Automatic testing and deployment on push/PR. See `.github/workflows/ci-cd.yml`.

## Security

### 🔐 JWT & Authentication
- ✅ Tokens stored in **HttpOnly cookies only** (no JSON response exposure)
- ✅ **Secure flag** enabled in production (HTTPS-only)
- ✅ **SameSite: Strict** for CSRF protection (was "lax", now "strict")
- ✅ **7-day expiry** with automatic refresh
- ✅ **Session invalidation** on logout

### 🔒 Password Security
- ✅ **Bcrypt hashing** with 12 salt rounds
- ✅ **8-128 character** requirement
- ✅ **Password reset** via verified email only
- ✅ **Password change tracking** (lastPasswordChangeAt)
- ✅ **Cleartext never stored**

### 📧 Email Verification
- ✅ **OTP-based** verification (5-minute validity)
- ✅ **Required for login** (emailVerified: true)
- ✅ **SHA-256 hashed** tokens in database
- ✅ **99.9% uptime** Brevo email service

### 🚫 Rate Limiting (Distributed)
- ✅ **Upstash Redis** (multi-instance safe)
- ✅ **Per-IP + per-account** limits
- ✅ **Adaptive by endpoint** (signup: 5, signin: 8)
- ✅ **Account lockout** after 5 failures
- ✅ **Global limit** 1000req/min/IP

### 📂 Database
- ✅ **Parameterized queries** (Prisma ORM, no SQL injection)
- ✅ **ACID transactions**
- ✅ **Row-level security** (Postgres)
- ✅ **Connection pooling** (production-ready)
- ✅ **Automatic backups** (Neon recommended)

### 🌐 API Security
- ✅ **Input validation** (Zod schemas)
- ✅ **CORS configured**
- ✅ **Security headers** implemented
- ✅ **Request size limits**
- ✅ **HTTPS enforced** in production

### 📋 Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Production Checklist

Before deploying to production, complete:

- [ ] All env variables set and secure
- [ ] Database migrations applied
- [ ] SSL/TLS certificate configured
- [ ] Rate limits tuned for expected traffic
- [ ] Email service tested (send test email)
- [ ] Error monitoring configured (Sentry)
- [ ] Backups enabled  
- [ ] CDN/cache configured
- [ ] Security headers verified
- [ ] All tests passing
- [ ] Load tests completed
- [ ] Logs aggregated/monitored
- [ ] API versioning strategy defined
- [ ] Rollback procedure documented
- [ ] Status page / incident management set up

## Monitoring

### Recommended Tools
- **Error Tracking**: [Sentry](https://sentry.io)
- **Performance**: [Vercel Analytics](https://vercel.com/analytics)  
- **Logging**: Winston/Pino
- **Monitoring**: Datadog, New Relic, or Prometheus
- **Uptime**: UptimeRobot, Pingdom

### Key Metrics to Track
- API response times
- Error rate and types
- Rate limit hit rate
- Database query performance
- JWT token refresh rate
- Email delivery success

## Contributing

### Code Standards
- ESLint: `npm run lint`
- Format: `npm run format`
- Tests: `npm test`
- Build: `npm run build`

### Git Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit with conventional commits
3. Push and create Pull Request
4. CI/CD pipeline automatically runs tests
5. After approval, merge to main

## Support

- **Issues & Bugs**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Security**: Email security@example.com
- **Documentation**: See `/docs` folder

## License

MIT License - free for personal and commercial use

## Acknowledgments

- Shadcn/UI for beautiful, accessible components
- Vercel for Next.js and amazing deployment
- Upstash for Redis services
- Google for Gemini API
- Brevo for email infrastructure

---

**Updated**: April 11, 2026  
**Version**: 2.0.0 (Enterprise Security Release)  
**Status**: Production Ready ✅
