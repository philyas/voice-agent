/**
 * Migration: Create enrichments table
 * Stores AI-enriched content from GPT-4o-mini
 */

exports.up = function (knex) {
  return knex.schema.createTable('enrichments', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign key to transcriptions
    table
      .uuid('transcription_id')
      .notNullable()
      .references('id')
      .inTable('transcriptions')
      .onDelete('CASCADE');
    
    // Enrichment content
    table
      .enum('type', [
        'summary',
        'formatted',
        'notes',
        'action_items',
        'key_points',
        'translation',
        'custom',
      ])
      .notNullable();
    table.text('content').notNullable();
    table.text('prompt_used');
    
    // Model information
    table.string('model_used', 50).defaultTo('gpt-4o-mini');
    table.integer('tokens_used').unsigned();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes
    table.index('transcription_id');
    table.index('type');
    table.index('created_at');
    
    // Unique constraint: one enrichment per type per transcription
    table.unique(['transcription_id', 'type']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('enrichments');
};
