const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

async function authenticateAdmin() {
  try {
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅  PocketBase admin authenticated');
    
    // Check schema on startup
    const { ensureSchema } = require('./schemaService');
    await ensureSchema();
  } catch (err) {
    console.error('❌  PocketBase admin auth failed:', err.message);
  }
}

authenticateAdmin();
setInterval(authenticateAdmin, 6 * 24 * 60 * 60 * 1000);

module.exports = pb;
