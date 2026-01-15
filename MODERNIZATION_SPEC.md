# MailDev 3.0 Modernization Specification

**Version:** 1.0
**Date:** January 2026
**Status:** Draft for Review

---

## Executive Summary

MailDev has been a reliable development email testing tool since its inception, with over 3.5k stars on GitHub and significant Docker Hub usage. However, the current architecture is showing its age with AngularJS 1.x (EOL 2021), callback-based code patterns, and limited scalability. This specification outlines a comprehensive modernization plan for MailDev 2.0 that will transform it into a modern, type-safe, extensible platform while maintaining backward compatibility where possible.

### Key Goals

1. **Modern Stack**: TypeScript, React, Vite, modern Node.js patterns
2. **Better DX**: Type safety, better tooling, faster development cycles
3. **Extensibility**: Plugin system, MCP server for Claude integration
4. **Performance**: Better memory management, improved search, optimized file persistence
5. **Monorepo**: Clear separation of concerns with publishable packages
6. **Enhanced UX**: Modern UI with keyboard shortcuts, dark mode, better accessibility

---

## Current State Analysis

### Technology Stack (v2.2.1)

**Backend:**
- Node.js 18+ with Express 4.x
- smtp-server for SMTP handling
- In-memory array storage with optional file persistence
- Callback-based async patterns
- Socket.io for real-time updates

**Frontend:**
- AngularJS 1.x (EOL since 2021)
- SASS for styling
- Font Awesome icons
- Bootstrap-inspired layout

**Infrastructure:**
- Docker with Alpine Linux base
- GitHub Actions CI
- npm package distribution

### Critical Pain Points

1. **AngularJS EOL**: No security updates, limited ecosystem, hiring challenges
2. **Callback Hell**: Complex error handling, difficult maintenance
3. **Scalability**: In-memory storage doesn't scale, no multi-process support
4. **No TypeScript**: Runtime errors, poor IDE support
5. **Limited Testing**: No E2E tests, no frontend component tests
6. **Monolithic**: Everything in one package, no code reuse

### Strengths to Preserve

- Simple CLI interface
- Comprehensive REST API
- Real-time WebSocket updates
- Docker-first deployment
- Relay/outgoing email support
- Clean separation of SMTP and web layers

---

## MailDev 2.0 Vision

### Core Philosophy

> **"Developer-first email testing with modern tooling and extensibility"**

MailDev 2.0 should be:
- **Fast**: Sub-100ms API responses, instant UI updates
- **Type-safe**: Full TypeScript with published type definitions
- **Extensible**: Plugin system for custom workflows
- **Modern**: Contemporary UX patterns, keyboard-first navigation
- **Reliable**: Improved in-memory storage with better file persistence
- **AI-Ready**: MCP server for Claude Code integration

---

## Technical Architecture

### Monorepo Structure

```
maildev/
├── packages/
│   ├── core/                    # @maildev/core
│   │   ├── src/
│   │   │   ├── storage/         # Storage abstraction layer
│   │   │   │   ├── memory.ts    # In-memory storage (v1 compatibility)
│   │   │   │   ├── file.ts      # File persistence layer
│   │   │   │   └── index.ts
│   │   │   ├── types/           # Shared TypeScript types
│   │   │   ├── utils/           # Utilities
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── smtp/                    # @maildev/smtp
│   │   ├── src/
│   │   │   ├── server.ts        # SMTP server
│   │   │   ├── parser.ts        # Email parsing
│   │   │   ├── relay.ts         # Outgoing relay
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                     # @maildev/api
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── emails.ts
│   │   │   │   ├── attachments.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── health.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── ratelimit.ts
│   │   │   │   └── validation.ts
│   │   │   ├── websocket.ts     # Socket.io handling
│   │   │   ├── server.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp/                     # @maildev/mcp
│   │   ├── src/
│   │   │   ├── server.ts        # MCP server implementation
│   │   │   ├── tools/           # MCP tools for Claude
│   │   │   │   ├── search-emails.ts
│   │   │   │   ├── get-email.ts
│   │   │   │   ├── delete-email.ts
│   │   │   │   └── relay-email.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── ui/                      # @maildev/ui
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── email-list/
│   │   │   │   ├── email-viewer/
│   │   │   │   ├── command-palette/
│   │   │   │   └── layout/
│   │   │   ├── lib/
│   │   │   │   ├── api.ts       # API client
│   │   │   │   └── hooks/       # React hooks
│   │   │   ├── pages/
│   │   │   ├── styles/
│   │   │   │   └── globals.css  # Tailwind imports
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/                     # maildev (main package)
│       ├── src/
│       │   ├── commands/
│       │   │   ├── start.ts
│       │   │   └── init.ts
│       │   ├── config.ts
│       │   └── index.ts
│       ├── bin/
│       │   └── maildev.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                        # Documentation
│   ├── CLAUDE.md               # Claude integration guide
│   ├── api.md
│   ├── mcp.md
│   ├── plugins.md
│   └── migration-guide.md
│
├── examples/                    # Example integrations
│   ├── express/
│   ├── nestjs/
│   ├── docker-compose/
│   └── plugin-example/
│
├── scripts/                     # Build and dev scripts
│   ├── build.ts
│   ├── dev.ts
│   └── publish.ts
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── publish.yml
│   │   └── docker.yml
│   └── ISSUE_TEMPLATE/
│
├── turbo.json                   # Turborepo configuration
├── pnpm-workspace.yaml          # pnpm workspace config
├── package.json
├── tsconfig.base.json
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

### Technology Choices

#### Build System & Monorepo
- **pnpm**: Fast, efficient package manager with workspace support
- **Turborepo**: Intelligent build caching and task orchestration
- **tsup**: Fast TypeScript bundler for packages
- **Vite**: Frontend build tool (dev server + production builds)

#### Backend Stack
- **TypeScript 5.x**: Full type safety
- **Node.js 20+**: Modern LTS with built-in test runner
- **Fastify**: High-performance alternative to Express (2-3x faster)
- **Zod**: Runtime validation with TypeScript inference
- **Drizzle ORM**: Type-safe SQL with migrations
- **ioredis** (optional): Redis for session storage in multi-instance setups

#### Frontend Stack
- **React 18+**: Modern UI library with concurrent features
- **React Router 6**: Type-safe routing
- **TanStack Query**: Server state management
- **Zustand**: Client state management
- **Tailwind CSS 4.x**: Utility-first CSS
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built components (copy-paste, not dependency)
- **cmdk**: Command palette component
- **Framer Motion**: Animations
- **react-email-preview**: Email iframe handling

#### Storage Options
- **In-Memory** (default): Fast, volatile storage matching v1.x behavior
- **File Persistence**: Improved .eml file storage with better indexing and faster loading
- **Hybrid Mode**: In-memory with automatic background sync to disk

#### Testing Stack
- **Vitest**: Fast unit testing (Vite-native)
- **Playwright**: E2E testing across browsers
- **Testing Library**: Component testing
- **MSW**: API mocking for tests

#### DevOps
- **Docker**: Multi-stage builds with optimized layers
- **Docker Compose**: Local development orchestration
- **GitHub Actions**: CI/CD pipelines
- **Changesets**: Version management and changelog

---

## Detailed Implementation Plan

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Set up monorepo, TypeScript infrastructure, and core packages

#### 1.1 Monorepo Setup
- [x] Initialize pnpm workspace with Turborepo
- [x] Configure shared TypeScript configs
- [x] Set up ESLint + Prettier with sensible defaults
- [x] Configure changesets for versioning
- [x] Set up GitHub Actions for CI

#### 1.2 Core Package (@maildev/core)
- [x] Define TypeScript interfaces for email objects
- [x] Implement storage abstraction layer
- [x] Write storage implementations: In-Memory, File-based
- [x] Write comprehensive unit tests
- [x] Generate type definitions

**Deliverables:**
- `@maildev/core@1.0.0-alpha.1` published to npm
- Full TypeScript support with .d.ts files
- 90%+ test coverage
- Documentation for storage API

---

### Phase 2: SMTP Server Rewrite (Weeks 5-7)

**Goal:** Modernize SMTP server with TypeScript and async/await

#### 2.1 SMTP Package (@maildev/smtp)
- [ ] Migrate `lib/mailserver.js` to TypeScript
- [ ] Replace callbacks with async/await
- [ ] Integrate with @maildev/core storage layer
- [ ] Improve error handling with typed errors
- [ ] Add structured logging (pino or winston)
- [ ] Implement connection pooling for relay
- [ ] Add SMTP authentication plugins
- [ ] Write integration tests

#### 2.2 Email Parser
- [ ] Evaluate mailparser-mit vs modern alternatives
- [ ] Add streaming parser for large emails
- [ ] Improve attachment handling (security + perf)
- [ ] Improve .eml file indexing and loading performance
- [ ] Add plugin hooks for custom processing

#### 2.3 Relay System
- [ ] Modernize outgoing.js
- [ ] Add retry logic with exponential backoff
- [ ] Support multiple relay strategies
- [ ] Add event emitters for relay status

**Deliverables:**
- `@maildev/smtp@1.0.0-alpha.1` published
- Backward compatible with v1.x configuration
- Performance benchmarks showing improvements
- Migration guide from callback API

---

### Phase 3: REST API Rewrite (Weeks 8-10)

**Goal:** Build modern, versioned REST API with Fastify

#### 3.1 API Package (@maildev/api)
- [ ] Set up Fastify with TypeScript
- [ ] Implement JWT authentication (optional)
- [ ] Add rate limiting (express-rate-limit equivalent)
- [ ] Create versioned routes (/api/v1/, /api/v2/)
- [ ] Implement filtering with query builders
- [ ] Add pagination (cursor-based + offset)
- [ ] Optimize in-memory search with better indexing
- [ ] WebSocket layer with Socket.io
- [ ] OpenAPI/Swagger documentation

#### 3.2 API Features
- [ ] Email CRUD operations
- [ ] Advanced search (by sender, subject, date range, has:attachment)
- [ ] Bulk operations (mark all read, delete filtered)
- [ ] Email export (EML, MBOX, JSON)
- [ ] Email scenarios/templates endpoint
- [ ] Stats/analytics endpoint

#### 3.3 Security Hardening
- [ ] Helmet.js for security headers
- [ ] CORS configuration per-origin
- [ ] Input validation with Zod
- [ ] SQL injection prevention (using ORM)
- [ ] XSS prevention in HTML sanitization
- [ ] Rate limiting per IP/user
- [ ] API key management

**Deliverables:**
- `@maildev/api@1.0.0-alpha.1` published
- Full OpenAPI spec
- Postman/Insomnia collections
- Performance testing showing sub-100ms responses

---

### Phase 4: Frontend Rewrite (Weeks 11-15)

**Goal:** Modern React-based UI with excellent UX

#### 4.1 Foundation
- [ ] Set up Vite + React + TypeScript
- [ ] Configure Tailwind CSS 4.x with JIT
- [ ] Install and configure shadcn/ui components
- [ ] Set up React Router with type-safe routes
- [ ] Configure TanStack Query for data fetching
- [ ] Set up Zustand for client state

#### 4.2 Core Components
- [ ] Layout: Sidebar + main content area
- [ ] Email list with virtualization (react-virtual)
- [ ] Email viewer with iframe handling
- [ ] Email detail panel (headers, raw, HTML preview)
- [ ] Attachment viewer with previews
- [ ] Responsive email tester (device frames)
- [ ] Real-time updates via WebSocket
- [ ] Toast notifications (sonner)

#### 4.3 Advanced Features
- [ ] Command palette (Cmd+K) with actions:
  - Search emails
  - Jump to email
  - Delete all
  - Mark all read
  - Toggle dark mode
  - Open settings
- [ ] Advanced search UI with filters
- [ ] Email export UI
- [ ] Dark mode support
- [ ] Settings panel
- [ ] Keyboard shortcuts (j/k navigation, etc.)

#### 4.4 Design System
- [ ] Color system with CSS variables
- [ ] Typography scale
- [ ] Spacing system
- [ ] Component library documentation (Storybook?)
- [ ] Accessibility audit (WCAG 2.1 AA)

**Deliverables:**
- `@maildev/ui@1.0.0-alpha.1` built and optimized
- Bundle size < 200KB gzipped
- Lighthouse score 90+ across all metrics
- Full keyboard navigation support

---

### Phase 5: MCP Server (Weeks 16-17)

**Goal:** Claude Code integration via Model Context Protocol

#### 5.1 MCP Package (@maildev/mcp)
- [ ] Implement MCP server specification
- [ ] Define MCP tools:
  - `maildev_search_emails`: Search with filters
  - `maildev_get_email`: Get email by ID
  - `maildev_get_latest_email`: Get most recent email
  - `maildev_delete_email`: Delete by ID
  - `maildev_delete_all_emails`: Clear all emails
  - `maildev_relay_email`: Relay to recipient
  - `maildev_get_attachment`: Download attachment
  - `maildev_mark_read`: Mark as read
- [ ] Add MCP resources for:
  - Email list (maildev://emails)
  - Individual emails (maildev://email/{id})
  - Server stats (maildev://stats)
- [ ] Implement MCP prompts:
  - "Verify signup email" - Check for verification links
  - "Check password reset" - Find reset tokens
  - "Analyze email content" - Extract key info

#### 5.2 Integration
- [ ] CLI command to start MCP server
- [ ] Configuration in Claude desktop app
- [ ] Example workflows in CLAUDE.md
- [ ] Video demo of usage

**Deliverables:**
- `@maildev/mcp@1.0.0-alpha.1` published
- CLAUDE.md documentation
- MCP server running alongside SMTP/HTTP
- Example: "Claude, check if the signup email arrived"

---

### Phase 6: CLI & Integration (Weeks 18-19)

**Goal:** Modern CLI experience and easy integration

#### 6.1 CLI Package (maildev)
- [ ] Migrate to modern CLI framework (cliffy or oclif)
- [ ] Interactive setup wizard (`maildev init`)
- [ ] Configuration file support (.maildevrc.json, maildev.config.ts)
- [ ] Environment variable support
- [ ] Better help text with examples
- [ ] Progress indicators for operations
- [ ] ASCII art logo (optional, fun!)

#### 6.2 Homebrew Distribution
- [ ] Create Homebrew formula
- [ ] Submit to homebrew-core
- [ ] Add to README installation instructions

#### 6.3 Node.js API
- [ ] Export TypeScript-first API
- [ ] Maintain backward compatibility with v1.x API
- [ ] Add new async methods
- [ ] Event emitter with types
- [ ] Example integrations

**Deliverables:**
- `maildev@2.0.0-alpha.1` published (main package)
- Homebrew formula merged
- Migration guide for v1.x users
- Example projects for popular frameworks

---

### Phase 7: Advanced Features (Weeks 20-23)

**Goal:** Differentiation and power user features

#### 7.1 Plugin System
- [ ] Define plugin API with hooks:
  - `onEmailReceived`
  - `beforeEmailSave`
  - `onEmailDeleted`
  - `onServerStart`
- [ ] Plugin discovery mechanism
- [ ] Example plugins:
  - Slack notifications
  - Discord webhook
  - Custom spam filter
  - Email anonymizer
- [ ] Plugin marketplace (docs page)

#### 7.2 Email Scenarios
- [ ] Template system for test emails
- [ ] Built-in scenarios:
  - Welcome email
  - Password reset
  - Order confirmation
  - Shipping notification
  - Newsletter
- [ ] Custom scenario creation UI
- [ ] Scenario sharing/export

#### 7.3 Advanced Search
- [ ] Full-text search across all fields
- [ ] Saved searches
- [ ] Search operators (from:, to:, has:attachment, etc.)
- [ ] Fuzzy matching

**Deliverables:**
- Plugin SDK documented
- 3-5 official plugins
- Email scenarios ready to use
- Advanced search fully functional

---

### Phase 8: Testing & Polish (Weeks 24-26)

**Goal:** Production-ready quality

#### 8.1 Testing Coverage
- [ ] Unit tests for all packages (90%+ coverage)
- [ ] Integration tests for SMTP/API
- [ ] E2E tests with Playwright:
  - Email receiving flow
  - Email viewing flow
  - Search functionality
  - Delete operations
  - Relay functionality
- [ ] Visual regression tests (Percy or Chromatic)
- [ ] Performance testing:
  - Load testing with Artillery
  - Stress testing (1000+ emails)
  - Memory profiling

#### 8.2 Documentation
- [ ] Complete API documentation
- [ ] User guide with screenshots
- [ ] Video tutorials
- [ ] Migration guide from v1.x
- [ ] Troubleshooting guide
- [ ] Plugin development guide
- [ ] Architecture documentation

#### 8.3 Performance Optimization
- [ ] In-memory search optimization
- [ ] Frontend bundle optimization
- [ ] Image optimization for attachments
- [ ] API response caching
- [ ] WebSocket connection pooling

#### 8.4 Security Audit
- [ ] OWASP Top 10 review
- [ ] Dependency vulnerability scan
- [ ] Penetration testing
- [ ] Security disclosure policy

**Deliverables:**
- 90%+ test coverage across all packages
- Complete documentation site
- Security audit report
- Performance benchmarks published

---

### Phase 9: Beta Release (Week 27-28)

**Goal:** Community feedback and stabilization

#### 9.1 Beta Release
- [ ] Publish all packages as `@next`
- [ ] Docker images with `beta` tag
- [ ] Beta documentation site
- [ ] Feedback form/survey
- [ ] Discord/Slack community

#### 9.2 Feedback Loop
- [ ] Monitor GitHub issues
- [ ] Community calls/AMAs
- [ ] Bug triage and fixes
- [ ] Feature requests evaluation

#### 9.3 Marketing
- [ ] Blog post announcing beta
- [ ] Show HN / Reddit posts
- [ ] Twitter/X announcement
- [ ] Demo video
- [ ] Comparison with v1.x

**Deliverables:**
- Public beta available
- 50+ beta testers
- Feedback incorporated
- Go/no-go decision for 2.0.0

---

### Phase 10: 2.0 Release (Week 29-30)

**Goal:** Production release

#### 10.1 Final Preparations
- [ ] Address all critical bugs
- [ ] Finalize documentation
- [ ] Update all examples
- [ ] Prepare release notes
- [ ] Version all packages as 2.0.0

#### 10.2 Release
- [ ] Publish to npm
- [ ] Docker images with `latest` tag
- [ ] Homebrew formula update
- [ ] GitHub release with notes
- [ ] Documentation site live

#### 10.3 Launch
- [ ] Blog post
- [ ] Social media campaign
- [ ] Product Hunt launch
- [ ] Hacker News post
- [ ] Email existing users (if list exists)

**Deliverables:**
- MailDev 2.0.0 released
- Migration path clear for v1.x users
- Community adoption started

---

## Breaking Changes & Migration

### Breaking Changes in 2.0

1. **Node.js Version**: Requires Node.js 20+ (v1.x supported 18+)
2. **API Changes**:
   - Callback-based API deprecated (use async methods)
   - New v2 REST API endpoints (v1 still supported)
3. **Configuration**: New config file format (auto-migration tool provided)
4. **Frontend**: Complete rewrite, no AngularJS upgrade path
5. **Storage**: Improved file persistence (v1.x format still supported)

### Migration Strategy

#### For CLI Users
```bash
# v1.x
maildev --smtp 1025 --web 1080

# v2.0 (backward compatible)
maildev --smtp 1025 --web 1080

# v2.0 (new config file)
maildev --config maildev.config.ts
```

#### For Node.js API Users
```typescript
// v1.x (still works in 2.0)
const MailDev = require('maildev')
const maildev = new MailDev()
maildev.listen(function(err) { /* ... */ })
maildev.on('new', function(email) { /* ... */ })

// v2.0 (new async API)
import { MailDev } from 'maildev'
const maildev = new MailDev()
await maildev.listen()
maildev.on('new', async (email) => { /* ... */ })
```

#### Storage Migration
- Automatic loading of v1.x .eml files (backward compatible)
- Export tool: `maildev export ./maildir --output emails.json`
- Import tool: `maildev import ./emails.json`
- Improved indexing for faster email loading

---

## Future Milestones

### Post-2.0 Features (2.1+)

These features are intentionally deferred from the 2.0 release to maintain focus on core modernization. They represent natural evolution paths for future versions.

#### Version 2.1 - Persistence & Integration (Q4 2026)
1. **Database Storage Options**:
   - SQLite driver for persistent storage
   - PostgreSQL support for team deployments
   - PGLite (WASM) for browser/edge deployments
   - Automatic migration from in-memory to database
2. **Webhooks System**:
   - Webhook configuration UI
   - Webhook delivery with retry logic
   - Signature verification for security
   - Integration with Zapier, Make, n8n
3. **Cloud Storage**:
   - S3-compatible attachment storage
   - Configurable storage backends

#### Version 2.2 - Collaboration (Q1 2027)
4. **Team Features**:
   - Multi-user support with workspaces
   - User roles (admin, developer, viewer)
   - Shared inboxes
   - Email tagging/labeling
   - Comments and annotations on emails
5. **Advanced Collaboration**:
   - Share email links with team
   - Email approval workflows
   - Team activity dashboard

#### Version 2.3+ - Advanced Features
6. **Email Builder**: Visual email template creator for testing
7. **Email Diffing**: Compare two emails side-by-side
8. **Email Archiving**: Archive old emails to reduce memory
9. **Email Replay**: Resend received emails to SMTP for testing
10. **Multi-language Support**: i18n for UI
11. **Browser Extension**: Quickly check emails from browser toolbar
12. **Mobile App**: React Native app for viewing emails
13. **Analytics Dashboard**:
    - Email volume over time
    - Common senders/recipients
    - Attachment statistics
14. **AI Features**:
    - Email summarization
    - Spam detection training
    - Email classification
15. **Performance Mode**: Optimizations for 10k+ emails
16. **Email Rules Engine**: Auto-delete, auto-tag, auto-relay based on rules
17. **IMAP Support**: Use MailDev as an IMAP server
18. **Multi-domain Support**: Different inboxes per domain

---

## Success Metrics

### Technical Metrics
- **Performance**:
  - API response < 100ms (p95)
  - Frontend load < 2s (p50)
  - SMTP handling > 100 emails/sec
- **Quality**:
  - Test coverage > 90%
  - Zero critical security vulnerabilities
  - Lighthouse score > 90
- **Size**:
  - Frontend bundle < 200KB gzipped
  - Docker image < 100MB
  - npm package install < 30s

### Adoption Metrics
- **Downloads**: 100k+ npm downloads/month (currently ~60k)
- **Docker Pulls**: 1M+ pulls (currently ~600k)
- **GitHub**: 5k+ stars (currently 3.5k)
- **Community**: Active Discord/discussions
- **Migration**: 30%+ of v1.x users upgrade in first 6 months

### Business Metrics (if applicable)
- Potential for paid team features
- Potential for cloud-hosted offering
- Potential for enterprise support contracts

---

## Resource Requirements

### Team Composition
- **Lead Developer**: Full-stack, architecture decisions (1 FTE)
- **Backend Developer**: TypeScript, Node.js, databases (0.5-1 FTE)
- **Frontend Developer**: React, TypeScript, UI/UX (0.5-1 FTE)
- **DevOps Engineer**: Docker, CI/CD, infrastructure (0.25 FTE)
- **Technical Writer**: Documentation, guides (0.25 FTE)
- **QA Engineer**: Testing, automation (0.25 FTE)

### Timeline
- **Total Duration**: 30 weeks (7.5 months)
- **Estimated Effort**: 3-4 person-months per phase
- **Total Effort**: ~40-50 person-months

### Budget Estimate (if outsourced)
- Development: $150k-$200k
- Design: $20k-$30k
- Testing/QA: $20k-$30k
- Documentation: $10k-$15k
- **Total**: $200k-$275k

---

## Risk Assessment

### High-Risk Items
1. **Breaking Changes Adoption**: Mitigation: Maintain v1 API compatibility, clear migration docs
2. **Performance Regressions**: Mitigation: Continuous benchmarking, performance budgets
3. **Community Backlash**: Mitigation: Early communication, beta program, responsive to feedback
4. **Monorepo Complexity**: Mitigation: Use proven tools (pnpm, Turborepo), clear documentation

### Medium-Risk Items
1. **Scope Creep**: Mitigation: Phased approach, clear priorities
2. **Third-party Dependencies**: Mitigation: Regular audits, minimize dependencies
3. **Browser Compatibility**: Mitigation: Automated cross-browser testing
4. **Docker Image Size**: Mitigation: Multi-stage builds, Alpine base

### Low-Risk Items
1. **TypeScript Migration**: Well-established patterns
2. **React Ecosystem**: Mature, stable libraries
3. **Testing Infrastructure**: Good tooling available

---

## Open Questions

1. Should we maintain AngularJS version as `maildev@1.x` branch?
2. What is the deprecation timeline for v1 API?
3. Should we offer a cloud-hosted version (maildev.app)?
4. Should we pursue commercial support offerings?
5. What is the governance model for community contributions?
6. Should we join any foundation (OpenJS, etc.)?
7. What is the long-term maintenance commitment?
8. Should we support Windows natively or focus on WSL2?

---

## Appendix A: Technology Comparison

### Why Fastify over Express?
- **Performance**: 2-3x faster (65k req/s vs 25k req/s)
- **TypeScript**: First-class TypeScript support
- **Validation**: Built-in schema validation
- **Ecosystem**: Growing plugin ecosystem
- **Backward compatible**: Similar API to Express

### Why TanStack Query over Redux?
- **Server State**: Purpose-built for API data
- **Caching**: Automatic with smart invalidation
- **Simpler**: Less boilerplate
- **DevTools**: Excellent debugging experience

### Why pnpm over npm/yarn?
- **Speed**: Fastest install times
- **Disk Space**: Efficient storage with content-addressable store
- **Monorepo**: Best workspace support
- **Security**: Strict by default

---

## Appendix B: Example Code Snippets

### Storage API
```typescript
import { Storage } from '@maildev/core'

// Initialize storage with in-memory + file persistence
const storage = new Storage({
  type: 'hybrid',
  mailDirectory: './maildev-emails'
})

// Save email
await storage.saveEmail({
  id: 'abc123',
  from: { address: 'test@example.com', name: 'Test User' },
  subject: 'Hello World',
  text: 'Plain text content',
  html: '<p>HTML content</p>'
})

// Query emails (fast in-memory search)
const emails = await storage.getEmails({
  filter: {
    from: { address: 'test@example.com' }
  },
  limit: 10,
  offset: 0
})

// Load persisted emails on startup
await storage.loadFromDisk()
```

### MCP Server Usage
```typescript
// In Claude Code
// User: "Claude, check if I received a signup email"
// Claude uses: maildev_search_emails({ subject: "signup", limit: 1 })
// Claude: "Yes, you received a signup email at 2:34 PM from noreply@app.com"

// User: "Claude, get me the verification link"
// Claude uses: maildev_get_email({ id: "abc123" })
// Claude extracts link from HTML and returns it
```

### Plugin API
```typescript
import { Plugin } from '@maildev/core'

export const slackNotifier: Plugin = {
  name: 'slack-notifier',
  version: '1.0.0',

  onEmailReceived: async (email, context) => {
    const webhookUrl = context.config.slackWebhookUrl
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        text: `New email from ${email.from.address}: ${email.subject}`
      })
    })
  }
}
```

---

## Appendix C: UI Mockups

*Note: Detailed mockups to be created in design phase. Key screens:*

1. **Email List View**: Split pane with list on left, preview on right
2. **Email Detail**: Full email with tabs for HTML, Text, Raw, Headers
3. **Command Palette**: Cmd+K interface with fuzzy search
4. **Settings Panel**: Configuration options
5. **Search Interface**: Advanced filters with visual builder

---

## Conclusion

MailDev 2.0 represents a comprehensive modernization that will:
- Extend the project's viability for another 5+ years
- Attract new contributors with modern stack
- Enable new use cases (MCP, plugins, team features)
- Maintain the simplicity that made MailDev popular
- Position MailDev as the premier email testing tool

This is an ambitious but achievable plan that respects the project's history while embracing modern best practices. The phased approach allows for course correction and ensures we deliver value incrementally.

**Next Steps:**
1. Review and refine this specification
2. Gather community feedback via GitHub discussion
3. Assemble team or recruit contributors
4. Kick off Phase 1

---

**Document Version History:**
- v1.0 (2026-01-13): Initial draft

**Contributors:**
- Claude (AI Assistant)

**License:**
- This specification is released under MIT License, same as MailDev
