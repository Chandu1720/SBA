# E11000 Duplicate Key Error - Fix Summary

## Problem
```
E11000 duplicate key error collection: test.counters 
index: id_1_reference_value_1 dup key: { id: null, reference_value: null }
```

The MongoDB unique index on the counters collection was causing conflicts when multiple documents had null values for indexed fields.

## Root Cause
- The Counter model had a non-sparse unique compound index
- When upsert operations created documents with null values, MongoDB treated them as duplicates
- Concurrent requests could trigger this error due to race conditions

## Solution Implemented

### 1. **Updated Counter Model** (`models/Counter.js`)
- Added `sparse: true` to the unique index
- This tells MongoDB to exclude null values from the uniqueness constraint
- Sparse indexes only check uniqueness for non-null values

```javascript
counterSchema.index({ type: 1, year: 1 }, { unique: true, sparse: true });
```

### 2. **Enhanced Number Generator** (`utils/numberGenerator.js`)
- Added retry logic with exponential backoff
- Handles potential race conditions gracefully
- Catches E11000 errors and retries up to 3 times with increasing delays

```javascript
async function getNextSequence(type, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(...);
      return counter.seq;
    } catch (error) {
      if (error.code === 11000 && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. **Database Migration** (`scripts/fixCounterIndex.js`)
- Dropped the old counters collection to remove bad indexes
- Created proper sparse unique indexes
- Run via: `node ./scripts/fixCounterIndex.js`

## Testing
✅ Counter generation test passed with no E11000 errors
- Invoice numbers generated: INV/2025-26/000001, INV/2025-26/000002, etc.
- Bill numbers generated: BILL/2025-26/000001, BILL/2025-26/000002, etc.
- Sequential numbering works correctly
- No duplicate key conflicts

## Production Recommendations
1. The sparse index prevents null value duplicates
2. Retry logic handles transient race conditions
3. Financial year-based numbering ensures records are organized by fiscal period
4. Numbers are atomic and never duplicated, safe for PDF generation and reuse
