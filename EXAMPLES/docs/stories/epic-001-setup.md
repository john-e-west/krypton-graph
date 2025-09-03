# Epic 001: Project Setup & Infrastructure
**Epic ID:** SETUP-EPIC-001  
**Duration:** 2 days  
**Priority:** P0 - Critical Path  
**Type:** Greenfield Foundation  

## Epic Goal
Establish the complete development infrastructure for Krypton-Graph v2 using Convex + Zep architecture, enabling the team to begin feature development with a fully functional development environment.

## Epic Description

**Project Context:**
- New greenfield POC replacing React + Airtable + Zep architecture
- No existing code to migrate or maintain compatibility with
- Starting fresh with modern stack: Convex + Zep + TypeScript

**Setup Requirements:**
- Convex project initialization with proper schema
- Frontend framework setup (React/Vue/Svelte per team preference)
- Zep API integration foundation
- Development environment configuration
- CI/CD pipeline basics

**Success Criteria:**
- Local development environment running
- Convex database accessible and schema deployed
- Frontend connected to Convex
- Zep API client configured and tested
- Basic project structure established

## User Stories

### Story 1: Convex Project Initialization (SETUP-001)
**Points:** 3  
**Description:** Create and configure Convex project with initial schema for ontologies, entities, edges, and test runs.

**Acceptance Criteria:**
- [ ] Convex project created and connected to GitHub
- [ ] Schema deployed with all required tables
- [ ] Development and production environments configured
- [ ] Basic CRUD functions scaffolded
- [ ] Real-time subscriptions verified

### Story 2: Frontend Framework Setup (SETUP-002)
**Points:** 2  
**Description:** Initialize frontend application with chosen framework and connect to Convex backend.

**Acceptance Criteria:**
- [ ] Frontend project initialized (React/Vue/Svelte)
- [ ] Convex client integrated
- [ ] Basic routing structure in place
- [ ] UI component library selected and configured
- [ ] Development server running with hot reload

### Story 3: Zep API Integration Layer (SETUP-003)
**Points:** 3  
**Description:** Create Zep API client service with authentication and basic graph operations.

**Acceptance Criteria:**
- [ ] Zep API client created with TypeScript types
- [ ] Authentication mechanism implemented
- [ ] Basic graph CRUD operations tested
- [ ] Error handling for API failures
- [ ] Environment variables configured for API endpoints

## Technical Requirements

**Development Stack:**
- Node.js 18+ and npm/yarn/pnpm
- TypeScript 5.x
- Convex CLI installed globally
- Git configured with team conventions

**Environment Setup:**
```bash
# Required environment variables
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
ZEP_API_KEY=
ZEP_API_URL=
```

## Dependencies
- Team decision on frontend framework
- Zep API access credentials
- Convex account and project creation

## Risk Mitigation

**Primary Risk:** Zep API integration complexity  
**Mitigation:** Start with mock Zep responses if API isn't ready  
**Rollback Plan:** N/A - greenfield project  

## Definition of Done

- [ ] All 3 stories completed and verified
- [ ] Development environment documented in README
- [ ] Team can run project locally
- [ ] Basic smoke tests passing
- [ ] Commit conventions established
- [ ] Project structure follows best practices

## Notes
This is the foundation epic that blocks all other work. Focus on getting a working skeleton rather than perfection. We can iterate and improve in subsequent sprints.

---
**Status:** Ready for Sprint Planning  
**Created:** September 1, 2025  
**Sprint:** Week 1 (Days 1-2)