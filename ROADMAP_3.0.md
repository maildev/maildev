# MailDev 3.0 Roadmap

**Quick Reference** | [Full Spec](./MODERNIZATION_SPEC.md) | [Claude Integration](./CLAUDE.md)

---

## TL;DR

Transform MailDev from AngularJS + callbacks → TypeScript + React + modern stack while maintaining backward compatibility.

**Growth wedge:** AI agent integration (MCP) — a capability no competitor (Mailpit, MailHog, Mailtrap) offers. Position 3.0 as *email testing for the AI era* (see [Growth Priorities](#growth-priorities-ranked-by-roi)).

---

## Key Changes

### Technology Stack

| Component | v1.x (Current) | v3.0 (Planned) |
|-----------|----------------|----------------|
| **Backend** | JavaScript + Express | TypeScript + Fastify |
| **Frontend** | AngularJS 1.x | React 18 + Vite |
| **Storage** | In-memory + Files | Enhanced in-memory + improved file persistence |
| **Async** | Callbacks | async/await |
| **API** | REST only | REST + MCP Server |
| **Build** | npm scripts | pnpm + Turborepo |
| **Testing** | Mocha | Vitest + Playwright |
| **Types** | None | Full TypeScript |

---

## Monorepo Packages

```
packages/
├── core/       → @maildev/core       (In-memory storage, types, utils)
├── smtp/       → @maildev/smtp       (SMTP server, email parsing)
├── api/        → @maildev/api        (REST + WebSocket)
├── mcp/        → @maildev/mcp        (Claude integration)
├── ui/         → @maildev/ui         (React UI)
└── cli/        → maildev             (Main CLI package)
```

**Benefits:**
- Clear separation of concerns
- Individual packages can be used standalone
- Better tree-shaking (smaller bundles)
- Easier testing and maintenance
- Focused scope for 3.0 release

---

## 10-Phase Development Plan

### Phase 1: Foundation (Weeks 1-4) ✅
**Setup monorepo infrastructure**
- pnpm workspace + Turborepo
- Shared TypeScript configs
- CI/CD with GitHub Actions
- Changesets for versioning

**Deliverable:** `@maildev/core@3.0.0-alpha.0` - **COMPLETE**

### Phase 2: SMTP Server (Weeks 5-7) ✅
**Modernize email handling**
- TypeScript migration
- async/await throughout
- Improved error handling
- Integration with storage layer

**Deliverable:** `@maildev/smtp@3.0.0-alpha.0` - **COMPLETE** (39 tests)

### Phase 3: REST API (Weeks 8-10) ✅
**Build high-performance API**
- Fastify + TypeScript
- Basic authentication
- CORS configuration
- Query filtering with dot-notation
- WebSocket for real-time (Socket.io)

**Deliverable:** `@maildev/api@3.0.0-alpha.0` - **COMPLETE** (25 tests)

### Phase 4: Frontend (Weeks 11-15) ✅
**Modern React UI**
- ✅ Vite + React 19 + TypeScript
- ✅ Tailwind CSS v4
- ✅ Dark mode with persistence
- ✅ Real-time updates via Socket.io
- ✅ Two-pane layout (sidebar + viewer)
- ✅ Email list with search/filtering
- ✅ Email viewer with HTML/Text/Headers/Source tabs
- ✅ Custom tooltips
- ✅ Command palette (Cmd+K)
- ✅ Keyboard shortcuts

**Deliverable:** `@maildev/ui@3.0.0-alpha.1` (~106KB gzipped - under 200KB target!) - **COMPLETE**

### Phase 5: MCP Server (Weeks 16-17) ✅
**Claude integration**
- ✅ MCP server implementation with stdio transport
- ✅ 5 MCP tools (search, get, get_latest, delete, get_attachment)
- ✅ 3 Resources (emails, stats, email/{id})
- ✅ 4 Prompts for common workflows (verify-signup, check-password-reset, analyze-email, monitor-delivery)
- ✅ HTTP client for MailDev API communication
- ✅ CLI entry point (`maildev-mcp`)
- ✅ **HTTP Transport Integration** - MCP built into API server at `/mcp`
- ✅ Integration tests for MCP HTTP transport (7 tests)
- ✅ Documentation updates (CLAUDE.md)

**Deliverable:** `@maildev/mcp@3.0.0-alpha.0` + CLAUDE.md - **COMPLETE**

### Phase 6: CLI & Distribution (Weeks 18-19) ✅
**Better developer experience**
- ✅ Modern CLI with `maildev init`
- ✅ Configuration file support (.maildevrc.json, maildev.config.js/ts)
- ✅ Environment variable support (MAILDEV_*)
- ✅ Full backward compatibility with v2 CLI options (30+ flags)
- ✅ Graceful shutdown handling (SIGTERM/SIGINT)
- ✅ Programmatic API (`new MailDev()`)
- ✅ 89 CLI tests
- Homebrew formula (pending)

**Deliverable:** `maildev@3.0.0-alpha.1` - **COMPLETE**

### Phase 7: Advanced Features (Weeks 20-23) ⚡
**Power user features (ROI-ranked — see [Growth Priorities](#growth-priorities-ranked-by-roi))**
- ⭐ Convenience test endpoints: `GET /api/email/latest?query=...` returning rendered HTML/text, plus `?embed=1` iframe mode — makes Playwright/Cypress/Vitest integration trivial
- ⭐ Chaos mode in `@maildev/smtp`: configurable SMTP error injection (delays, rejects, mid-message disconnects) — combined with MCP enables agent-driven resilience testing
- Webhooks on new mail (CI pipelines, n8n, Zapier) — table stakes vs Mailpit
- Plugin system with hooks
- Advanced search operators
- Email scenarios/templates

*(Team features deferred to 3.2 per decision log.)*

**Deliverable:** Test endpoints + chaos mode + webhooks + Plugin SDK + 3-5 official plugins

### Phase 8: Testing & Polish (Weeks 24-26) ✅
**Production ready**
- 90%+ test coverage
- E2E tests with Playwright
- Performance optimization
- Security audit
- Complete documentation

**Deliverable:** Ready for beta release

### Phase 9: Beta (Weeks 27-28) 🧪
**Community feedback**
- Public beta release
- Gather feedback from 50+ testers
- Bug fixes and refinements
- Marketing materials

**Deliverable:** `@3.0.0-beta.1` release

### Phase 10: Launch (Weeks 29-30) 🚢
**Go live**
- Final release `@3.0.0`
- ✅ Documentation site (complete)
- Migration guides
- Marketing campaign — lead with the MCP/AI-agent story (see [Growth Priorities](#growth-priorities-ranked-by-roi))

**Deliverable:** MailDev 3.0.0 released!

---

## Breaking Changes

### ✅ Backward Compatible
- CLI arguments (mostly)
- REST API v1 endpoints
- Docker image usage
- Basic configuration

### ⚠️ Breaking Changes
- **Node.js 20+** required (was 18+)
- **Callback APIs** deprecated (use async/await)
- **Frontend** completely new (no AngularJS upgrade path)
- **New config format** (auto-migration available)
- **Improved file persistence** (v1.x format still supported)

### 🔄 Migration Path
```bash
# v2.x .eml files automatically loaded (backward compatible)
maildev --mail-directory ./maildev-emails

# Export emails if needed
maildev export ./maildir --output emails.json

# Import emails
maildev import ./emails.json

# Migrate configuration
maildev migrate-config ./maildev-config.json
```

---

## New Features Highlight

### 🎯 Command Palette (Cmd+K)
```
Cmd+K → Type "delete old" → Instant action
```

### 🔍 Advanced Search
```
from:noreply@app.com has:attachment after:yesterday subject:"order"
```

### 🤖 Claude Integration
```
You: "Claude, check if the signup email arrived"
Claude: "Yes, received at 2:34 PM. Verification link: https://..."
```

### 🔌 Plugin System
```typescript
import { Plugin } from '@maildev/core'

export const slackNotifier: Plugin = {
  onEmailReceived: async (email) => {
    await notifySlack(`New email: ${email.subject}`)
  }
}
```

### 💾 Improved Storage
- **In-Memory**: Fast, default storage (v2.x compatible)
- **File Persistence**: Better indexing and faster loading of .eml files
- **Hybrid Mode**: In-memory with automatic background disk sync
- **Backward Compatible**: Automatically loads v2.x email directories

### 🎨 Modern UI
- Dark mode
- Responsive design
- Email device previews
- Keyboard navigation (j/k for Gmail-like nav)
- Virtualized lists (handle 10k+ emails)

---

## Competitive Analysis: MailDev vs Mailpit

Mailpit (~10.4k GitHub stars vs MailDev's ~3.5k) grew largely on: a single Go
binary, a polished docs site, fast storage, and email QA checks. MailDev can't
match the static binary, but it has a wedge Mailpit lacks: **AI agent
integration**. All growth messaging should lead with that.

### Feature parity snapshot

| Feature | Mailpit | MailDev |
|---------|---------|---------|
| MCP / AI agent integration | ❌ | ✅ **5 tools, 3 resources, 4 prompts (stdio + HTTP)** |
| Programmatic embedding (`new MailDev()`) | ❌ (standalone binary) | ✅ |
| Command palette (Cmd+K), keyboard-first UI, dark mode | ❌ | ✅ |
| TypeScript monorepo — hackable in JS, packages usable standalone | ❌ (Go) | ✅ |
| HTML check (client compatibility scoring) | ✅ | ❌ (defer to 3.1) |
| Link check (broken links / linked images) | ✅ | ❌ (defer to 3.1) |
| Chaos mode (SMTP error injection) | ✅ | ❌ → Phase 7 |
| Webhook on new mail | ✅ | ❌ → Phase 7 |
| Convenience test endpoints (`latest?query=`, `?embed=1`) | ✅ | ❌ → Phase 7 |
| Message tagging (manual + auto via plus-addressing) | ✅ | ❌ (defer to 3.2) |
| HTML screenshots, SpamAssassin check, POP3 | ✅ | ❌ (not worth chasing — see below) |
| Single static binary / `brew install` + brew services | ✅ | ❌ (Node 20+); Homebrew formula pending |
| Docs website | ✅ | ✅ Complete |
| Published benchmarks (200–300 emails/sec) | ✅ | ❌ |

### Growth Priorities (Ranked by ROI)

**Tier 1 — Quick wins (low effort, high visibility)**
1. **Lead all messaging with MCP** — the differentiator Mailpit can't copy: MCP headline in README, demo GIF of Claude verifying a signup link, copy-paste configs for Claude Desktop/Cursor/Codex/Windsurf, list in the MCP Registry
2. **Convenience test endpoints** — `GET /api/email/latest?query=...` (rendered HTML/text) + `?embed=1` iframe mode; trivial to add on the existing API, and the #1 unlock for Playwright/Cypress/Vitest integration (Phase 7)
3. **Homebrew formula** — already pending from Phase 6; low effort, big Mac adoption
4. **"MailDev vs Mailpit vs MailHog" comparison table** — high-traffic SEO draw for README/docs site

**Tier 2 — Medium effort, strong differentiators**
5. **Chaos mode in `@maildev/smtp`** — cheap to build; combined with MCP enables a story nobody else can tell: *"Claude, make SMTP fail and verify our app retries"*
6. **Webhooks** — promote from 3.1 into Phase 7; table stakes for CI/n8n integrations
7. **Test-framework recipes** — Playwright/Cypress/Vitest guides, plus optional first-party `@maildev/test` helpers (Mailpit relies on a community Cypress package; first-party is better)
8. **Published benchmarks** — throughput (emails/sec) + memory vs Mailpit's published numbers

**Tier 3 — Bigger builds (defer to 3.1+)**
9. **HTML check / link check** — Mailpit's real moat; leverage the npm ecosystem (e.g., caniemail data) rather than porting Mailpit's approach
10. **HTML screenshots** — via Playwright (already in the stack for E2E)
11. **OpenAPI spec** — machine-readable REST API for client codegen

**Not worth chasing:** POP3, SpamAssassin integration, sendmail shim — niche relative to MailDev's Node/AI positioning.

---

## Success Metrics

### Technical
- ✅ API response < 100ms (p95)
- ✅ Frontend bundle < 200KB gzipped
- ✅ Test coverage > 90%
- ✅ Lighthouse score > 90
- ✅ Docker image < 100MB

### Adoption
- 📈 npm downloads: 100k/month (currently 60k)
- 📈 Docker pulls: 1M+ (currently 600k)
- ⭐ GitHub stars: 5k+ (currently 3.5k)
- 🔄 Migration: 30%+ of v2.x users in 6 months

---

## Quick Start for Contributors

### Development Setup
```bash
# Clone repo
git clone https://github.com/maildev/maildev.git
cd maildev

# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

### Package Development
```bash
# Work on specific package
cd packages/smtp
pnpm dev

# Run package tests
pnpm test

# Build package
pnpm build
```

---

## Resource Requirements

### Team (Full-Time Equivalents)
- **Lead Developer**: 1.0 FTE (architecture, coordination)
- **Backend Dev**: 0.5-1.0 FTE (TypeScript, Node.js)
- **Frontend Dev**: 0.5-1.0 FTE (React, TypeScript, UI/UX)
- **DevOps**: 0.25 FTE (Docker, CI/CD)
- **Technical Writer**: 0.25 FTE (docs, guides)
- **QA Engineer**: 0.25 FTE (testing, automation)

### Budget (if outsourced)
- Development: $150k-$200k
- Design/UX: $20k-$30k
- Testing/QA: $20k-$30k
- Documentation: $10k-$15k
- **Total**: $200k-$275k

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Database migration issues | Extensive testing, fallback to in-memory |
| Breaking changes pushback | v1 API compatibility, clear migration docs |
| Performance regressions | Continuous benchmarking, performance budgets |
| Scope creep | Phased approach, clear priorities |
| Community backlash | Early communication, beta program |

---

## Future Milestones (Post-3.0)

These features are intentionally deferred to maintain focus on core modernization in 3.0.

### Version 3.1 - Persistence & Integration (Q4 2026)
- **Database Storage**: SQLite, PostgreSQL, PGLite drivers
- **HTML Check**: Email client compatibility scoring (leverage caniemail data)
- **Link Check**: Validate message links (HTML & text) and linked images
- **HTML Screenshots**: Capture message screenshots via Playwright (already in the stack)
- **OpenAPI Spec**: Machine-readable REST API spec for client codegen
- **Cloud Storage**: S3-compatible attachment storage
- **Advanced Persistence**: Automatic migration to databases

### Version 3.2 - Collaboration (Q1 2027)
- **Team Features**: Multi-user workspaces, roles, shared inboxes
- **Email Collaboration**: Tagging, comments, annotations
- **Team Dashboard**: Activity tracking and analytics

### Version 3.3+ - Advanced Features
- Email builder (visual template creator)
- Email diffing (compare two emails)
- IMAP support
- Browser extension
- Mobile app (React Native)
- AI email summarization
- Email classification
- Spam detection training
- Multi-language support (i18n)
- Cloud-hosted offering (maildev.app)
- Enterprise features
- Email archiving
- Load testing tools
- Email replay system

---

## Open Questions

1. **Maintenance**: Keep v2.x branch with security fixes?
3. **Deprecation**: Timeline for removing v1 API?
3. **Commercial**: Offer paid cloud version?
4. **Governance**: Community contribution model?
5. **Foundation**: Join OpenJS or similar?
6. **Windows**: Native support or WSL2 only?

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-13 | Use Fastify over Express | 2-3x performance, better TypeScript |
| 2026-01-13 | pnpm over npm/yarn | Fastest, best monorepo support |
| 2026-01-13 | React over Vue/Svelte | Larger ecosystem, team familiarity |
| 2026-01-13 | Defer database storage to 3.1 | Focus on core modernization first |
| 2026-01-13 | Defer team features to 3.2 | Prioritize individual developer experience |
| 2026-09-22 | Lead all marketing with the MCP/AI-agent story | Mailpit (and all competitors) have no AI story; MailDev's unique wedge |
| 2026-09-22 | Add chaos mode + latest-email test endpoints to Phase 7 | Cheap, high-ROI additions vs Mailpit; enable agent-driven resilience testing |
| 2026-09-22 | Move webhooks from 3.1 into Phase 7 | Table stakes for CI integrations; Mailpit already ships it |
| 2026-09-22 | Defer HTML/link checks to 3.1 | Big build; keep 3.0 scope focused |
| 2026-09-22 | Documentation site complete | Pulled forward from Phase 10 |

---

## Resources

- **Full Specification**: [MODERNIZATION_SPEC.md](./MODERNIZATION_SPEC.md)
- **Claude Integration**: [CLAUDE.md](./CLAUDE.md)
- **Docs Site**: ✅ Live (see [docs/](./docs/))
- **GitHub Issues**: https://github.com/maildev/maildev/issues
- **Discussions**: https://github.com/maildev/maildev/discussions

---

## Get Involved

### Ways to Contribute

1. **Code**: Pick an issue from the 3.0 milestone
3. **Testing**: Join the beta program (Phase 9)
3. **Documentation**: Improve guides and examples
4. **Design**: Help with UI/UX mockups
5. **Feedback**: Share your ideas in Discussions

### Communication

- **GitHub**: Primary communication channel
- **Discord**: (Coming soon) Real-time chat
- **Twitter**: [@maildev](https://twitter.com/maildev) (if exists)

---

## Timeline Summary

```
Jan 2026    Feb 2026    Mar 2026    Apr 2026    May 2026    Jun 2026    Jul 2026    Aug 2026
|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
    P1          P2          P3          P4          P5          P6          P7          P8-9-10
Foundation   SMTP        API       Frontend    MCP         CLI      Advanced    Test+Launch
                                                                    Features
```

**Milestones:**
- ✅ **Mid January 2026**: Core packages ready (`@maildev/core`, `@maildev/smtp`, `@maildev/api`)
- ✅ **Early February 2026**: UI + MCP complete
- **End of July**: Feature complete, beta release
- **Mid August**: 3.0.0 final release 🎉

---

## Quick Reference Commands

```bash
# Install
npm install -g maildev@3.0.0

# Start basic
maildev

# Start with MCP
maildev --enable-mcp

# With config file
maildev --config maildev.config.ts

# Export v1 data
maildev export-v1 ./maildir --output emails.json

# Import to v2
maildev import ./emails.json

# Initialize new project
maildev init

# Check status
maildev status

# Clean up
maildev clear-all

# Run tests (development)
pnpm test

# Build all packages
pnpm build

# Start development mode
pnpm dev
```

---

**Last Updated:** 2026-09-22
**Document Version:** 1.9
**Status:** Phase 6 Complete (docs site live) — Ready for Phase 7 (Advanced Features, ROI-ranked)

---

**Progress:**
1. ✅ Create detailed specification
2. ✅ Phase 1: Foundation - `@maildev/core` (51 tests)
3. ✅ Phase 2: SMTP Server - `@maildev/smtp` (39 tests)
4. ✅ Phase 3: REST API - `@maildev/api` (25 tests)
5. ✅ Phase 4: Frontend Rewrite - **COMPLETE**
   - ✅ Foundation: Vite, React 19, Tailwind v4, TypeScript
   - ✅ Core UI: Layout, Header, Sidebar, Email List, Email Viewer
   - ✅ Data layer: API client, TanStack Query hooks, Zustand store
   - ✅ Real-time: Socket.io integration
   - ✅ Features: Dark mode, search, delete, mark read, download
   - ✅ UX: Custom instant tooltips
   - ✅ v2 Feature Parity:
     - ✅ Refresh button (manual email list refresh)
     - ✅ Viewport toggle (7 responsive sizes for HTML preview)
     - ✅ Settings dropdown (notifications, auto-show toggles)
     - ✅ Browser notifications (with debounce)
     - ✅ Auto-show new mail
     - ✅ Favicon badge (unread count + title update)
     - ✅ Relay functionality (original + custom recipients)
   - ✅ Command palette (Cmd+K):
     - ✅ Keyboard shortcut (Cmd+K / Ctrl+K)
     - ✅ Search filtering across commands
     - ✅ Keyboard navigation (Arrow keys, Enter, Escape)
     - ✅ Categorized commands (Email, Navigation, Settings)
     - ✅ 15+ commands with icons and shortcuts
   - ✅ Keyboard shortcuts:
     - ✅ j/k - Navigate emails (Gmail-style, respects search filter)
     - ✅ / - Focus search
     - ✅ r - Refresh emails
     - ✅ s - Toggle sidebar
     - ✅ a - Mark all as read
     - ✅ c - Clear search
     - ✅ Delete/Backspace - Delete selected email
     - ✅ Escape - Deselect email / blur input
     - ✅ ? - Open command palette
     - ✅ All shortcuts work from within HTML preview iframe
   - ✅ Discoverability:
     - ✅ Shortcut hints in command palette for all commands
     - ✅ Shortcut hints in button tooltips (e.g., "Refresh emails (r)")
     - ✅ "/" keyboard hint badge in search input
   - ✅ Enhanced search:
     - ✅ Auto-selects first result when typing
     - ✅ Arrow up/down navigation while in search input
   - ✅ Loading indicators:
     - ✅ Global loading bar at top of screen during refresh
     - ✅ Spinning refresh icon in header
     - ✅ Minimum display time for visibility

6. ✅ Phase 5: MCP Server - **COMPLETE**
   - ✅ Package setup with @modelcontextprotocol/sdk
   - ✅ HTTP client for MailDev API (client.ts)
   - ✅ MCP server with stdio transport (server.ts)
   - ✅ CLI entry point (cli.ts)
   - ✅ 5 Tools implemented (minimal set to reduce context bloat):
     - `maildev_search_emails` - Search with filters
     - `maildev_get_email` - Get email by ID
     - `maildev_get_latest_email` - Get most recent email(s)
     - `maildev_delete_email` - Delete by ID
     - `maildev_get_attachment` - Get attachment as base64
   - ✅ 3 Resources: `maildev://emails`, `maildev://stats`, `maildev://email/{id}`
   - ✅ 4 Prompts: verify-signup-email, check-password-reset, analyze-email-content, monitor-email-delivery
   - ✅ Build passing
   - ✅ **HTTP Transport Integration**:
     - MCP server built into `@maildev/api` at `/mcp` endpoint
     - Reusable `EmailDataSource` interface for handlers
     - Direct storage access (no HTTP round-trip)
     - Session management with `mcp-session-id` header
     - 7 integration tests for MCP HTTP transport
   - ✅ Documentation updates (CLAUDE.md)

7. ✅ Phase 6: CLI & Distribution - **COMPLETE**
   - ✅ Full CLI implementation with Commander.js
   - ✅ Configuration system:
     - Config file discovery (.maildevrc.json, maildev.config.ts/js)
     - Environment variable mapping (MAILDEV_*)
     - Priority-based merging (CLI > env > file > defaults)
     - Validation with helpful error messages
   - ✅ Server orchestration:
     - Storage, SMTP, API server lifecycle management
     - Graceful shutdown (SIGTERM/SIGINT)
   - ✅ All 30+ v2 CLI options supported
   - ✅ New v3 options: --mcp, --config
   - ✅ `maildev init` interactive setup wizard
   - ✅ Programmatic API: `new MailDev({ smtp: 1025 })`
   - ✅ 89 CLI tests (config, env, validation, logger)
   - ✅ Brand colors implemented:
     - Light cream: #FFFCF7
     - Dark black-blue: #182436

**Total Tests:** 204 passing across all packages
**UI Bundle:** ~106KB gzipped (under 200KB target)

Let's build the future of email testing! 🚀
