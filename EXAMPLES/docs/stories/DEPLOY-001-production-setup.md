<!--
@status: READY_FOR_DEVELOPMENT
@priority: P1
@sprint: 2
@assigned: UNASSIGNED
@reviewed_by: PM
@approved_date: 2025-09-01
-->

# Story: DEPLOY-001 - Production Environment Setup

**Story ID:** DEPLOY-001  
**Epic:** DEPLOY-EPIC-004  
**Points:** 5  
**Priority:** P1 - Launch Critical  
**Type:** Infrastructure  
**Dependencies:** UI-001, UI-002, UI-003  

## User Story

As a **DevOps engineer**,  
I want **to deploy the Krypton-Graph POC to a production environment with proper configuration**,  
So that **stakeholders can access and evaluate the system reliably**.

## Story Context

**Deployment Requirements:**
- Production hosting on Vercel/Netlify
- Convex production deployment
- Environment variable management
- Custom domain configuration
- SSL/HTTPS setup
- CORS configuration
- Security headers

**Infrastructure Targets:**
- Frontend: Vercel or Netlify
- Backend: Convex Cloud (managed)
- API: Zep Cloud Instance
- CDN: Cloudflare (optional)

## Acceptance Criteria

### Hosting Configuration:

1. **Vercel/Netlify Setup**
   - [ ] Project created and linked to GitHub
   - [ ] Build settings configured
   - [ ] Environment variables set
   - [ ] Deploy hooks configured
   - [ ] Preview deployments enabled
   - [ ] Production branch protected

2. **Domain & SSL**
   - [ ] Custom domain configured (if available)
   - [ ] SSL certificate active
   - [ ] HTTPS redirect enforced
   - [ ] www to non-www redirect
   - [ ] DNS properly configured
   - [ ] CAA records set

3. **Convex Production**
   - [ ] Production deployment created
   - [ ] Environment variables configured
   - [ ] Functions deployed
   - [ ] Indexes optimized
   - [ ] Rate limiting configured
   - [ ] Backup strategy defined

### Security Configuration:

4. **Security Headers**
   - [ ] Content Security Policy (CSP)
   - [ ] X-Frame-Options
   - [ ] X-Content-Type-Options
   - [ ] Referrer-Policy
   - [ ] Permissions-Policy
   - [ ] HSTS enabled

5. **Environment Variables**
   - [ ] Production secrets secured
   - [ ] API keys rotated
   - [ ] Environment isolation
   - [ ] Access controls in place
   - [ ] Audit logging enabled
   - [ ] Secret scanning active

6. **Performance & Reliability**
   - [ ] CDN caching configured
   - [ ] Asset optimization
   - [ ] Gzip compression enabled
   - [ ] Image optimization
   - [ ] Error pages configured
   - [ ] Health checks active

## Implementation Details

### Vercel Configuration:
```json
// vercel.json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  
  "env": {
    "VITE_CONVEX_URL": "@convex_url_production",
    "VITE_ZEP_API_URL": "@zep_api_url_production",
    "VITE_SENTRY_DSN": "@sentry_dsn_production"
  },
  
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  
  "redirects": [
    {
      "source": "/",
      "has": [
        {
          "type": "host",
          "value": "www.krypton-graph.com"
        }
      ],
      "destination": "https://krypton-graph.com",
      "permanent": true
    }
  ],
  
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.convex.cloud/:path*"
    }
  ],
  
  "functions": {
    "api/health.ts": {
      "maxDuration": 10
    }
  }
}
```

### Netlify Configuration:
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.getzep.com;
    """

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, max-age=0"

[dev]
  command = "npm run dev"
  port = 3000
  targetPort = 5173

[[plugins]]
  package = "@netlify/plugin-lighthouse"
  
  [plugins.inputs]
    output_path = "reports/lighthouse.html"
    
  [plugins.inputs.thresholds]
    performance = 0.8
    accessibility = 0.9
    best-practices = 0.9
    seo = 0.9
```

### Environment Setup Script:
```bash
#!/bin/bash
# scripts/setup-production.sh

set -e

echo "🚀 Setting up production environment..."

# Check required tools
command -v vercel >/dev/null 2>&1 || { echo "Vercel CLI required. Install with: npm i -g vercel"; exit 1; }
command -v convex >/dev/null 2>&1 || { echo "Convex CLI required. Install with: npm i -g convex"; exit 1; }

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | xargs)
else
  echo "❌ .env.production file not found"
  exit 1
fi

# Deploy Convex Production
echo "📦 Deploying Convex production..."
npx convex deploy --prod

# Get Convex URL
CONVEX_URL=$(npx convex deployment:url --prod)
echo "✅ Convex deployed: $CONVEX_URL"

# Deploy to Vercel
echo "🔷 Deploying to Vercel..."
vercel --prod \
  --env VITE_CONVEX_URL=$CONVEX_URL \
  --env VITE_ZEP_API_URL=$ZEP_API_URL \
  --env VITE_SENTRY_DSN=$SENTRY_DSN

# Or deploy to Netlify
# echo "🔶 Deploying to Netlify..."
# netlify deploy --prod \
#   --build \
#   --site $NETLIFY_SITE_ID

echo "✅ Production deployment complete!"

# Run health checks
echo "🏥 Running health checks..."
./scripts/health-check.sh

echo "🎉 Deployment successful!"
```

### Health Check Endpoint:
```typescript
// api/health.ts (Vercel)
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
    checks: {
      frontend: 'ok',
      convex: 'checking',
      zep: 'checking',
    },
  };
  
  try {
    // Check Convex
    const convexResponse = await fetch(`${process.env.VITE_CONVEX_URL}/health`);
    checks.checks.convex = convexResponse.ok ? 'ok' : 'error';
  } catch (error) {
    checks.checks.convex = 'error';
    checks.status = 'degraded';
  }
  
  try {
    // Check Zep
    const zepResponse = await fetch(`${process.env.VITE_ZEP_API_URL}/health`);
    checks.checks.zep = zepResponse.ok ? 'ok' : 'error';
  } catch (error) {
    checks.checks.zep = 'error';
    checks.status = 'degraded';
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(checks);
}
```

### Production Environment Variables:
```bash
# .env.production
# Frontend (public - prefixed with VITE_)
VITE_CONVEX_URL=https://growing-elephant-123.convex.cloud
VITE_ZEP_API_URL=https://api.getzep.com/v1
VITE_SENTRY_DSN=https://abc123@sentry.io/project-id
VITE_POSTHOG_KEY=phc_abc123xyz
VITE_GA_TRACKING_ID=G-ABC123XYZ

# Backend (Convex - server-side only)
ZEP_API_KEY=zep_sk_live_abc123xyz
SENTRY_AUTH_TOKEN=sntrys_abc123xyz
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX

# Deployment
VERCEL_TOKEN=abc123xyz
NETLIFY_AUTH_TOKEN=abc123xyz
NETLIFY_SITE_ID=abc-123-xyz
CONVEX_DEPLOY_KEY=prod_abc123xyz
```

### Security Headers Testing:
```typescript
// scripts/test-security.ts
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://krypton-graph.vercel.app';

async function testSecurityHeaders() {
  console.log('🔒 Testing Security Headers...\n');
  
  const response = await fetch(PRODUCTION_URL);
  const headers = response.headers;
  
  const requiredHeaders = [
    { name: 'X-Content-Type-Options', expected: 'nosniff' },
    { name: 'X-Frame-Options', expected: 'DENY' },
    { name: 'X-XSS-Protection', expected: '1; mode=block' },
    { name: 'Referrer-Policy', expected: 'strict-origin-when-cross-origin' },
    { name: 'Permissions-Policy', expected: /camera=\(\)/ },
    { name: 'Content-Security-Policy', expected: /default-src/ },
    { name: 'Strict-Transport-Security', expected: /max-age=/ },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const header of requiredHeaders) {
    const value = headers.get(header.name.toLowerCase());
    
    if (!value) {
      console.log(`❌ ${header.name}: MISSING`);
      failed++;
      continue;
    }
    
    const isValid = typeof header.expected === 'string'
      ? value === header.expected
      : header.expected.test(value);
    
    if (isValid) {
      console.log(`✅ ${header.name}: ${value}`);
      passed++;
    } else {
      console.log(`❌ ${header.name}: ${value} (expected: ${header.expected})`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testSecurityHeaders().catch(console.error);
```

### Performance Configuration:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    
    // Bundle analyzer
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    
    // PWA support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Krypton-Graph',
        short_name: 'KG',
        theme_color: '#1976d2',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'flow-vendor': ['reactflow'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
});
```

### Deployment Checklist:
```markdown
# Production Deployment Checklist

## Pre-Deployment
- [ ] All tests passing
- [ ] Build successful locally
- [ ] Environment variables documented
- [ ] Secrets rotated
- [ ] Dependencies updated
- [ ] Security scan completed

## Convex Deployment
- [ ] Production deployment created
- [ ] Schema migrated
- [ ] Functions deployed
- [ ] Environment variables set
- [ ] Rate limits configured
- [ ] Backup configured

## Frontend Deployment
- [ ] Vercel/Netlify project created
- [ ] GitHub integration configured
- [ ] Build settings verified
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] SSL certificate active

## Post-Deployment
- [ ] Health checks passing
- [ ] Security headers verified
- [ ] Performance metrics acceptable
- [ ] Error tracking active
- [ ] Monitoring configured
- [ ] Stakeholder access verified

## Rollback Plan
- [ ] Previous version tagged
- [ ] Rollback procedure documented
- [ ] Database backup available
- [ ] DNS rollback plan ready
- [ ] Communication plan prepared
```

## Testing Approach

1. **Deployment Tests:**
   ```bash
   # Test production build
   npm run build
   npm run preview
   
   # Test environment variables
   ./scripts/check-env.sh production
   
   # Test security headers
   npm run test:security
   
   # Run Lighthouse audit
   npx lighthouse https://krypton-graph.vercel.app \
     --output html \
     --output-path ./reports/lighthouse.html
   ```

2. **Health Check Tests:**
   ```bash
   # Test health endpoint
   curl https://krypton-graph.vercel.app/api/health
   
   # Test Convex connection
   npx convex function:call testConnection --prod
   
   # Test Zep connection
   curl -H "Authorization: Bearer $ZEP_API_KEY" \
     https://api.getzep.com/v1/health
   ```

## Definition of Done

- [ ] Production environment deployed
- [ ] Custom domain configured (if available)
- [ ] SSL/HTTPS working
- [ ] All environment variables set
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Health checks passing
- [ ] Performance metrics acceptable
- [ ] Error tracking active
- [ ] Deployment scripts documented
- [ ] Rollback procedure tested
- [ ] Team can deploy updates

## Time Estimate

- Vercel/Netlify Setup: 2 hours
- Convex Production: 1.5 hours
- Domain & SSL: 1 hour
- Security Configuration: 1.5 hours
- Environment Variables: 1 hour
- Health Checks: 1 hour
- Testing & Verification: 2 hours
- **Total: 10 hours**

## Notes

Focus on security and reliability for the production deployment. Use infrastructure-as-code where possible. Document all configuration decisions. Ensure the deployment process is repeatable and can be handed off to the team. Consider using preview deployments for PR reviews.

---

<!--
@bmad_status: READY_FOR_DEVELOPMENT
@bmad_review: APPROVED
@bmad_checklist:
  - [x] Story documented
  - [x] Acceptance criteria defined
  - [x] Technical approach validated
  - [x] Dependencies identified
  - [x] Time estimates provided
  - [x] Testing approach defined
  - [ ] Developer assigned
  - [ ] Sprint planned
-->

**Status:** Ready for Development  
**Created:** September 1, 2025  
**Assigned To:** [Pending]