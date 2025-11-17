# ArbHub: Multi-Account Facebook Ads Monitoring System

**Version:** 1.0.0-simulation  
**Status:** Pre-Production Validation Phase  
**Architecture:** Serverless Event-Driven Microservices  
**Deployment Target:** Vercel + Supabase  

---

## EXECUTIVE SUMMARY

Real-time monitoring dashboard aggregating 30-100 Facebook ad accounts across multiple Business Managers. Tracks spend progression, CPC trends, account suspensions, and vendor compliance metrics with 5-minute data refresh cycles. Designed for media buying arbitrage operations managing high-churn agency account portfolios.

**CRITICAL SUCCESS METRICS:**
- Account suspension detection: <5 minutes from Facebook status change
- Dashboard load time: <2 seconds on 4G mobile connection
- Data accuracy: <2% variance vs Facebook Ads Manager
- Uptime requirement: 99.9% (maximum 43 minutes downtime/month)

---

## SYSTEM ARCHITECTURE

### INFRASTRUCTURE STACK

**Frontend:**
- Framework: Next.js 14+ (React 18)
- Styling: TailwindCSS 3.x
- State Management: React Context + WebSocket subscriptions
- Authentication: Supabase Auth (JWT-based)

**Backend:**
- Runtime: Node.js 20+ (Vercel Serverless Functions)
- Scheduler: Vercel Cron (5-minute intervals)
- API Client: facebook-business-sdk v21.0

**Database:**
- Primary: Supabase PostgreSQL 15
- Caching: Built-in materialized views
- Backup: Automatic daily snapshots + 7-day PITR

**External APIs:**
- Facebook Marketing API v21.0
- Rate Limit: 4,800 calls/hour per app
- Authentication: System User long-lived access token

---

## DATA ARCHITECTURE

### DATABASE SCHEMA

```sql
-- PRODUCTION TABLES

CREATE TABLE ad_accounts (
  account_id VARCHAR(20) PRIMARY KEY,
  vendor_name VARCHAR(50) NOT NULL,
  business_manager_id VARCHAR(20),
  date_added TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  archived_at TIMESTAMP NULL
);

CREATE TABLE account_metrics (
  id BIGSERIAL PRIMARY KEY,
  account_id VARCHAR(20) REFERENCES ad_accounts(account_id),
  snapshot_time TIMESTAMP NOT NULL,
  
  -- FACEBOOK API RAW VALUES (cents)
  daily_spend_limit INTEGER,
  spend_cap INTEGER,
  amount_spent INTEGER,
  
  -- CONVERTED DISPLAY VALUES (dollars)
  spend_today DECIMAL(10,2),
  daily_limit_display DECIMAL(10,2),
  
  -- CALCULATED METRICS
  spend_progress_percent DECIMAL(5,2),
  cpc DECIMAL(6,4),
  outbound_clicks INTEGER,
  active_ads_count INTEGER,
  total_ads_count INTEGER,
  account_balance DECIMAL(10,2),
  
  -- STATUS
  account_status INTEGER, -- 1=active, 100=suspended
  
  CONSTRAINT unique_snapshot UNIQUE(account_id, snapshot_time)
);

CREATE INDEX idx_latest_metrics ON account_metrics(account_id, snapshot_time DESC);
CREATE INDEX idx_suspended_accounts ON account_metrics(account_status) WHERE account_status = 100;

-- SIMULATION TABLES (Phase 1 only)

CREATE TABLE mock_ad_accounts (
  account_id VARCHAR(20) PRIMARY KEY,
  vendor_name VARCHAR(50),
  initial_cap_cents INTEGER,
  cap_growth_rate VARCHAR(20), -- 'fast', 'normal', 'slow', 'declining'
  base_cpc DECIMAL(6,4),
  suspension_probability DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mock_account_metrics (
  -- Identical schema to account_metrics
  -- Used during 7-day simulation validation
);

CREATE TABLE simulation_config (
  id SERIAL PRIMARY KEY,
  simulation_mode BOOLEAN DEFAULT TRUE,
  update_interval INTEGER DEFAULT 300,
  last_update TIMESTAMP
);
```

### DATA RETENTION POLICY

```
REAL-TIME DATA (account_metrics):
• Retention: 30 days rolling window
• Partitioning: Daily partitions by snapshot_time
• Archive: Export to cold storage (S3) after 30 days

ACCOUNT REGISTRY (ad_accounts):
• Retention: Indefinite (soft delete via archived_at)
• Purpose: Historical vendor reconciliation

SIMULATION DATA:
• Retention: 14 days post-production cutover
• Purpose: Regression testing, feature validation
```

---

## API INTEGRATION SPECIFICATION

### FACEBOOK MARKETING API

**AUTHENTICATION:**
```
Method: System User Token (OAuth 2.0)
Scope: ads_read, ads_management
Token Lifespan: 60 days (manual refresh required)
Storage: Vercel Environment Variables (encrypted at rest)
```

**BATCH REQUEST STRUCTURE:**
```javascript
// Optimized for 100 accounts = 2 batch calls per cycle

POST https://graph.facebook.com/v21.0/
Content-Type: application/json

{
  "access_token": process.env.FB_ACCESS_TOKEN,
  "batch": [
    {
      "method": "GET",
      "relative_url": "act_123/insights?date_preset=today&fields=spend,cpc,outbound_clicks"
    },
    // ... 49 more accounts
  ]
}
```

**RATE LIMIT MANAGEMENT:**
```
Current Usage: 48 calls/hour (100 accounts × 2 batches × 12 cycles)
Capacity: 4,800 calls/hour
Utilization: 1% (99% headroom)
Throttling: Not required until 2,000+ accounts
```

**ERROR HANDLING:**
```javascript
// Exponential backoff for transient failures
const retryDelays = [1000, 3000, 9000] // milliseconds

// Permanent failure conditions
if (error.code === 200) {
  // Insufficient permissions - mark account as access_lost
}
if (error.code === 100) {
  // Invalid parameter - log for investigation, skip account
}
if (error.code === 190) {
  // Expired token - trigger immediate alert, halt all polling
}
```

---

## CRON JOB SPECIFICATION

### PRODUCTION POLLER

**FILE:** `/api/fetch-fb-data-production.js`

**SCHEDULE:** `*/5 * * * *` (every 5 minutes)

**EXECUTION FLOW:**
```
1. Query ad_accounts table for active accounts
2. Chunk into batches of 50 accounts
3. Execute parallel batch requests to Facebook API
4. Parse responses, handle errors individually
5. Calculate derived metrics (spend progress, CPC trend)
6. Bulk insert into account_metrics table
7. Detect suspensions (account_status = 100)
8. Emit WebSocket event for real-time dashboard updates
9. Log execution metrics (duration, success rate, errors)
```

**TIMEOUT:** 60 seconds (abort if exceeded)

**SUCCESS CRITERIA:**
- ≥95% account data successfully retrieved
- Execution time <30 seconds for 100 accounts
- Zero database write failures

**FAILURE RESPONSE:**
```javascript
if (successRate < 0.95) {
  await notifySlack({
    channel: '#critical-alerts',
    message: `Cron job degraded: ${failedAccounts.length} accounts failed`
  })
}

if (executionTime > 45000) {
  await logWarning('Performance degradation - review API response times')
}
```

---

## FRONTEND ARCHITECTURE

### COMPONENT HIERARCHY

```
pages/
├── index.js              → Redirect to /login
├── login.js              → Authentication form
└── dashboard.js          → Protected route, main UI

components/
├── DashboardGrid.js      → 3×3 card layout container
├── AccountCard.js        → Individual account display
├── SpendProgressBar.js   → Visual spend indicator
├── TrendIndicator.js     → CPC/spend trend arrows
├── VendorFilter.js       → Filter accounts by vendor
└── AccountSearch.js      → Search by account ID

lib/
├── supabase.js           → Database client initialization
├── websocket.js          → Real-time update subscriptions
├── permissions.js        → RBAC enforcement
└── formatters.js         → Currency, percentage utilities
```

### ACCOUNT CARD SPECIFICATION

**DIMENSIONS:** 380px × 280px (desktop), 100% × 240px (mobile)

**LAYOUT:**
```
┌─────────────────────────────────────────────────┐
│ act_1234567890 [COPY] │ Vendor: Agency Alpha   │ ← Header
├─────────────────────────────────────────────────┤
│ Daily Spend: $247.80 / $250.00 (99.1%)         │ ← Primary metric
│ [████████████████████████░] ON TARGET ✓        │ ← Progress bar
│                                                 │
│ Cap History: $200→$250 (+25% week) ↑           │ ← Trend (NEW)
│                                                 │
│ Active Ads: 12 / 18 Total                      │ ← Secondary metrics
│ Avg CPC: $0.34 (↓12%) ✓                       │
│ Outbound Clicks: 4,287                         │
│ Balance: $1,847.50                             │
│                                                 │
│ Status: ● ACTIVE │ Updated: 2 min ago          │ ← Footer
└─────────────────────────────────────────────────┘

SUSPENDED STATE (Red background #DC2626):
┌─────────────────────────────────────────────────┐
│ 🚨 act_9876543210 [COPY]                       │
│ SUSPENDED - Nov 17, 3:42 PM                    │
│ Vendor: Agency Beta                            │
│                                                 │
│ Final Spend: $189.50 / $250.00 (75.8%)         │
│ Lifetime Clicks: 2,156                         │
│                                                 │
│ [Share with Vendor] ← Pre-formatted message    │
└─────────────────────────────────────────────────┘
```

**CLICK-TO-COPY BEHAVIOR:**
```javascript
// Single click on account ID
navigator.clipboard.writeText('act_1234567890')
showToast('Account ID copied', { duration: 2000 })
```

**SHARE WITH VENDOR BUTTON:**
```javascript
const message = `
Account suspended: ${accountId}
Vendor: ${vendorName}
Suspended: ${suspensionTime}
Final spend: $${finalSpend} of $${dailyCap} daily cap
Replacement needed
`.trim()

navigator.clipboard.writeText(message)
showToast('Suspension report copied - paste to vendor', { duration: 3000 })
```

---

## AUTHENTICATION & AUTHORIZATION

### USER ROLES

**ADMIN (Owner):**
- Full dashboard access
- Add/remove ad accounts
- Archive suspended accounts
- Export historical data to CSV
- Access admin panel (/admin)
- Modify user permissions

**VIEWER (Partner):**
- Read-only dashboard access
- View all metrics and trends
- Copy account IDs
- Share suspension reports
- NO account management
- NO data export

### IMPLEMENTATION

**Supabase Auth Configuration:**
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Middleware: pages/_middleware.js
export async function middleware(req) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return NextResponse.next()
}
```

**Role Enforcement:**
```javascript
// lib/permissions.js
export function requireAdmin(user) {
  if (user.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
}

export function hasPermission(user, action) {
  const role = user.user_metadata?.role
  
  const permissions = {
    admin: ['view', 'add', 'remove', 'export', 'archive'],
    viewer: ['view']
  }
  
  return permissions[role]?.includes(action) ?? false
}
```

---

## DEPLOYMENT PROTOCOL

### PHASE 1: SIMULATION ENVIRONMENT (Days 1-7)

**OBJECTIVE:** Validate all system components with synthetic data before Facebook API integration.

**SETUP SEQUENCE:**

```bash
# Day 1: Infrastructure
1. Create GitHub repository: fb-ads-dashboard
2. Initialize Next.js: npx create-next-app@latest
3. Create Supabase project: "ArbHub Monitoring"
4. Execute simulation schema in Supabase SQL Editor
5. Deploy to Vercel, configure environment variables
6. Update Hostinger DNS to point to Vercel

# Days 2-3: UI Development
1. Build AccountCard component with dynamic cap display
2. Implement 3×3 grid layout (responsive)
3. Add authentication flow (Supabase Auth)
4. Create admin vs viewer role enforcement

# Days 4-5: Simulation Data Generator
1. Implement /api/simulate-fb-data.js cron job
2. Generate 30 mock accounts with varied cap growth rates
3. Test cap progression: fast/normal/slow/declining
4. Validate suspension detection and alerts

# Days 6-7: Validation & Partner UAT
1. Load testing with 100 mock accounts
2. Edge case testing (mass suspensions, cap decreases)
3. Partner user acceptance testing
4. Bug fixing and refinement
```

**SUCCESS GATE:** All simulation tests passed, partner approval, zero critical bugs.

---

### PHASE 2: PRODUCTION MIGRATION (Days 8-12)

**PREREQUISITE:** YOUR Business Manager created, System User token generated.

**CUTOVER SEQUENCE:**

```bash
# Day 8: Parallel Infrastructure
1. Create production tables (ad_accounts, account_metrics)
2. Keep simulation tables active for comparison
3. Implement /api/fetch-fb-data-production.js
4. Configure cron for production endpoint
5. Link 5 test accounts from first vendor BM

# Day 9: Test Account Validation
1. Execute API calls against 5 real accounts
2. Verify daily_spend_limit field present and accurate
3. Compare dashboard data vs Facebook Ads Manager UI
4. Monitor for 24 hours, log ALL cap changes

# Day 10: Gradual Rollout
1. Add 10 more accounts (total: 15 real)
2. Validate batch request performance
3. Add 15 more accounts (total: 30 real)
4. Confirm 5-minute refresh maintained

# Day 11: Full Production Cutover
1. Disable simulation cron job
2. Add remaining accounts (scale to 50-100)
3. Update vercel.json to only run production cron
4. Deploy to production
5. Monitor first 4 hours intensively

# Day 12: Simulation Cleanup
1. Export simulation data for regression testing
2. Archive simulation tables (_archive prefix)
3. Document production performance baseline
```

**ABORT CRITERIA:**
- Facebook API returns null daily_spend_limit on >10% of accounts
- Data discrepancy >5% vs Ads Manager
- Cron job execution time >45 seconds
- Dashboard load time >3 seconds

---

## MONITORING & ALERTING

### UPTIME MONITORING

**Service:** UptimeRobot (free tier)

**Configuration:**
```
Monitor Name: ArbHub Health Check
URL: https://arbhub.io/api/health
Interval: 5 minutes
Alert Method: Email + SMS (for >10 min downtime)

Health Check Endpoint Response:
{
  "status": "ok",
  "last_fb_sync": "2025-11-17T15:42:00Z",
  "accounts_monitored": 87,
  "success_rate": 0.989
}
```

### SLACK NOTIFICATIONS

**Critical Alerts (Immediate):**
- Account suspension detected (account_status = 100)
- Spend cap decreased >20% (imminent suspension signal)
- Cron job failure (3 consecutive failures)
- Facebook API token expiration warning (<7 days)

**Performance Alerts (Daily Digest):**
- Accounts with <70% spend progress (vendor compliance)
- API response time degradation (>3 seconds average)
- Database query performance issues (>200ms)

**Implementation:**
```javascript
// lib/alerts.js
export async function notifySlack(message, severity = 'info') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  const colors = {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#10B981'
  }
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color: colors[severity],
        text: message,
        footer: 'ArbHub Monitoring System',
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  })
}
```

---

## SECURITY CONSIDERATIONS

### CREDENTIAL MANAGEMENT

**MANDATORY PRACTICES:**
1. Facebook access token stored in Vercel environment variables (encrypted)
2. Supabase credentials in environment variables (never in code)
3. Database passwords generated via password manager (24+ characters)
4. JWT secrets rotated every 90 days
5. User passwords enforced: 12+ characters, bcrypt hashing

### API SECURITY

**Rate Limit Protection:**
```javascript
// Prevent accidental API quota exhaustion
const MAX_REQUESTS_PER_MINUTE = 100

if (requestCount > MAX_REQUESTS_PER_MINUTE) {
  await logCritical('Rate limit threshold exceeded - review cron logic')
  throw new Error('Rate limit protection triggered')
}
```

**Data Validation:**
```javascript
// Sanitize all Facebook API responses
function validateAccountData(data) {
  const required = ['id', 'account_status', 'daily_spend_limit']
  
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  
  // Prevent SQL injection via malformed account IDs
  if (!/^act_\d{10,20}$/.test(data.id)) {
    throw new Error(`Invalid account ID format: ${data.id}`)
  }
  
  return data
}
```

---

## COST ANALYSIS

### MONTHLY OPERATING COSTS

**Tier 1: 0-30 Accounts (Free)**
```
Vercel Hobby:     $0 (100GB bandwidth, 100 cron executions/day)
Supabase Free:    $0 (500MB database, 2GB bandwidth)
Domain:           $1 (amortized $12/year)
UptimeRobot:      $0 (50 monitors free)
────────────────────
TOTAL:            $1/month
```

**Tier 2: 30-100 Accounts (Scale)**
```
Vercel Pro:       $20/month (unlimited bandwidth, faster builds)
Supabase Free:    $0 (within free tier limits)
Domain:           $1
────────────────────
TOTAL:            $21/month
```

**Tier 3: 100-500 Accounts (Enterprise)**
```
Vercel Pro:       $20/month
Supabase Pro:     $25/month (8GB database, dedicated resources)
Domain:           $1
────────────────────
TOTAL:            $46/month
```

### ROI CALCULATION

```
Manual Monitoring Time Saved: 2 hours/day
Hourly Value: $50/hour
Monthly Value: 2 × 30 × $50 = $3,000

Dashboard Cost: $21/month (100 accounts)
ROI: ($3,000 - $21) / $21 = 14,200%

Payback Period: 0.5 days
```

---

## MAINTENANCE PROCEDURES

### WEEKLY TASKS (Automated)

```
✓ Database backup verification (Supabase automatic)
✓ Cron job success rate monitoring (Vercel dashboard)
✓ SSL certificate status (Vercel auto-renewal)
```

### MONTHLY TASKS (Manual - 10 minutes)

```
□ Review Facebook API token expiration (refresh if <30 days)
□ Validate data accuracy sampling (5 random accounts vs Ads Manager)
□ Review Slack alert patterns (identify recurring issues)
□ Update vendor contact list if changes
```

### QUARTERLY TASKS (Manual - 1 hour)

```
□ Security audit (rotate JWT secrets, review access logs)
□ Performance optimization (database index analysis)
□ Dependency updates (Next.js, React, Supabase SDK)
□ User feedback collection (partner satisfaction survey)
```

---

## TROUBLESHOOTING GUIDE

### ISSUE: Account Data Not Updating

**DIAGNOSIS:**
```bash
# Check Vercel cron logs
vercel logs --prod | grep "fetch-fb-data"

# Check Supabase recent queries
SELECT MAX(snapshot_time) FROM account_metrics;
```

**RESOLUTION:**
1. Verify cron job executing (Vercel dashboard → Cron)
2. Check Facebook API token validity (test with curl)
3. Review error logs for specific account failures
4. Confirm database write permissions

---

### ISSUE: Suspended Accounts Not Turning Red

**DIAGNOSIS:**
```sql
-- Verify suspension detected in database
SELECT account_id, account_status, snapshot_time 
FROM account_metrics 
WHERE account_status = 100 
ORDER BY snapshot_time DESC 
LIMIT 10;
```

**RESOLUTION:**
1. Confirm account_status = 100 in database
2. Check frontend WebSocket connection active
3. Verify AccountCard component rendering logic
4. Clear browser cache, hard refresh

---

### ISSUE: High API Response Times (>5 seconds)

**DIAGNOSIS:**
```javascript
// Add timing logs to cron job
const startTime = Date.now()
const response = await fetchAccountData()
const duration = Date.now() - startTime
console.log(`API call duration: ${duration}ms`)
```

**RESOLUTION:**
1. Review batch size (reduce from 50 to 25 if needed)
2. Check Facebook API status page (status.developers.facebook.com)
3. Verify no rate limiting (check response headers)
4. Consider geographic API endpoint optimization

---

## FUTURE ENHANCEMENTS (Backlog)

**PHASE 3 FEATURES (After 30 Days Production Validation):**

1. **Historical Analytics**
   - 30-day spend trend graphs (Chart.js)
   - CPC optimization recommendations
   - Vendor performance comparison dashboard

2. **Predictive Alerts**
   - ML model predicting suspension 24-48 hours in advance
   - Training data: historical account_metrics patterns

3. **Automated Vendor Notifications**
   - Direct Telegram/WhatsApp bot integration
   - Auto-send suspension reports without manual copy/paste

4. **Multi-User Support**
   - Add 3rd role: "Analyst" (view + export, no management)
   - User invitation system via email

5. **Mobile App**
   - React Native companion app
   - Push notifications for suspensions
   - Offline mode with last-known data cache

---

## CONTACT & SUPPORT

**Project Owner:** [Your Name]  
**Partner Stakeholder:** [Partner Name]  
**Development Timeline:** Days 1-12 (Simulation → Production)  
**Production Go-Live:** Day 11 (Monday 8:00 AM recommended)

**Critical Issues:** Escalate immediately if:
- Dashboard down >10 minutes
- Facebook API token expired (all data stops)
- Database corruption detected
- Mass account suspensions (>10 accounts simultaneously)

**Documentation Updates:** Maintain this file as single source of truth. All architectural changes require documentation update within 24 hours.

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-17  
**Next Review:** Post-production Day 30
