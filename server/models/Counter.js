const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'invoice', 'bill', 'product', or 'kit'
  year: { type: String, index: true }, // e.g., '2025-26'. Not required for all types.
  seq: { type: Number, default: 0 },
});

// Compound unique index on type and year for year-based counters.
// The `sparse` option ensures that documents without a `year` field are not indexed,
// allowing multiple documents with the same `type` but a null `year`.
counterSchema.index({ type: 1, year: 1 }, { unique: true, sparse: true });

// We need a separate unique index for non-year-based counters like product and kit.
counterSchema.index({ type: 1 }, { unique: true, partialFilterExpression: { year: { $exists: false } } });


module.exports = mongoose.model('Counter', counterSchema);