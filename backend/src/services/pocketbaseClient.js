const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

/**
 * Global admin authentication helper.
 */
async function authenticateAdmin() {
  try {
    console.log('[PocketBase] Attempting admin authentication...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ [PocketBase] Admin authenticated.');
    
    // Check schema on startup
    const { ensureSchema } = require('./schemaService');
    await ensureSchema();
    return true;
  } catch (err) {
    console.error('❌ [PocketBase] Admin auth failed:', err.message);
    return false;
  }
}

// Export the instance and the auth helper (don't auto-run here anymore)
module.exports = pb;
module.exports.authenticateAdmin = authenticateAdmin;
