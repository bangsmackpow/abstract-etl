const pb = require('./pocketbaseClient');

async function ensureSchema() {
  console.log('🔍 [Schema] Starting schema verification...');
  
  if (!pb.authStore.isValid) {
    console.error('❌ [Schema] Admin is NOT authenticated. Cannot check schema.');
    return;
  }

  try {
    // 1. Check/Add 'role' to users
    const userCollections = await pb.collections.getOne('users');
    console.log(`✅ [Schema] Found "users" collection (ID: ${userCollections.id})`);
    
    const hasRole = userCollections.schema.find(f => f.name === 'role');
    if (!hasRole) {
      console.log('[Schema] "role" field missing on users. Adding it...');
      await pb.collections.update('users', {
        schema: [
          ...userCollections.schema,
          {
            name: 'role',
            type: 'select',
            required: true,
            options: { values: ['abstractor', 'admin'] }
          }
        ]
      });
      console.log('✅ [Schema] "role" field added to users.');
    }

    // 2. Check/Create 'jobs'
    try {
      await pb.collections.getOne('jobs');
      console.log('✅ [Schema] "jobs" collection exists.');
    } catch (err) {
      if (err.status === 404) {
        console.log('[Schema] "jobs" collection missing. Creating it...');
        await pb.collections.create({
          name: 'jobs',
          type: 'base',
          schema: [
            { name: 'created_by', type: 'relation', required: true, options: { collectionId: userCollections.id, maxSelect: 1 } },
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
        throw err;
      }
    }

    console.log('🏁 [Schema] Schema verification complete.');
  } catch (err) {
    console.error('❌ [Schema] Error during verification:', err.status, err.message);
    if (err.data) console.error('   Data:', JSON.stringify(err.data));
  }
}

module.exports = { ensureSchema };
