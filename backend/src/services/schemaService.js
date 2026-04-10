const pb = require('./pocketbaseClient');

/**
 * Ensures the required PocketBase collections and fields exist.
 */
async function ensureSchema() {
  console.log('[Schema] Checking PocketBase schema...');
  
  try {
    // 1. Ensure 'role' field exists on 'users'
    const userCollections = await pb.collections.getOne('users');
    const hasRole = userCollections.schema.find(f => f.name === 'role');
    if (!hasRole) {
      console.log('[Schema] Adding "role" field to users collection...');
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
    }

    // 2. Ensure 'jobs' collection exists
    try {
      await pb.collections.getOne('jobs');
      console.log('[Schema] "jobs" collection already exists.');
    } catch (err) {
      if (err.status === 404) {
        console.log('[Schema] Creating "jobs" collection...');
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
        console.log('[Schema] "jobs" collection created successfully.');
      } else {
        throw err;
      }
    }

    console.log('✅  PocketBase schema is valid');
  } catch (err) {
    console.error('❌  Schema check failed:', err.status, err.message, JSON.stringify(err.data));
  }
}

module.exports = { ensureSchema };
