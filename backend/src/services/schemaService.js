const pb = require('./pocketbaseClient');

async function ensureSchema() {
  console.log('🔍 [Schema] Starting comprehensive schema verification...');
  
  try {
    const collections = await pb.collections.getFullList();
    console.log(`✅ [Schema] Connected. Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`);

    // 1. Ensure 'role' field exists on 'users'
    const userColl = collections.find(c => c.name === 'users');
    if (userColl) {
      // Handle both old 'schema' and new 'fields' property (PocketBase v0.23+)
      const fields = userColl.fields || userColl.schema || [];
      const hasRole = fields.find(f => f.name === 'role');
      
      if (!hasRole) {
        console.log('[Schema] Adding "role" field to users...');
        await pb.collections.update(userColl.id, {
          [userColl.fields ? 'fields' : 'schema']: [
            ...fields,
            { name: 'role', type: 'select', required: true, options: { values: ['abstractor', 'admin'] } }
          ]
        });
      }
    }

    // 2. Ensure 'jobs' collection exists
    const jobsColl = collections.find(c => c.name === 'jobs');
    if (!jobsColl) {
      console.log('[Schema] "jobs" collection missing. Creating now...');
      await pb.collections.create({
        name: 'jobs',
        type: 'base',
        schema: [ // Create uses 'schema' in the SDK version we use
          { name: 'created_by', type: 'relation', required: true, options: { collectionId: userColl.id, maxSelect: 1 } },
          { name: 'status', type: 'select', required: true, options: { values: ['draft', 'needs_review', 'complete'] } },
          { name: 'property_address', type: 'text', required: true },
          { name: 'borrower_names', type: 'text' },
          { name: 'county', type: 'text' },
          { name: 'order_date', type: 'date' },
          { name: 'fields_json', type: 'json' },
          { name: 'ai_flags_json', type: 'json' },
          { name: 'template_version', type: 'text' },
          { name: 'email_sent', type: 'bool' },
          { name: 'notes', type: 'text' }
        ],
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "admin"'
      });
      console.log('✅ [Schema] "jobs" collection created.');
    } else {
      console.log('✅ [Schema] "jobs" collection verified.');
    }

    console.log('🏁 [Schema] Verification complete.');
  } catch (err) {
    console.error('❌ [Schema] Critical verification error:', err.status, err.message);
    if (err.data) console.error('   Details:', JSON.stringify(err.data));
  }
}

module.exports = { ensureSchema };
