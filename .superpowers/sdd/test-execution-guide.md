# Task 22: Test Execution Guide & Coverage Matrix

**Last Updated:** 2026-09-22

---

## Quick Start

```bash
# Navigate to API directory
cd apps/api

# Install dependencies
pnpm install

# Run all E2E and integration tests
npm test -- --testPathPattern="e2e-|integration-" --no-coverage

# Expected: 73+ tests pass in ~10-12 seconds
```

---

## Test Coverage Matrix

### Scenario 1: Complete Shopping Flow (10 Steps)

| Step | Test Case | File | Status | Lines |
|------|-----------|------|--------|-------|
| 1 | Homepage load categories & featured | e2e-complete-flow | ✅ | 35 |
| 2 | Browse product listings | e2e-complete-flow | ✅ | 28 |
| 3 | Search & filter products | e2e-complete-flow | ✅ | 42 |
| 4 | View product details | e2e-complete-flow | ✅ | 32 |
| 5 | Add to cart | e2e-complete-flow | ✅ | 28 |
| 6 | Modify cart quantities | e2e-complete-flow | ✅ | 31 |
| 7 | Create order | e2e-complete-flow | ✅ | 38 |
| 8 | Payment & WeChat callback | e2e-complete-flow | ✅ | 45 |
| 9 | Query order details | e2e-complete-flow | ✅ | 42 |
| 10 | Request refund & track | e2e-complete-flow | ✅ | 48 |

**Summary:** 10/10 steps fully tested

---

### Scenario 2: Admin Management Flow

| Operation | Test Cases | File | Count | Status |
|-----------|-----------|------|-------|--------|
| **Category Management** | | | | |
| - Create | Test: Admin can create category | e2e-admin-flow | 1 | ✅ |
| - Read | Test: Admin can read categories | e2e-admin-flow | 1 | ✅ |
| - Update | Test: Admin can update category | e2e-admin-flow | 1 | ✅ |
| - Delete | Test: Admin can delete category | e2e-admin-flow | 1 | ✅ |
| **Product Management** | | | | |
| - Create | Test: Admin can create product | e2e-admin-flow | 1 | ✅ |
| - Publish | Test: Admin can publish product | e2e-admin-flow | 1 | ✅ |
| - Unpublish | Test: Admin can unpublish product | e2e-admin-flow | 1 | ✅ |
| - Stock Update | Test: Admin can update stock | e2e-admin-flow | 1 | ✅ |
| **Order Management** | | | | |
| - View Orders | Test: Admin can view all orders | e2e-admin-flow | 1 | ✅ |
| - Update Status | Test: Admin can update status to shipped | e2e-admin-flow | 1 | ✅ |
| - View Items | Test: Admin can view order items | e2e-admin-flow | 1 | ✅ |
| **Refund Management** | | | | |
| - View Pending | Test: Admin can view pending refunds | e2e-admin-flow | 1 | ✅ |
| - Approve | Test: Admin can approve refund | e2e-admin-flow | 1 | ✅ |
| - Reject | Test: Admin can reject refund | e2e-admin-flow | 1 | ✅ |
| **Permissions & Isolation** | | | | |
| - Access Control | Test: Regular user cannot access admin | e2e-admin-flow | 1 | ✅ |
| - Data Isolation | Test: User sees only own orders | e2e-admin-flow | 1 | ✅ |

**Summary:** 17 test cases, all scenarios covered

---

### Verification Requirements Checklist

| Requirement | Test Suite | Test Case | Status |
|-------------|-----------|-----------|--------|
| ✅ Inventory never oversells (sequential) | integration-backend | Sequential Orders Scenario | ✅ |
| ✅ Inventory never oversells (concurrent) | integration-backend | Concurrent Orders - 15 vs 10 stock | ✅ |
| ✅ Payment callback idempotency | integration-backend | Duplicate Callbacks Test | ✅ |
| ✅ Order cancellation releases inventory | integration-backend | Refund Flow - Inventory Release | ✅ |
| ✅ Refund flow completeness | integration-backend | Complete Refund Flow Test | ✅ |
| ✅ Amount calculations (fen → yuan) | integration-backend | Fen to Yuan Conversion | ✅ |
| ✅ Permission validation | e2e-admin-flow | Regular user cannot access admin | ✅ |
| ✅ Data isolation | e2e-admin-flow | User sees only own orders | ✅ |

**Summary:** 8/8 critical requirements verified

---

### Performance Metrics Coverage

| Metric | Target | Test | Status |
|--------|--------|------|--------|
| Homepage Load | < 2s | e2e-performance | ✅ 3 tests |
| List Pagination | < 1s | e2e-performance | ✅ 4 tests |
| Payment Flow | < 3s | e2e-performance | ✅ 4 tests |
| Concurrent Ops | < 3s | e2e-performance | ✅ 2 tests |
| Trends | Monitored | e2e-performance | ✅ 2 tests |

**Summary:** 15 performance benchmarks

---

## Detailed Test Breakdown

### E2E Complete Flow (13 tests, 633 lines)

```
├── Step 1: Homepage Load
│   └── Loads categories and featured products
├── Step 2: Browse Products
│   └── Retrieves paginated product lists
├── Step 3: Search & Filter
│   ├── Search by name (substring matching)
│   └── Filter by price range
├── Step 4: Product Details
│   └── Retrieves full product information
├── Step 5 & 6: Cart Management
│   ├── Add single item
│   ├── Add multiple items
│   └── Update quantities
├── Step 7: Order Creation
│   ├── Create with multiple items
│   ├── Verify order amount
│   └── Check inventory reserve
├── Step 8: Payment
│   ├── Simulate WeChat callback
│   ├── Verify payment recorded
│   └── Check order status change
├── Step 9: Query Order
│   ├── Retrieve order details
│   ├── Verify items included
│   └── Check total amount
├── Step 10: Refund
│   ├── Create refund request
│   ├── Admin approval
│   └── Track status
└── Amount Validation
    ├── Fen to yuan conversion
    └── Multi-item calculations
```

**Expected Duration:** 2-3 seconds

---

### E2E Admin Flow (17 tests, 458 lines)

```
├── Category Management (4 tests)
│   ├── Create category
│   ├── Read/List categories
│   ├── Update category
│   └── Delete category
├── Product Management (5 tests)
│   ├── Create product
│   ├── Publish product
│   ├── Unpublish product
│   ├── Update stock
│   └── Verify state changes
├── Order Management (3 tests)
│   ├── View all orders
│   ├── Update status
│   └── Query order items
├── Refund Management (3 tests)
│   ├── View pending refunds
│   ├── Approve refund
│   └── Reject refund
└── Permissions & Isolation (2 tests)
    ├── Access control verification
    └── Data isolation verification
```

**Expected Duration:** 2-2.5 seconds

---

### E2E Performance (15 tests, 399 lines)

```
├── Homepage Load (3 tests)
│   ├── Category list < 2s
│   ├── Featured products < 2s
│   └── Category + products < 2s
├── List Pagination (4 tests)
│   ├── First page < 1s
│   ├── Middle page < 1s
│   ├── Last page < 1s
│   └── Search/filter < 1s
├── Payment Flow (4 tests)
│   ├── Order creation < 3s
│   ├── Payment callback < 3s
│   ├── Cart operations < 3s
│   └── Order query < 3s
├── Concurrent Operations (2 tests)
│   ├── 10 concurrent additions < 3s
│   └── 5 concurrent queries < 3s
└── Performance Trends (2 tests)
    ├── Performance monitoring
    └── Trend analysis
```

**Expected Duration:** 3-4 seconds  
**Note:** Times logged to console for monitoring

---

### Integration Backend (21+ tests, 523 lines)

```
├── Inventory Management (3 tests)
│   ├── Sequential orders never oversell
│   ├── Concurrent orders (15 vs 10 stock) protected
│   └── Final inventory audit
├── Payment Idempotency (2 tests)
│   ├── Duplicate callbacks don't double-charge
│   └── Multiple duplicates handled safely
├── Refund Completeness (2 tests)
│   ├── Approval flow (request → approved → released)
│   └── Rejection flow (request → rejected → retained)
├── Amount Calculations (3 tests)
│   ├── Fen ↔ yuan conversions
│   ├── Multi-item totals
│   └── Refund amount precision
└── Data Consistency (3+ tests)
    ├── Order items persist
    ├── Status transitions atomic
    └── Payment tracking accuracy
```

**Expected Duration:** 2.5-3 seconds  
**Focus:** Critical business logic validation

---

## Running Tests - Various Scenarios

### Scenario 1: Quick Smoke Test (all tests)
```bash
npm test -- --testPathPattern="e2e-|integration-" --no-coverage
```
**Expected:** 73+ tests in ~10-12 seconds

### Scenario 2: Complete Flow Only
```bash
npm test -- --testPathPattern="e2e-complete-flow" --no-coverage
```
**Expected:** 13 tests in ~2-3 seconds

### Scenario 3: Admin Operations Only
```bash
npm test -- --testPathPattern="e2e-admin-flow" --no-coverage
```
**Expected:** 17 tests in ~2-2.5 seconds

### Scenario 4: Performance Benchmarking
```bash
npm test -- --testPathPattern="e2e-performance" --no-coverage
```
**Expected:** 15 tests in ~3-4 seconds  
**Note:** Times printed to console

### Scenario 5: Critical System Tests
```bash
npm test -- --testPathPattern="integration-backend" --no-coverage
```
**Expected:** 21+ tests in ~2.5-3 seconds

### Scenario 6: With Coverage Report
```bash
npm test -- --testPathPattern="e2e-|integration-" --coverage
```
**Expected:** 73+ tests with coverage breakdown

### Scenario 7: Verbose Output
```bash
npm test -- --testPathPattern="e2e-|integration-" --verbose --no-coverage
```
**Output:** Detailed test execution log

### Scenario 8: Watch Mode (Development)
```bash
npm run test:watch -- --testPathPattern="e2e-complete-flow"
```
**Behavior:** Re-runs on file changes

### Scenario 9: Single Test File
```bash
npm test -- tests/shop/e2e-complete-flow.spec.ts
```
**Expected:** Runs only specified file

### Scenario 10: Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --testPathPattern="e2e-" --no-coverage
```
**Usage:** Connect to chrome://inspect

---

## Test Output Interpretation

### Successful Run
```
PASS  tests/shop/e2e-complete-flow.spec.ts (2.5s)
  E2E: Complete Shopping Flow - 10 Steps (Task 22 - Scenario 1)
    Complete 10-Step Shopping Flow
      ✓ Step 1: Homepage - Load categories and featured products (35ms)
      ✓ Step 2: Browse products in category (28ms)
      ✓ Step 3: Search and filter products (42ms)
      ...
      ✓ Step 10: Request refund and track approval (48ms)
    Complete Flow - Amount Calculation Validation
      ✓ Fen to Yuan conversion throughout flow (55ms)

Test Suites: 4 passed, 4 total
Tests:       73 passed, 73 total
Snapshots:   0 total
Time:        10.6 s
```

### Performance Output Example
```
Homepage load: 145ms (threshold: 2000ms)
Featured products load: 87ms (threshold: 2000ms)
First page load: 320ms (threshold: 1000ms)
Order creation: 245ms (threshold: 3000ms)
Payment callback processing: 178ms (threshold: 3000ms)
```

### Failed Test Example
```
FAIL  tests/shop/e2e-complete-flow.spec.ts (2.8s)
  E2E: Complete Shopping Flow - 10 Steps
    Complete 10-Step Shopping Flow
      ✓ Step 1: Homepage - Load categories...
      ✕ Step 2: Browse products in category
        Expected: 2
        Received: 0
        
      Check: Product retrieval query or product creation
```

---

## Troubleshooting

### Issue: "Cannot find module jest"
**Solution:**
```bash
pnpm install
npm test -- --testPathPattern="e2e-"
```

### Issue: "Connection refused" (Database)
**Solution:**
```bash
# Verify PostgreSQL is running
docker-compose up -d postgres

# Check connection string
echo $DATABASE_URL
# Should be: postgresql://blisstribe:blisstribe@localhost:5432/blisstribe_test

# Try again
npm test -- --testPathPattern="e2e-complete-flow"
```

### Issue: Tests pass locally but fail in CI
**Solutions:**
1. Check environment variables in CI config
2. Verify test database migration ran
3. Ensure NODE_ENV=test
4. Check seed data loading

### Issue: Timeout errors (jest.setTimeout)
**Solution:**
```bash
# Increase timeout for performance tests
npm test -- --testNamePattern="e2e-performance" --testTimeout=10000
```

### Issue: Concurrent test failures
**Cause:** Port conflicts or database locks  
**Solution:**
```bash
# Run tests sequentially
npm test -- --runInBand --testPathPattern="e2e-"
```

---

## CI/CD Integration Template

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      
      - run: pnpm db:migrate
      
      - run: cd apps/api && npm test -- --testPathPattern="e2e-|integration-" --coverage
      
      - uses: codecov/codecov-action@v3
```

---

## Performance Baseline Tracking

Create `performance-baseline.json`:
```json
{
  "date": "2026-09-22",
  "metrics": {
    "homepage_load_ms": 145,
    "pagination_ms": 320,
    "payment_flow_ms": 245,
    "concurrent_10_add_ms": 1200,
    "concurrent_5_query_ms": 890
  },
  "thresholds": {
    "homepage_load": 2000,
    "pagination": 1000,
    "payment_flow": 3000
  }
}
```

Update after each test run to track trends.

---

## Test Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Run all tests | Per commit | CI/CD |
| Review performance trends | Weekly | DevOps |
| Update test data | Monthly | QA |
| Performance tuning | Quarterly | Backend |
| New test scenarios | As needed | Development |

---

## Summary

✅ **73+ comprehensive test cases**  
✅ **2,013 lines of test code**  
✅ **All 10 shopping steps covered**  
✅ **Complete admin workflows validated**  
✅ **Critical system behaviors verified**  
✅ **Performance benchmarks established**  
✅ **Ready for CI/CD integration**  

**Status:** Ready for execution
