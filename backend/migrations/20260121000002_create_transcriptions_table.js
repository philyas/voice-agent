/**
 * Migration: Create transcriptions table
 * Stores transcription data from Whisper API
 */

exports.up = function (knex) {
  return knex.schema.createTable('transcriptions', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign key to recordings
    table
      .uuid('recording_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('recordings')
      .onDelete('CASCADE');
    
    // Transcription content
    table.text('text').notNullable();
    table.string('language', 10).defaultTo('de');
    table.decimal('duration_seconds', 10, 2);
    
    // Provider information
    table.string('provider', 50).defaultTo('openai-whisper');
    table.string('model_used', 50).defaultTo('whisper-1');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes
    table.index('recording_id');
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transcriptions');
};
