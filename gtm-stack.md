# GTM Stack — Architecture Specification
> **Status:** Living Technical Spec | **Owner:** GTM Operations | **Version:** 0.1

---

## Purpose

This document defines the data architecture, infrastructure patterns, and development standards for all Claude-powered GTM tools at Zendesk. It exists to prevent the proliferation of sloppy, one-off tool builds and to establish a shared foundation that makes every tool better, faster to build, and more trustworthy than the last.

The core principle: **infrastructure first, tools second.** Tools are the output of this system, not the system itself.

---

## Tool Directory

| Path | Description |
|---|---|
| `/forecasting` | Pipeline forecasting, commit management, scenario modeling |
| `/deal_review` | Live deal inspection, risk scoring, next-step coaching |
| `/account_planning` | Strategic account plans, whitespace analysis |
| `/territory_planning` | Territory design, coverage modeling, quota capacity |
| `/pipeline_creation` | Prospecting, ICP scoring, outbound prioritization |
| `/product-penetration` | Product adoption mapping, expansion opportunity detection |
| `/renewals` | Renewal health, churn risk, expansion signals |
| `/qbr` | QBR prep, narrative generation, performance summaries |
| `/account-hygiene` | CRM data quality, field completeness, dupe detection |
| `/rules-of-engagement` | ROE lookup, conflict resolution, coverage policy |
| `/quota-attainment` | Attainment tracking, pacing analysis, gap identification |

---

## Architecture Overview

The stack has four layers. Each layer has a single responsibility, and tools only interact with the layer directly below them.

```
┌─────────────────────────────────────────────────────┐
│                   TOOL LAYER                        │
│   /forecasting  /deal_review  /pipeline_creation …  │
└────────────────────────┬────────────────────────────┘
                         │ Standard Tool Input Contract
┌────────────────────────▼────────────────────────────┐
│               ORCHESTRATION LAYER                   │
│   Claude Code · MCP Servers · Prompt Templates      │
│   RAG Engine · Context Assembly · Role Enforcement  │
└────────────────────────┬────────────────────────────┘
                         │ Semantic Queries
┌────────────────────────▼────────────────────────────┐
│                  SEMANTIC LAYER                     │
│   GTM Mart (Snowflake Views) · Entity Definitions   │
│   Metric Registry · Access Control Views            │
└────────────────────────┬────────────────────────────┘
                         │ Raw Data
┌────────────────────────▼────────────────────────────┐
│                  DATA SOURCE LAYER                  │
│   Salesforce · Snowflake · Gong · ZoomInfo          │
│   Outreach/Salesloft · Product Usage · Others       │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Data Source Layer

All external data lands in Snowflake. No tool ever queries a source system directly. This is non-negotiable — it ensures consistency, performance, and access control.

**Current sources:**
- **Salesforce** — Opportunities, Accounts, Contacts, Activities, Forecast hierarchy
- **Gong** — Call transcripts, deal signals, rep activity, conversation intelligence
- **ZoomInfo** — Firmographic enrichment, contact data
- **Outreach / Salesloft** — Sequence activity, email engagement, cadence data
- **Product usage** — Feature adoption, login events, consumption metrics

**Ingestion principle:** All sources sync to Snowflake on defined schedules. The semantic layer is the consumer — nothing else touches raw tables directly.

---

## Layer 2: Semantic Layer (GTM Mart)

This is the most important investment in the stack. The semantic layer is a collection of purpose-built Snowflake views that translate raw source data into clean, business-meaningful entities. It eliminates redundant query logic across tools and enforces a single definition of every metric.

### Core Entity Views

Each view is named to match the business concept it represents, not the source table it comes from.

```
GTM_MART.ACCOUNTS          -- Account master with firmographic + health attributes
GTM_MART.OPPORTUNITIES     -- Opportunities with stage, ARR, scores, risk flags
GTM_MART.REP_HIERARCHY     -- Manager chain, territory assignments, quota roster
GTM_MART.FORECASTS         -- Commit, best case, pipeline by rep/segment/period
GTM_MART.DEALS_AT_RISK     -- Stalled, slipping, or hygiene-flagged opportunities
GTM_MART.RENEWAL_HEALTH    -- Renewal ARR, health score, churn signals, NRR
GTM_MART.GONG_SIGNALS      -- Summarized call intelligence joined to opportunities
GTM_MART.PRODUCT_ADOPTION  -- Feature usage by account, mapped to expansion whitespace
GTM_MART.PIPELINE_COVERAGE -- Coverage ratios by rep/segment/period vs quota
GTM_MART.QUOTA_ATTAINMENT  -- Attainment %, pacing, gap to goal by rep and period
```

### Metric Registry

Every calculated metric (e.g., "pipeline coverage ratio," "days since last activity," "renewal health score") is defined once in the semantic layer. Tools reference the view column — they do not reimplement the calculation.

A `/metrics` registry file will document each metric's definition, source fields, and owner. This is the contract between data and tools.

### Access Control Views

Data isolation is enforced at the semantic layer using role-parameterized views. The pattern:

```sql
-- Example: Opportunity view scoped to requesting user's book of business
CREATE OR REPLACE VIEW GTM_MART.OPPORTUNITIES AS
SELECT *
FROM RAW.SFDC_OPPORTUNITIES
WHERE owner_id = CURRENT_SETTING('app.user_sfdc_id')   -- rep-level isolation
   OR manager_id = CURRENT_SETTING('app.user_sfdc_id') -- manager sees team
   OR CURRENT_SETTING('app.user_role') IN ('ops', 'exec'); -- ops/exec see all
```

The MCP server sets the session context variables at connection time based on the authenticated user. Tools never pass user identity into SQL — the view handles it.

**Role tiers:**
- `rep` — Own book only
- `manager` — Reporting team
- `director` — Full segment
- `exec` — Organization-wide
- `ops` — Full access (read), audit-logged

---

## Layer 3: Orchestration Layer

This layer is where Claude lives. It sits between the semantic layer and the tool layer, responsible for translating intent into data queries, assembling context, and enforcing consistent behavior across tools.

### MCP Servers

Two MCP servers are the backbone of all data access:

**`mcp-snowflake`**
- Authenticates the requesting user
- Sets session role context variables before any query runs
- Exposes `query()`, `list_views()`, and `explain_metric()` tools
- Logs all queries with user, timestamp, and tool origin

**`mcp-salesforce`**
- Direct SFDC access for real-time record mutations (e.g., updating a field from a hygiene tool)
- Read-only queries should prefer Snowflake for performance
- Used for actions, not analysis

### RAG Engine

Some tools require unstructured data retrieval — call transcripts, account notes, Gong summaries, QBR documents. These are handled by a separate RAG pipeline:

**Indexing:**
- Gong transcripts, SFDC notes/chatter, and document artifacts are chunked and embedded on ingest
- Embeddings stored in a vector store (Snowflake Cortex or a dedicated service — TBD)
- Metadata tags: `account_id`, `opportunity_id`, `owner_id`, `date`, `source_type`

**Retrieval:**
- Retrieval is always scoped by access control metadata — a rep cannot retrieve chunks belonging to accounts outside their book
- Queries include structured filter + semantic similarity

**Pattern:** structured data from the mart, unstructured data from the RAG engine. The orchestration layer merges both into the context window before Claude reasons over them.

### Context Assembly

Before Claude processes any tool request, the orchestration layer assembles a standard context object. This is the **Standard Tool Input Contract** — every tool receives the same envelope.

```json
{
  "user": {
    "sfdc_id": "0051a000001XyZA",
    "name": "Jane Doe",
    "role": "manager",
    "segment": "ENT",
    "team_ids": ["005...", "005...", "005..."]
  },
  "tool": {
    "name": "deal_review",
    "version": "1.0",
    "mode": "on_demand"
  },
  "scope": {
    "account_id": "0011a000002BcDE",
    "opportunity_id": "0061a000003FgHI",
    "period": "2026-Q1",
    "filters": {}
  },
  "data": {
    "structured": { },
    "rag_chunks": [ ],
    "retrieved_at": "2026-02-25T14:32:00Z"
  },
  "config": {
    "output_format": "markdown_brief",
    "max_tokens": 2000,
    "temperature": 0.2
  }
}
```

Tools are written to consume this contract. They do not fetch their own data.

### Prompt Templates

Each tool has a versioned prompt template stored alongside the tool code. Templates reference slots from the input contract (`{{user.name}}`, `{{data.structured.opportunity}}`). Prompt changes are version-controlled and logged — this is how we maintain quality as tools evolve.

---

## Layer 4: Tool Layer

Tools are the user-facing outputs of this system. Given the shared infrastructure below, each tool should be relatively thin — focused on translating the assembled context into a useful output for a specific GTM use case.

### Tool Modes

**On-demand** — User invokes the tool explicitly (e.g., "review this deal"). Most tools start here.

**Scheduled** — Tool runs automatically on a cadence and surfaces output proactively (e.g., weekly pipeline health digest every Monday at 7am).

**Conversational / Q&A** — User asks natural language questions against live data (e.g., "What's my coverage for Q2?"). Handled via a text-to-SQL pattern over the semantic layer. Not every tool needs this mode — it should be explicitly enabled per tool.

### Output Standards

Tools have flexibility in output format, but must declare their output type in their config. Supported types:

- `markdown_brief` — Structured narrative summary (default for most tools)
- `json_payload` — Structured data for downstream consumption or rendering
- `slack_message` — Condensed output formatted for Slack posting
- `csv_export` — Tabular data for ad-hoc analysis
- `qbr_narrative` — Long-form narrative for executive documents

### Tool Development Checklist

Before a new tool is merged, it must satisfy:

- [ ] Reads from the semantic layer only (no direct raw table queries)
- [ ] Declares its access role requirements
- [ ] Consumes the Standard Tool Input Contract
- [ ] Has a versioned prompt template
- [ ] Declares output format in config
- [ ] Handles empty/null data gracefully
- [ ] Includes a test fixture with sample input and expected output shape

---

## Data Governance

### Single Source of Truth

| Entity | SoT View | Update Frequency |
|---|---|---|
| Opportunity data | `GTM_MART.OPPORTUNITIES` | Every 4 hours |
| Account data | `GTM_MART.ACCOUNTS` | Daily |
| Forecast | `GTM_MART.FORECASTS` | Every 4 hours |
| Rep hierarchy | `GTM_MART.REP_HIERARCHY` | Daily |
| Gong signals | `GTM_MART.GONG_SIGNALS` | Daily |
| Product usage | `GTM_MART.PRODUCT_ADOPTION` | Daily |

### Audit Logging

All tool invocations are logged with: user, role, tool name, query executed, timestamp, and output shape. This is required for both security and quality improvement.

### Data Quality

The semantic layer views include data quality flags. Tools should surface warnings when operating on low-quality data (e.g., stale opportunity data, missing close dates, no activity in 30+ days). This is a feature, not noise.

---

## Infrastructure Build Sequence

This is the recommended order of operations. Do not build tools before the foundation is solid.

**Phase 1 — Foundation (build this first)**
1. Snowflake GTM Mart view definitions for core entities
2. Metric registry document
3. Access control view pattern + role taxonomy
4. `mcp-snowflake` server with session-scoped auth

**Phase 2 — Orchestration**
5. Standard Tool Input Contract schema
6. Context assembly module
7. `mcp-salesforce` server (mutations only)
8. RAG pipeline: ingest, embed, retrieve with access-scoped metadata

**Phase 3 — First Tools (prove the pattern)**
9. `/forecasting` — highest value, tests structured data path end-to-end
10. `/deal_review` — tests RAG path (Gong + SFDC notes)
11. `/quota-attainment` — tests scheduled mode

**Phase 4 — Scale**
12. Remaining tools built by any team member against the established pattern
13. Conversational Q&A mode enabled for `/forecasting` and `/pipeline_creation`
14. Persuasion document generated from this spec for stakeholder alignment

---

## Open Decisions

| Decision | Options | Recommended | Status |
|---|---|---|---|
| Vector store for RAG | Snowflake Cortex, Pinecone, pgvector | Snowflake Cortex (keeps data in-warehouse) | **Open** |
| Scheduled job runner | Airflow, dbt Cloud, cron + Lambda | TBD based on existing infra | **Open** |
| Transformation layer | Raw Snowflake views vs dbt | Snowflake views to start, migrate to dbt when complexity warrants | **Decided** |
| User auth for MCP | SFDC OAuth, SSO, service account | SSO preferred for user-scoped tools | **Open** |
| Embedding model | OpenAI Ada, Snowflake Cortex embed | TBD | **Open** |

---

## Changelog

| Version | Date | Author | Notes |
|---|---|---|---|
| 0.1 | 2026-02-25 | GTM Ops | Initial architecture draft |
