/**
 * Migration: Add vector column to embeddings table
 * Separate migration because knex doesn't support vector type natively
 */

exports.up = async function (knex) {
  // Add vector column (1536 dimensions for text-embedding-3-small)
  await knex.raw(`
    ALTER TABLE embeddings 
    ADD COLUMN embedding vector(1536)
  `);

  // Create HNSW index for fast similarity search
  // HNSW is faster than IVFFlat for most use cases
  await knex.raw(`
    CREATE INDEX embeddings_embedding_hnsw_idx 
    ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS embeddings_embedding_hnsw_idx');
  await knex.raw('ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding');
};
