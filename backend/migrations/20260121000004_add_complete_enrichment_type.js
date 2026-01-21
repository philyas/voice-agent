/**
 * Migration: Add 'complete' enrichment type
 * All-in-one enrichment with summary, key points, todos, and notes
 */

exports.up = function (knex) {
  return knex.schema.raw(`
    -- Drop existing constraint
    ALTER TABLE enrichments 
    DROP CONSTRAINT IF EXISTS enrichments_type_check;
    
    -- Add new constraint with 'complete' type
    ALTER TABLE enrichments 
    ADD CONSTRAINT enrichments_type_check 
    CHECK (type IN ('summary', 'formatted', 'notes', 'action_items', 'key_points', 'translation', 'custom', 'complete'));
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    -- Drop constraint
    ALTER TABLE enrichments 
    DROP CONSTRAINT IF EXISTS enrichments_type_check;
    
    -- Recreate without 'complete'
    ALTER TABLE enrichments 
    ADD CONSTRAINT enrichments_type_check 
    CHECK (type IN ('summary', 'formatted', 'notes', 'action_items', 'key_points', 'translation', 'custom'));
  `);
};
