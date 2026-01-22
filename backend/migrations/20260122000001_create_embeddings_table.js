/**
 * Migration: Create embeddings table for RAG
 * Stores vector embeddings for semantic search
 */

exports.up = async function (knex) {
  // Ensure pgvector extension is enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');

  return knex.schema.createTable('embeddings', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Source reference (polymorphic - can reference transcriptions or enrichments)
    table.string('source_type', 50).notNullable(); // 'transcription' or 'enrichment'
    table.uuid('source_id').notNullable();

    // Content that was embedded (for reference/debugging)
    table.text('content').notNullable();

    // Chunk information (for large texts split into chunks)
    table.integer('chunk_index').defaultTo(0);
    table.integer('total_chunks').defaultTo(1);

    // Embedding metadata
    table.string('model', 100).defaultTo('text-embedding-3-small');
    table.integer('dimensions').defaultTo(1536);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['source_type', 'source_id']);
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('embeddings');
};
