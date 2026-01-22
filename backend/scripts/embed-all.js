/**
 * Script to embed all existing transcriptions and enrichments
 * Usage: node scripts/embed-all.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const ragService = require('../src/services/rag.service');
const embeddingService = require('../src/services/embedding.service');

async function main() {
  console.log('🚀 Starting embedding process for all existing content...\n');

  // Check if OpenAI is configured
  if (!embeddingService.isConfigured()) {
    console.error('❌ Error: OpenAI API key is not configured.');
    console.error('   Please set OPENAI_API_KEY in your .env file.');
    process.exit(1);
  }

  try {
    // Get current statistics
    console.log('📊 Checking current embedding statistics...');
    const statsBefore = await embeddingService.getStats();
    console.log('Current embeddings:', statsBefore);
    console.log('');

    // Embed all existing content
    console.log('🔄 Starting embedding process...');
    console.log('   This may take a while depending on the amount of content...\n');

    const startTime = Date.now();
    const results = await ragService.embedAll();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log('\n✅ Embedding process completed!\n');
    console.log('📈 Results:');
    console.log('─'.repeat(50));
    console.log('Transcriptions:');
    console.log(`  Total: ${results.transcriptions.total}`);
    console.log(`  Embedded: ${results.transcriptions.embedded}`);
    console.log(`  Skipped (already embedded): ${results.transcriptions.skipped}`);
    console.log(`  Errors: ${results.transcriptions.errors}`);
    console.log('');
    console.log('Enrichments:');
    console.log(`  Total: ${results.enrichments.total}`);
    console.log(`  Embedded: ${results.enrichments.embedded}`);
    console.log(`  Skipped (already embedded): ${results.enrichments.skipped}`);
    console.log(`  Errors: ${results.enrichments.errors}`);
    console.log('');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('─'.repeat(50));

    // Get final statistics
    console.log('\n📊 Final embedding statistics:');
    const statsAfter = await embeddingService.getStats();
    console.log(JSON.stringify(statsAfter, null, 2));

    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during embedding process:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
