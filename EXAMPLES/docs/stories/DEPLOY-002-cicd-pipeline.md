<!--
@status: READY_FOR_DEVELOPMENT
@priority: P1
@sprint: 2
@assigned: UNASSIGNED
@reviewed_by: PM
@approved_date: 2025-09-01
-->

# Story: DEPLOY-002 - CI/CD Pipeline Implementation

**Story ID:** DEPLOY-002  
**Epic:** DEPLOY-EPIC-004  
**Points:** 3  
**Priority:** P1 - Launch Critical  
**Type:** DevOps  
**Dependencies:** DEPLOY-001  

## User Story

As a **development team**,  
I want **automated CI/CD pipelines for testing and deployment**,  
So that **we can deliver changes quickly and reliably with confidence**.

## Story Context

**Pipeline Requirements:**
- Automated testing on PR
- Build verification
- Deployment to staging
- Production deployment on merge
- Rollback capabilities
- Status notifications

**CI/CD Targets:**
- GitHub Actions for CI/CD
- Preview deployments for PRs
- Staging environment
- Production deployment
- Automated rollbacks

## Acceptance Criteria

### Continuous Integration:

1. **PR Validation Pipeline**
   - [ ] Triggered on pull requests
   - [ ] Runs linting checks
   - [ ] Executes unit tests
   - [ ] Runs type checking
   - [ ] Performs security scan
   - [ ] Comments results on PR

2. **Build Pipeline**
   - [ ] Builds application
   - [ ] Generates bundle analysis
   - [ ] Checks bundle size limits
   - [ ] Validates environment variables
   - [ ] Creates build artifacts
   - [ ] Caches dependencies

3. **Test Pipeline**
   - [ ] Runs unit tests with coverage
   - [ ] Executes integration tests
   - [ ] Performs E2E tests (basic)
   - [ ] Generates test reports
   - [ ] Fails on coverage drop
   - [ ] Uploads results to dashboard

### Continuous Deployment:

4. **Preview Deployments**
   - [ ] Deploy PR to preview URL
   - [ ] Comment preview link on PR
   - [ ] Run smoke tests
   - [ ] Clean up after PR close
   - [ ] Environment isolation
   - [ ] Database branching (Convex)

5. **Production Pipeline**
   - [ ] Triggered on main merge
   - [ ] Runs full test suite
   - [ ] Deploys to production
   - [ ] Runs post-deploy tests
   - [ ] Notifies team of success/failure
   - [ ] Creates release notes

6. **Rollback & Recovery**
   - [ ] Automatic rollback on failure
   - [ ] Manual rollback option
   - [ ] Database migration rollback
   - [ ] Cache invalidation
   - [ ] Incident notification
   - [ ] Recovery procedures

## Implementation Details

### Main CI/CD Workflow:
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEPLOYMENT }}
  ZEP_API_KEY: ${{ secrets.ZEP_API_KEY }}

jobs:
  # ============================================
  # VALIDATION & TESTING
  # ============================================
  validate:
    name: Validate Code
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Cache Dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Linting
        run: npm run lint
        
      - name: Type Check
        run: npm run type-check
      
      - name: Security Audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: License Check
        run: npx license-checker --production --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC'

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: validate
    
    strategy:
      matrix:
        test-suite: [unit, integration]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run ${{ matrix.test-suite }} Tests
        run: npm run test:${{ matrix.test-suite }} -- --coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: ${{ matrix.test-suite }}
          fail_ci_if_error: true
      
      - name: Store Test Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.test-suite }}
          path: coverage/

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: validate
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build Application
        run: npm run build
        env:
          VITE_CONVEX_URL: ${{ secrets.VITE_CONVEX_URL }}
          VITE_ZEP_API_URL: ${{ secrets.VITE_ZEP_API_URL }}
      
      - name: Analyze Bundle
        run: npm run analyze
        continue-on-error: true
      
      - name: Check Bundle Size
        run: |
          MAX_SIZE=500000  # 500KB
          ACTUAL_SIZE=$(du -sb dist | cut -f1)
          if [ $ACTUAL_SIZE -gt $MAX_SIZE ]; then
            echo "Bundle size ($ACTUAL_SIZE) exceeds limit ($MAX_SIZE)"
            exit 1
          fi
      
      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
          retention-days: 7

  # ============================================
  # DEPLOYMENT
  # ============================================
  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Build Artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: dist/
      
      - name: Deploy to Vercel Preview
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_SCOPE }}
          alias-domains: pr-${{ github.event.pull_request.number }}.krypton-graph.vercel.app
      
      - name: Comment Preview URL
        uses: actions/github-script@v6
        with:
          script: |
            const url = '${{ steps.deploy.outputs.preview-url }}';
            const comment = `
              🚀 **Preview Deployment Ready!**
              
              🔗 Preview: ${url}
              📊 [Bundle Analysis](${url}/_analyze)
              🧪 [Test Results](${url}/_tests)
              
              <details>
              <summary>Deployment Details</summary>
              
              - Build Time: ${{ steps.deploy.outputs.build-time }}
              - Deploy Time: ${{ steps.deploy.outputs.deploy-time }}
              - Function Count: ${{ steps.deploy.outputs.function-count }}
              </details>
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install Convex CLI
        run: npm install -g convex
      
      - name: Deploy Convex Functions
        run: |
          npx convex deploy --preview-name staging
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_STAGING }}
      
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_SCOPE }}
          alias-domains: staging.krypton-graph.com
          vercel-args: '--env=preview'

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install Convex CLI
        run: npm install -g convex
      
      - name: Deploy Convex Functions
        run: |
          npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_PROD }}
      
      - name: Deploy to Vercel Production
        id: deploy-prod
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_SCOPE }}
          vercel-args: '--prod'
      
      - name: Run Smoke Tests
        run: |
          npm run test:smoke -- --url=${{ steps.deploy-prod.outputs.preview-url }}
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            ## Changes in this Release
            ${{ github.event.head_commit.message }}
            
            ## Deployment Info
            - URL: ${{ steps.deploy-prod.outputs.preview-url }}
            - Commit: ${{ github.sha }}
            - Deployed by: ${{ github.actor }}
          draft: false
          prerelease: false

  # ============================================
  # POST-DEPLOYMENT
  # ============================================
  post-deploy:
    name: Post-Deployment Tasks
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Lighthouse Audit
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://krypton-graph.com
            https://krypton-graph.com/dashboard
          uploadArtifacts: true
          temporaryPublicStorage: true
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Production deployment completed!
            Version: v${{ github.run_number }}
            URL: https://krypton-graph.com
            Deployed by: ${{ github.actor }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
      
      - name: Update Status Page
        run: |
          curl -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
            -H "Authorization: OAuth ${{ secrets.STATUSPAGE_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "incident": {
                "name": "Deployment v${{ github.run_number }}",
                "status": "resolved",
                "message": "Successfully deployed new version"
              }
            }'
```

### PR Checks Workflow:
```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  danger:
    name: Danger JS
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: danger/danger-js@11.2.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  size-limit:
    name: Size Limit
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          skip_step: install
          script: npm run size

  label:
    name: Auto Label
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/labeler@v4
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml
```

### Rollback Workflow:
```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version to rollback to (e.g., v123)'
        required: true
        type: string

jobs:
  rollback:
    name: Rollback ${{ inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ inputs.version }}
      
      - name: Confirm Rollback
        uses: trstringer/manual-approval@v1
        with:
          secret: ${{ secrets.GITHUB_TOKEN }}
          approvers: team-lead,devops-team
          minimum-approvals: 1
          issue-title: "Rollback ${{ inputs.environment }} to ${{ inputs.version }}"
      
      - name: Rollback Convex
        run: |
          npx convex deploy --preview-name ${{ inputs.environment }} \
            --preview-commit ${{ inputs.version }}
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
      
      - name: Rollback Vercel
        run: |
          vercel rollback ${{ inputs.version }} \
            --scope ${{ secrets.VERCEL_SCOPE }} \
            --token ${{ secrets.VERCEL_TOKEN }}
      
      - name: Verify Rollback
        run: |
          npm run test:smoke -- --url=https://${{ inputs.environment }}.krypton-graph.com
      
      - name: Notify Team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            🔄 Rollback completed!
            Environment: ${{ inputs.environment }}
            Version: ${{ inputs.version }}
            Initiated by: ${{ github.actor }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Danger Configuration:
```javascript
// dangerfile.js
import { danger, warn, fail, message } from 'danger';

// Check PR size
const bigPRThreshold = 600;
const additions = danger.github.pr.additions;
const deletions = danger.github.pr.deletions;
const changes = additions + deletions;

if (changes > bigPRThreshold) {
  warn(`This PR is quite large (${changes} lines). Consider breaking it into smaller PRs.`);
}

// Check for tests
const hasTests = danger.git.modified_files.some(f => f.includes('.test.') || f.includes('.spec.'));
const hasAppChanges = danger.git.modified_files.some(f => f.includes('src/'));

if (hasAppChanges && !hasTests) {
  warn('This PR modifies app code but does not include tests.');
}

// Check for console.log
const jsFiles = danger.git.modified_files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
for (const file of jsFiles) {
  const content = await danger.github.utils.fileContents(file);
  if (content.includes('console.log')) {
    fail(`Found console.log in ${file}. Please remove before merging.`);
  }
}

// Check for TODO comments
for (const file of jsFiles) {
  const content = await danger.github.utils.fileContents(file);
  if (content.includes('TODO')) {
    warn(`Found TODO comment in ${file}. Consider creating an issue instead.`);
  }
}

// Require PR description
if (danger.github.pr.body.length < 50) {
  fail('Please provide a detailed PR description.');
}

// Check commit messages
const commits = danger.github.commits;
const badCommits = commits.filter(c => !c.commit.message.match(/^(feat|fix|docs|style|refactor|test|chore):/));

if (badCommits.length > 0) {
  warn('Some commits do not follow conventional commit format.');
}

// Celebrate achievements
if (deletions > additions) {
  message('🎉 Great job reducing code complexity!');
}

if (danger.github.pr.labels.includes('first-time-contributor')) {
  message('👋 Welcome! Thank you for your contribution!');
}
```

### Size Limit Configuration:
```json
// .size-limit.json
[
  {
    "path": "dist/assets/index-*.js",
    "limit": "200 KB",
    "webpack": false,
    "brotli": true
  },
  {
    "path": "dist/assets/vendor-*.js",
    "limit": "150 KB",
    "webpack": false,
    "brotli": true
  },
  {
    "path": "dist/**/*.css",
    "limit": "50 KB",
    "webpack": false,
    "brotli": true
  },
  {
    "path": "dist/index.html",
    "limit": "5 KB",
    "webpack": false
  }
]
```

### Scripts for CI/CD:
```json
// package.json scripts
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:smoke": "node scripts/smoke-tests.js",
    "analyze": "vite-bundle-visualizer",
    "size": "size-limit",
    "ci:validate": "npm run lint && npm run type-check",
    "ci:test": "npm run test:unit && npm run test:integration",
    "ci:build": "npm run build",
    "deploy:preview": "vercel --no-wait",
    "deploy:staging": "vercel --env=preview",
    "deploy:production": "vercel --prod"
  }
}
```

## Testing Approach

1. **Pipeline Tests:**
   ```bash
   # Test GitHub Actions locally
   npm install -g act
   act -j validate
   act -j test
   act -j build
   
   # Test deployment scripts
   ./scripts/deploy-preview.sh
   ./scripts/deploy-staging.sh
   ```

2. **Smoke Tests:**
   ```typescript
   // scripts/smoke-tests.js
   const BASE_URL = process.argv[2] || 'http://localhost:3000';
   
   const tests = [
     { name: 'Homepage loads', url: '/' },
     { name: 'Dashboard accessible', url: '/dashboard' },
     { name: 'API health check', url: '/api/health' },
   ];
   
   for (const test of tests) {
     const response = await fetch(`${BASE_URL}${test.url}`);
     if (!response.ok) {
       console.error(`❌ ${test.name} failed`);
       process.exit(1);
     }
     console.log(`✅ ${test.name} passed`);
   }
   ```

## Definition of Done

- [ ] CI pipeline validates PRs
- [ ] Tests run automatically
- [ ] Build verification working
- [ ] Preview deployments for PRs
- [ ] Staging deployment on develop
- [ ] Production deployment on main
- [ ] Rollback procedure tested
- [ ] Status notifications configured
- [ ] Bundle size checks active
- [ ] Security scanning enabled
- [ ] Documentation updated
- [ ] Team trained on pipeline

## Time Estimate

- GitHub Actions Setup: 2 hours
- Test Pipeline: 1.5 hours
- Deployment Pipeline: 2 hours
- Preview Deployments: 1 hour
- Rollback Mechanism: 1 hour
- Notifications: 0.5 hours
- Testing & Documentation: 1 hour
- **Total: 9 hours**

## Notes

Keep the pipeline fast - aim for < 5 minutes total. Use caching aggressively. Parallelize where possible. Preview deployments are crucial for PR reviews. Ensure rollback is simple and quick. Consider using branch protection rules to enforce pipeline success.

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