const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Change these to your desired credentials
const email = 'curtis@builtnetworks.com';
const pass  = 'letmein1233';

const dbPath = path.join(__dirname, 'data', 'sqlite.db');
const db = new Database(dbPath);

console.log(`🛠️ Resetting password for: ${email}`);

try {
  const hashedPassword = bcrypt.hashSync(pass, 10);
  
  const update = db.prepare("UPDATE users SET password = ? WHERE email = ?");
  const result = update.run(hashedPassword, email);

  if (result.changes > 0) {
    console.log('✅ Success! Password updated in database.');
  } else {
    console.log('❌ User not found. Creating new admin...');
    const insert = db.prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    insert.run(require('crypto').randomUUID(), 'Admin', email, hashedPassword, 'admin');
    console.log('✅ Success! New admin created.');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  db.close();
}
