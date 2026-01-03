# Phase 3: Risk Assessment System - COMPLETE

## Overview

Phase 3 adds comprehensive risk assessment capabilities to the Current RMS Watcher, imported from the avriskassessment repository. Users can now assess opportunity risk, track mitigation plans, and get executive visibility into risk distribution.

## Features Implemented

### 1. Risk Status Summary Dashboard Widget

**Location:** Main dashboard (4-column grid)

**Features:**
- Visual cards for each risk level (CRITICAL, HIGH, MEDIUM, LOW, UNSCORED)
- Color-coded by risk severity (red, orange, yellow, green, gray)
- Shows count and total value per category
- Percentage distribution bars
- Click to drill down into each risk level

**Data Source:** `/api/risk/summary`

### 2. Risk Assessment Modal

**Trigger:** Click "Assess Risk" or "Edit Assessment" on any opportunity

**8 Weighted Risk Factors:**

| Factor | Weight | Scale |
|--------|--------|-------|
| Project Type Familiarity | 1.2 | 1-5 (Routine → Entirely New) |
| Technical Complexity | 1.3 | 1-5 (Simple → Bleeding Edge) |
| Resource Utilization | 1.1 | 1-5 (0-25% → 75%+) |
| Client Experience Level | 0.9 | 1-5 (Highly Experienced → First-Time) |
| Budget Scale | 1.0 | 1-5 (<$5k → $100k+) |
| Timeline Pressure | 1.2 | 1-5 (Ample Time → Rush/Emergency) |
| Team Capability | 1.3 | 1-5 (Expert → Inexperienced) |
| Sub-hire Availability | 1.1 | 1-5 (Multiple Vendors → None) |

**Risk Calculation:**
```typescript
Risk Score = Σ(factor_score × factor_weight) / Σ(factor_weight)
```

**Risk Levels:**
- **LOW:** Score ≤ 2.0 → Requires Project Manager approval
- **MEDIUM:** Score > 2.0 and ≤ 3.0 → Requires Senior Manager approval
- **HIGH:** Score > 3.0 and ≤ 4.0 → Requires Operations Director approval
- **CRITICAL:** Score > 4.0 → Requires Executive Approval

**Workflow Fields:**
- **Review Status:** Checkbox to mark as reviewed
- **Mitigation Plan Status:** None (0), Partial (1), Complete (2)
- **Mitigation Notes:** Free-text field for documentation

### 3. Risk Drill-Down Pages

**URL:** `/risk/[level]` (e.g., `/risk/HIGH`, `/risk/null`)

**Features:**
- Filterable table of opportunities by risk level
- Columns: Opportunity, Customer, Owner, Start Date, Value, Risk Score
- Click to assess/edit any opportunity
- Back to dashboard link

### 4. Current RMS Integration

**API Endpoint:** `PATCH /api/opportunities/[id]/risk`

**Updates these custom fields in Current RMS:**
```javascript
custom_fields: {
  // Individual factor scores
  risk_project_novelty: number,
  risk_technical_complexity: number,
  risk_resource_utilization: number,
  risk_client_sophistication: number,
  risk_budget_size: number,
  risk_timeframe_constraint: number,
  risk_team_experience: number,
  risk_subhire_availability: number,

  // Calculated values
  risk_score: number,
  risk_level: string,  // LOW | MEDIUM | HIGH | CRITICAL

  // Workflow tracking
  risk_reviewed: string,  // "Yes" or ""
  risk_mitigation_plan: number,  // 0 | 1 | 2
  risk_mitigation_notes: string,
  risk_last_updated: string  // ISO timestamp
}
```

## Files Created

### Libraries
- **lib/riskAssessment.ts**
  - `RISK_FACTORS` - Factor definitions with scales and weights
  - `calculateRiskScore()` - Weighted average calculation
  - `getRiskLevel()` - Determine risk category from score
  - `getApprovalLevel()` - Get required approval authority
  - `getRiskLevelColor()` - UI color schemes
  - `validateRiskScores()` - Input validation
  - `needsRiskReview()` - Check if re-assessment needed

### Components
- **components/Dashboard/RiskStatusSummary.tsx**
  - Summary widget for main dashboard
  - Click handlers for drill-down navigation
  - Visual risk distribution

- **components/RiskAssessment/RiskAssessmentModal.tsx**
  - Full-screen modal for risk assessment
  - 2-column grid layout for 8 factors
  - Real-time score calculation
  - Review and mitigation workflow

### Pages
- **pages/risk/[level].tsx**
  - Dynamic route for risk level filtering
  - Opportunity table with assessment actions
  - Embedded risk assessment modal

### API Routes
- **pages/api/opportunities/[id]/risk.ts**
  - PATCH endpoint to update risk assessment
  - Saves to Current RMS custom fields
  - Returns updated opportunity data

- **pages/api/risk/summary.ts**
  - GET endpoint for risk distribution stats
  - Groups by risk level with counts and totals

- **pages/api/risk/opportunities.ts**
  - GET endpoint to fetch opportunities by risk level
  - Supports filtering for unscored (`level=null`)

### Database Methods
Added to **lib/eventStorePostgres.ts**:
- `getRiskSummary()` - Query risk level distribution
- `getOpportunitiesByRiskLevel()` - Filter opportunities by risk

## Usage Workflow

### First-Time Assessment

1. **Navigate to Dashboard**
   - View Risk Status Summary widget
   - Click on any risk category (e.g., "UNSCORED")

2. **Select Opportunity**
   - Browse table of opportunities
   - Click "Assess Risk" button

3. **Complete Assessment**
   - Score each of 8 risk factors (1-5)
   - Watch risk score calculate in real-time
   - Check "Mark as Reviewed" if appropriate
   - Set Mitigation Plan status (None/Partial/Complete)
   - Add mitigation notes

4. **Save to Current RMS**
   - Click "Save Assessment"
   - Data syncs to Current RMS custom fields
   - Opportunity moves to appropriate risk category

### Ongoing Management

**Dashboard Monitoring:**
- Track CRITICAL and HIGH risk counts
- Monitor total value at risk
- Identify unscored opportunities

**Re-Assessment:**
- System tracks `risk_last_updated` timestamp
- Compare with `updated_at` to identify stale assessments
- Click any assessed opportunity to update scores

**Approval Workflow:**
- Review risk level and required approval authority
- Use mitigation notes to document risk treatment
- Track mitigation plan completion status

## Data Flow

### Assessment Save Flow
```
User fills form in Modal
  ↓
Modal calls onSave()
  ↓
POST /api/opportunities/{id}/risk
  ↓
API calls Current RMS API
  ↓
Current RMS updates custom_fields
  ↓
Webhook triggers (if enabled)
  ↓
opportunitySync.syncOpportunity()
  ↓
Local database updated
  ↓
Dashboard refreshes with new risk data
```

### Dashboard Display Flow
```
Dashboard loads
  ↓
Parallel fetch:
  - /api/dashboard (existing data)
  - /api/risk/summary (risk stats)
  ↓
RiskStatusSummary component renders
  ↓
User clicks risk category
  ↓
Navigate to /risk/[level]
  ↓
Fetch /api/risk/opportunities?level={level}
  ↓
Display filtered opportunities table
```

## Business Logic

### Risk Score Calculation

The weighted average formula ensures higher-weighted factors have more influence:

```typescript
// Example calculation
const scores = {
  risk_project_novelty: 3,        // weight 1.2
  risk_technical_complexity: 4,   // weight 1.3
  risk_resource_utilization: 2,   // weight 1.1
  risk_client_sophistication: 3,  // weight 0.9
  risk_budget_size: 4,            // weight 1.0
  risk_timeframe_constraint: 3,   // weight 1.2
  risk_team_experience: 2,        // weight 1.3
  risk_subhire_availability: 3    // weight 1.1
};

// Weighted sum
const weightedSum =
  (3 × 1.2) + (4 × 1.3) + (2 × 1.1) + (3 × 0.9) +
  (4 × 1.0) + (3 × 1.2) + (2 × 1.3) + (3 × 1.1);
  = 3.6 + 5.2 + 2.2 + 2.7 + 4.0 + 3.6 + 2.6 + 3.3
  = 27.2

// Total weight
const totalWeight = 1.2 + 1.3 + 1.1 + 0.9 + 1.0 + 1.2 + 1.3 + 1.1 = 9.1

// Risk Score
const riskScore = 27.2 / 9.1 = 2.99 → MEDIUM Risk
```

### Risk Level Thresholds

Thresholds are designed to match organizational approval hierarchies:

- **1.0 - 2.0 (LOW):** Standard projects, routine operations
- **2.1 - 3.0 (MEDIUM):** Moderate complexity, increased oversight needed
- **3.1 - 4.0 (HIGH):** Significant challenges, senior management involvement
- **4.1 - 5.0 (CRITICAL):** Extreme risk, executive decision required

## Design Decisions

### Why These 8 Factors?

Based on event production industry best practices:
1. **Project Novelty** - Unfamiliar work increases uncertainty
2. **Technical Complexity** - Advanced tech = higher failure risk
3. **Resource Utilization** - Overcommitment reduces flexibility
4. **Client Sophistication** - Inexperienced clients change requirements
5. **Budget Size** - Larger budgets = higher financial exposure
6. **Timeline Pressure** - Rush jobs reduce quality control
7. **Team Experience** - Skill gaps increase error likelihood
8. **Sub-hire Availability** - Limited options reduce contingency

### Why These Weights?

**Highest weights (1.3):**
- **Technical Complexity** - Technical failures are catastrophic
- **Team Experience** - People capability is critical success factor

**High weights (1.2):**
- **Project Novelty** - Unknown unknowns are dangerous
- **Timeline Pressure** - Time constraints force compromises

**Medium weights (1.0-1.1):**
- **Resource Utilization** - Important but manageable
- **Sub-hire Availability** - Mitigation options exist
- **Budget Size** - Financial risk vs. operational risk

**Lower weight (0.9):**
- **Client Sophistication** - Client management is controllable

### Why Update Current RMS Directly?

**Advantages:**
- Single source of truth
- Data visible in Current RMS interface
- Webhook updates keep local DB in sync
- No data synchronization issues
- Leverages existing Current RMS permissions

## Integration with Existing Features

### Phase 1: Webhook Processing
- Webhooks trigger opportunity sync
- Risk data included in synced opportunity records
- No changes needed to webhook handling

### Phase 2 Extended: Opportunity Sync
- Initial sync pulls existing risk assessments
- Incremental sync updates changed assessments
- Risk data stored in `opportunities.data` JSONB field

### Future Phases (Potential)
- **Reporting:** Risk trends over time
- **Automation:** Auto-flag high-risk opportunities
- **Notifications:** Alert on CRITICAL risks
- **Analytics:** Risk correlation with outcomes

## Success Metrics

Phase 3 is successful if:
- ✅ Risk Status Summary displays on dashboard
- ✅ Clicking risk category navigates to filtered opportunity list
- ✅ Risk assessment modal opens for any opportunity
- ✅ All 8 factors can be scored with 5-point scale
- ✅ Risk score calculates correctly in real-time
- ✅ Risk level determined accurately (LOW/MEDIUM/HIGH/CRITICAL)
- ✅ Approval level displayed correctly
- ✅ Review status and mitigation plan fields work
- ✅ Save button updates Current RMS custom fields
- ✅ Opportunity moves to correct risk category after save
- ✅ No new custom fields created (uses existing risk_* fields)

## Environment Requirements

**No new environment variables needed!**

Uses existing:
- `CURRENT_RMS_SUBDOMAIN`
- `CURRENT_RMS_API_KEY`
- `POSTGRES_URL`

## Current RMS Custom Fields Required

All fields must exist in Current RMS with prefix `risk_`:

**Numeric fields (integer 1-5):**
- `risk_project_novelty`
- `risk_technical_complexity`
- `risk_resource_utilization`
- `risk_client_sophistication`
- `risk_budget_size`
- `risk_timeframe_constraint`
- `risk_team_experience`
- `risk_subhire_availability`

**Calculated fields:**
- `risk_score` (decimal)
- `risk_level` (text: LOW/MEDIUM/HIGH/CRITICAL)

**Workflow fields:**
- `risk_reviewed` (text: "Yes" or "")
- `risk_mitigation_plan` (integer: 0/1/2)
- `risk_mitigation_notes` (text area)
- `risk_last_updated` (date/time)

## Known Limitations

1. **No bulk assessment** - Must assess opportunities individually
2. **No risk trending** - Historical risk data not tracked (future phase)
3. **No automated alerts** - Manual review required (future phase)
4. **No risk templates** - Cannot save factor combinations for reuse
5. **No risk approval workflow** - Approvals tracked but not enforced

## Troubleshooting

### Risk summary not showing
- Check `/api/risk/summary` returns data
- Verify opportunities have `risk_level` in `data.custom_fields`
- Check database has synced opportunities

### Assessment not saving
- Verify Current RMS API credentials in env vars
- Check custom fields exist in Current RMS
- Review browser console for API errors
- Check `/api/opportunities/[id]/risk` endpoint

### Opportunities not appearing in risk category
- Ensure risk level matches exactly (case-sensitive)
- Check opportunity was synced after assessment
- Verify `data.custom_fields.risk_level` in database

## Next Steps (Future Phases)

Potential Phase 4 features:
- Risk trend analysis dashboard
- Automated risk flagging based on opportunity attributes
- Email alerts for CRITICAL risks
- Risk mitigation task tracking
- Risk assessment templates for common event types
- Executive risk reporting (PDF exports)
- Integration with project management tools

---

**Phase 3 Complete!** 🎉

Risk assessment is now fully integrated with Current RMS opportunity management.
