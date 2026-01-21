/**
 * Migration: Create recordings table
 * Stores audio recording metadata
 */

exports.up = function (knex) {
  return knex.schema.createTable('recordings', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // File information
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('file_size').unsigned();
    table.integer('duration_ms').unsigned();
    table.string('storage_path', 500).notNullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('recordings');
};
