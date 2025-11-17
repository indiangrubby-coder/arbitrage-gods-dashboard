# TDD Agent Instructions: ArbHub Dashboard Development

**Target AI Assistants:** GitHub Copilot, Claude Code, Cursor AI  
**Development Methodology:** Test-Driven Development (TDD) with Explicit Validation Gates  
**Architecture Pattern:** Incremental Feature Development with Continuous Integration  

---

## CRITICAL CONSTRAINTS

**NON-NEGOTIABLE RULES - ENFORCE ALWAYS:**

1. **NEVER write production code before writing tests**
2. **NEVER merge code without passing ALL tests**
3. **NEVER use localStorage/sessionStorage in React components** (blocked in Vercel iframe)
4. **NEVER hardcode API credentials** (environment variables ONLY)
5. **NEVER create separate CSS/JS files** (single-file components ONLY)
6. **ALWAYS validate Facebook API responses** (null checks mandatory)
7. **ALWAYS use dollar amounts for display** (convert from cents)
8. **ALWAYS implement error boundaries** (prevent cascade failures)

---

## TDD WORKFLOW SPECIFICATION

### MANDATORY DEVELOPMENT CYCLE

```
FOR EACH FEATURE:
  1. WRITE TEST FIRST (Red phase)
     - Define expected behavior explicitly
     - Cover happy path + edge cases
     - Include error scenarios
  
  2. RUN TEST (Confirm failure)
     - Test MUST fail initially
     - Validates test logic is correct
  
  3. WRITE MINIMAL CODE (Green phase)
     - Implement ONLY what makes test pass
     - No premature optimization
     - No extra features
  
  4. RUN TEST (Confirm success)
     - All tests must pass
     - No skipped tests allowed
  
  5. REFACTOR (Blue phase)
     - Improve code quality
     - Extract reusable functions
     - Re-run tests after each refactor
  
  6. COMMIT (Document change)
     - Commit message format: "feat: [test name] - [1 sentence summary]"
     - Push to GitHub immediately
```

---

## PROJECT STRUCTURE

```
fb-ads-dashboard/
├── pages/
│   ├── index.js                 # Redirect to /login
│   ├── login.js                 # Authentication page
│   └── dashboard.js             # Main UI (protected route)
├── components/
│   ├── AccountCard.js           # Individual account display
│   ├── AccountCard.test.js      # Jest tests for AccountCard
│   ├── DashboardGrid.js         # 3×3 card layout
│   ├── DashboardGrid.test.js
│   ├── SpendProgressBar.js      # Visual spend indicator
│   └── SpendProgressBar.test.js
├── api/
│   ├── simulate-fb-data.js      # Simulation cron (Phase 1)
│   ├── fetch-fb-data-production.js  # Production cron (Phase 2)
│   ├── health.js                # Uptime monitoring endpoint
│   └── __tests__/
│       ├── simulate-fb-data.test.js
│       └── fetch-fb-data-production.test.js
├── lib/
│   ├── supabase.js              # Database client
│   ├── permissions.js           # RBAC logic
│   ├── formatters.js            # Currency/percentage utils
│   └── __tests__/
│       ├── permissions.test.js
│       └── formatters.test.js
├── __tests__/
│   ├── integration/             # End-to-end tests
│   │   ├── dashboard-load.test.js
│   │   └── suspension-detection.test.js
│   └── setup.js                 # Jest configuration
├── package.json
├── jest.config.js
├── vercel.json                  # Cron configuration
└── .env.local                   # Environment variables (git-ignored)
```

---

## TESTING FRAMEWORK SETUP

### DEPENDENCIES

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### JEST CONFIGURATION

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
  collectCoverageFrom: [
    'components/**/*.js',
    'pages/**/*.js',
    'api/**/*.js',
    'lib/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

---

## FEATURE DEVELOPMENT EXAMPLES

### EXAMPLE 1: Spend Progress Bar Component

**STEP 1: WRITE TEST FIRST**

```javascript
// components/SpendProgressBar.test.js
import { render, screen } from '@testing-library/react'
import SpendProgressBar from './SpendProgressBar'

describe('SpendProgressBar', () => {
  test('displays spend percentage correctly', () => {
    render(
      <SpendProgressBar 
        spent={75.50} 
        cap={100.00} 
      />
    )
    
    expect(screen.getByText('75.5%')).toBeInTheDocument()
  })
  
  test('shows green color when spend 70-110% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={85} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar')
    expect(bar).toHaveClass('bg-green-500')
  })
  
  test('shows amber color when spend <70% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={60} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar')
    expect(bar).toHaveClass('bg-amber-500')
  })
  
  test('shows red color when spend >110% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={115} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar')
    expect(bar).toHaveClass('bg-red-500')
  })
  
  test('handles cap of $0 gracefully', () => {
    render(<SpendProgressBar spent={50} cap={0} />)
    expect(screen.getByText('Cap unavailable')).toBeInTheDocument()
  })
  
  test('handles null values gracefully', () => {
    render(<SpendProgressBar spent={null} cap={null} />)
    expect(screen.getByText('Data loading...')).toBeInTheDocument()
  })
})
```

**STEP 2: RUN TEST (Confirm Failure)**

```bash
npm test -- SpendProgressBar.test.js
# EXPECTED: All tests fail (component doesn't exist yet)
```

**STEP 3: WRITE MINIMAL CODE**

```javascript
// components/SpendProgressBar.js
export default function SpendProgressBar({ spent, cap }) {
  // Validation
  if (spent === null || cap === null) {
    return <div>Data loading...</div>
  }
  
  if (cap === 0) {
    return <div>Cap unavailable</div>
  }
  
  // Calculate percentage
  const percentage = (spent / cap) * 100
  const displayPercentage = percentage.toFixed(1)
  
  // Determine color
  let colorClass = 'bg-green-500'
  if (percentage < 70) colorClass = 'bg-amber-500'
  if (percentage > 110) colorClass = 'bg-red-500'
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{displayPercentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full progress-bar ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
```

**STEP 4: RUN TEST (Confirm Success)**

```bash
npm test -- SpendProgressBar.test.js
# EXPECTED: All tests pass
```

**STEP 5: REFACTOR (If Needed)**

```javascript
// Extract color logic to separate function
function getProgressColor(percentage) {
  if (percentage < 70) return 'bg-amber-500'
  if (percentage > 110) return 'bg-red-500'
  return 'bg-green-500'
}

// Re-run tests after refactor
```

**STEP 6: COMMIT**

```bash
git add components/SpendProgressBar.js components/SpendProgressBar.test.js
git commit -m "feat: SpendProgressBar - color-coded spend progress indicator with edge case handling"
git push origin main
```

---

### EXAMPLE 2: Facebook API Data Fetcher (Cron Job)

**STEP 1: WRITE TEST FIRST**

```javascript
// api/__tests__/fetch-fb-data-production.test.js
import { fetchAccountData, parseAccountMetrics } from '../fetch-fb-data-production'

describe('Facebook API Integration', () => {
  test('batch request includes required fields', async () => {
    const accountIds = ['act_123', 'act_456']
    const batchRequest = buildBatchRequest(accountIds)
    
    expect(batchRequest).toHaveLength(4) // 2 accounts × 2 request types
    expect(batchRequest[0].relative_url).toContain('daily_spend_limit')
    expect(batchRequest[0].relative_url).toContain('account_status')
  })
  
  test('parseAccountMetrics converts cents to dollars', () => {
    const apiResponse = {
      daily_spend_limit: 25000, // $250.00 in cents
      amount_spent: 18750        // $187.50 in cents
    }
    
    const parsed = parseAccountMetrics(apiResponse)
    
    expect(parsed.daily_limit_display).toBe(250.00)
    expect(parsed.spend_today).toBe(187.50)
    expect(parsed.spend_progress_percent).toBe('75.00')
  })
  
  test('handles missing daily_spend_limit gracefully', () => {
    const apiResponse = {
      id: 'act_123',
      daily_spend_limit: null,
      amount_spent: 5000
    }
    
    const parsed = parseAccountMetrics(apiResponse)
    
    expect(parsed.cap_source).toBe('UNAVAILABLE')
    expect(parsed.spend_progress_percent).toBeNull()
  })
  
  test('detects suspended accounts', () => {
    const apiResponse = {
      id: 'act_123',
      account_status: 100 // Suspended
    }
    
    const parsed = parseAccountMetrics(apiResponse)
    
    expect(parsed.is_suspended).toBe(true)
  })
  
  test('calculates spend progress correctly', () => {
    const metrics = parseAccountMetrics({
      daily_spend_limit: 25000,
      amount_spent: 20000
    })
    
    expect(metrics.spend_progress_percent).toBe('80.00')
  })
})
```

**STEP 2: IMPLEMENT WITH TDD CYCLE**

```javascript
// api/fetch-fb-data-production.js

export function parseAccountMetrics(apiData) {
  // Validation
  if (!apiData.id) {
    throw new Error('Account ID missing from API response')
  }
  
  // Handle missing cap
  if (apiData.daily_spend_limit === null) {
    return {
      account_id: apiData.id,
      cap_source: 'UNAVAILABLE',
      spend_progress_percent: null,
      is_suspended: apiData.account_status === 100
    }
  }
  
  // Convert cents to dollars
  const dailyLimitDollars = apiData.daily_spend_limit / 100
  const spentDollars = apiData.amount_spent / 100
  
  // Calculate progress
  const progressPercent = (spentDollars / dailyLimitDollars * 100).toFixed(2)
  
  return {
    account_id: apiData.id,
    daily_limit_display: dailyLimitDollars,
    spend_today: spentDollars,
    spend_progress_percent: progressPercent,
    is_suspended: apiData.account_status === 100,
    cap_source: 'API'
  }
}

export async function fetchAccountData(accountIds) {
  const batchRequests = accountIds.flatMap(id => [
    {
      method: 'GET',
      relative_url: `${id}?fields=id,account_status,daily_spend_limit,amount_spent`
    },
    {
      method: 'GET',
      relative_url: `${id}/insights?date_preset=today&fields=cpc,outbound_clicks`
    }
  ])
  
  const response = await fetch('https://graph.facebook.com/v21.0/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: process.env.FB_ACCESS_TOKEN,
      batch: JSON.stringify(batchRequests)
    })
  })
  
  return await response.json()
}
```

**STEP 3: INTEGRATION TEST**

```javascript
// __tests__/integration/dashboard-data-flow.test.js
describe('Full Data Pipeline', () => {
  test('dashboard displays data from API call', async () => {
    // 1. Mock Facebook API response
    mockFacebookAPI({
      account_id: 'act_123',
      daily_spend_limit: 25000,
      amount_spent: 18750,
      account_status: 1
    })
    
    // 2. Trigger cron job
    await runCronJob()
    
    // 3. Query database
    const metrics = await supabase
      .from('account_metrics')
      .select('*')
      .eq('account_id', 'act_123')
      .single()
    
    // 4. Verify data stored correctly
    expect(metrics.spend_today).toBe(187.50)
    expect(metrics.daily_limit_display).toBe(250.00)
    
    // 5. Render dashboard
    render(<Dashboard />)
    
    // 6. Verify UI displays correct data
    expect(screen.getByText('$187.50 / $250.00')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })
})
```

---

## VALIDATION GATES (MANDATORY CHECKPOINTS)

### GATE 1: COMPONENT TESTS (Per Feature)

```bash
# Run before committing any component
npm test -- ComponentName.test.js

# REQUIREMENTS:
✓ All tests pass
✓ Code coverage ≥80% for the component
✓ No console errors or warnings
✓ Edge cases tested (null, zero, empty values)
```

### GATE 2: INTEGRATION TESTS (End of Day)

```bash
# Run before end of coding session
npm test -- integration/

# REQUIREMENTS:
✓ Dashboard loads without errors
✓ API → Database → UI data flow validated
✓ Authentication flow works
✓ Role-based permissions enforced
```

### GATE 3: E2E TESTS (Before Production Deploy)

```bash
# Run before vercel deploy --prod
npm test -- e2e/

# REQUIREMENTS:
✓ User can login
✓ Dashboard displays all accounts
✓ Account ID copy function works
✓ Suspended accounts display red
✓ Mobile responsive layout functions
```

### GATE 4: LOAD TESTS (Scale Validation)

```bash
# Test with 100 accounts before production cutover
npm run test:load

# REQUIREMENTS:
✓ Dashboard loads <3 seconds with 100 cards
✓ Cron job completes <60 seconds
✓ Database queries <100ms average
✓ No memory leaks after 1 hour runtime
```

---

## ERROR HANDLING PATTERNS

### PATTERN 1: API Call Failures

```javascript
// MANDATORY STRUCTURE for all API calls

async function callFacebookAPI() {
  const maxRetries = 3
  const retryDelays = [1000, 3000, 9000] // Exponential backoff
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, options)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      
      if (isLastAttempt) {
        await logError('Facebook API call failed after 3 attempts', error)
        throw error
      }
      
      await sleep(retryDelays[attempt])
    }
  }
}
```

**TEST REQUIREMENT:**
```javascript
test('retries API call 3 times before failing', async () => {
  mockAPIFailure() // Force failures
  
  await expect(callFacebookAPI()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledTimes(3)
})
```

### PATTERN 2: Database Write Failures

```javascript
// MANDATORY for all Supabase inserts

async function saveMetrics(metrics) {
  try {
    const { data, error } = await supabase
      .from('account_metrics')
      .insert(metrics)
    
    if (error) {
      // Log but continue - don't crash entire cron job
      await logError('Database write failed', { error, metrics })
      
      // Queue for retry (optional enhancement)
      await queueForRetry(metrics)
      
      return { success: false, error }
    }
    
    return { success: true, data }
    
  } catch (exception) {
    // Catastrophic failure - alert immediately
    await notifySlack('CRITICAL: Database connection lost', 'critical')
    throw exception
  }
}
```

### PATTERN 3: Component Rendering Errors

```javascript
// MANDATORY Error Boundary wrapper

// components/ErrorBoundary.js
import React from 'react'

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo)
    // Optional: Send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Dashboard
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}

// Usage in pages/dashboard.js
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardGrid />
    </ErrorBoundary>
  )
}
```

---

## SIMULATION-SPECIFIC TEST CASES

### SIMULATION CRON JOB TESTS

```javascript
// api/__tests__/simulate-fb-data.test.js

describe('Simulation Data Generator', () => {
  test('generates realistic spend progression throughout day', () => {
    const morningSpend = generateSpend(mockAccount, '08:00:00')
    const noonSpend = generateSpend(mockAccount, '12:00:00')
    const eveningSpend = generateSpend(mockAccount, '20:00:00')
    
    expect(morningSpend).toBeLessThan(noonSpend)
    expect(noonSpend).toBeLessThan(eveningSpend)
  })
  
  test('cap growth rates produce expected increases', () => {
    const account = { cap_growth_rate: 'fast', initial_cap_cents: 5000 }
    
    const day1Cap = generateDynamicSpendCap(account, 1)
    const day7Cap = generateDynamicSpendCap(account, 7)
    
    expect(day7Cap).toBeGreaterThan(day1Cap * 2) // At least 2x growth in 7 days
  })
  
  test('declining cap triggers suspension eventually', () => {
    const account = { 
      cap_growth_rate: 'declining',
      suspension_probability: 0.25
    }
    
    let suspended = false
    for (let cycle = 0; cycle < 20; cycle++) {
      const status = simulateAccountStatus(account)
      if (status === 100) {
        suspended = true
        break
      }
    }
    
    expect(suspended).toBe(true) // Should suspend within 20 cycles
  })
})
```

---

## PRODUCTION CUTOVER VALIDATION

### PRE-CUTOVER CHECKLIST (Run Day 10)

```bash
# 1. Verify all tests pass
npm test -- --coverage
# REQUIREMENT: 80%+ coverage

# 2. Verify simulation data looks realistic
npm run validate:simulation
# Check: Spend progression, cap changes, suspension rate

# 3. Test production API with 5 real accounts
npm run test:production-api
# Check: All required fields present, data matches Ads Manager

# 4. Performance benchmarks
npm run test:performance
# Check: Load time <2s, cron job <30s, database queries <100ms

# 5. Security audit
npm run audit:security
# Check: No exposed credentials, dependencies up-to-date
```

### POST-CUTOVER VALIDATION (Day 11 - First 4 Hours)

```bash
# Monitor cron job execution
vercel logs --prod --follow | grep "fetch-fb-data-production"

# Verify data accuracy (sample 5 random accounts)
npm run validate:accuracy
# Compare dashboard vs Facebook Ads Manager UI

# Monitor error rates
npm run monitor:errors
# ABORT if error rate >5%
```

---

## DEBUGGING COMMANDS

### COMPONENT DEBUGGING

```bash
# Run single test in watch mode
npm test -- ComponentName.test.js --watch

# Run with verbose output
npm test -- ComponentName.test.js --verbose

# Debug in Chrome DevTools
node --inspect-brk node_modules/.bin/jest ComponentName.test.js
# Open chrome://inspect
```

### API DEBUGGING

```bash
# Test Facebook API call directly
curl -X GET \
  "https://graph.facebook.com/v21.0/act_XXXXXX?fields=daily_spend_limit,account_status&access_token=YOUR_TOKEN"

# Check cron job logs
vercel logs --prod | grep "ERROR"

# Monitor database queries
# Open Supabase dashboard → SQL Editor → Run:
SELECT * FROM account_metrics 
WHERE snapshot_time >= NOW() - INTERVAL '5 minutes';
```

---

## COMMIT MESSAGE CONVENTIONS

**FORMAT:** `<type>: <test-name> - <description>`

**TYPES:**
- `feat:` New feature implementation
- `fix:` Bug fix
- `test:` Test additions or modifications
- `refactor:` Code refactoring (no behavior change)
- `docs:` Documentation updates
- `chore:` Dependency updates, configuration changes

**EXAMPLES:**
```bash
git commit -m "feat: SpendProgressBar handles null cap - prevents crash on missing Facebook data"
git commit -m "test: AccountCard suspension state - validates red background on status=100"
git commit -m "fix: Currency formatter precision - converts cents to dollars with 2 decimal places"
git commit -m "refactor: Extract cap color logic - improves readability in AccountCard component"
```

---

## CONTINUOUS INTEGRATION (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Check coverage threshold
      run: |
        if [ $(jq '.total.lines.pct < 80' coverage/coverage-summary.json) ]; then
          echo "Coverage below 80% threshold"
          exit 1
        fi
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

## FINAL TDD PRINCIPLES (ENFORCE ALWAYS)

**PRINCIPLE 1: RED → GREEN → REFACTOR**
Never skip the red phase. If a test passes immediately, the test is either wrong or redundant.

**PRINCIPLE 2: ONE FAILING TEST AT A TIME**
Focus on making ONE test pass before moving to the next. Prevents scope creep.

**PRINCIPLE 3: TEST BEHAVIOR, NOT IMPLEMENTATION**
Tests should validate WHAT the code does, not HOW it does it. Implementation can change.

**PRINCIPLE 4: FAST TESTS**
Unit tests should run in <1 second. Integration tests <5 seconds. Slow tests = ignored tests.

**PRINCIPLE 5: ISOLATED TESTS**
Each test should be independent. Order shouldn't matter. Use setup/teardown properly.

**PRINCIPLE 6: MEANINGFUL TEST NAMES**
Test names should read like documentation: `test('displays amber warning when spend below 70% of cap')`

**PRINCIPLE 7: FAIL FAST**
If a test fails, STOP. Fix before proceeding. Never accumulate failing tests.

---

## EMERGENCY ROLLBACK PROCEDURE

**IF PRODUCTION DEPLOYMENT BREAKS:**

```bash
# 1. Immediately rollback in Vercel dashboard
# Deployments → Previous deployment → Promote to Production

# 2. Identify failing test
git log --oneline -10
# Find last known good commit

# 3. Revert to last passing commit
git revert HEAD
git push origin main

# 4. Re-run test suite
npm test

# 5. Document failure
# Create GitHub issue with:
# - Failing test output
# - Steps to reproduce
# - Expected vs actual behavior
```

---

**Document Version:** 1.0.0  
**Compatible With:** PROJECT.md v1.0.0  
**Target Assistants:** GitHub Copilot, Claude Code, Cursor AI  
**Last Updated:** 2025-11-17
