const { db } = require('./src/db');
const { users } = require('./src/db/schema');
const { hashPassword } = require('./src/services/authService');
const { eq } = require('drizzle-orm');

async function forceSeed() {
  const email = process.env.ADMIN_EMAIL || 'curtis@builtnetworks.com';
  const pass  = process.env.ADMIN_PASSWORD || 'your_password_here';

  console.log(`🚀 Force seeding admin: ${email}`);

  try {
    const hashedPassword = await hashPassword(pass);
    
    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
      console.log('👤 User exists, updating password...');
      await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));
    } else {
      console.log('👤 User missing, creating...');
      await db.insert(users).values({
        name: 'System Admin',
        email: email,
        password: hashedPassword,
        role: 'admin'
      });
    }
    console.log('✅ Success! Try logging in now.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

forceSeed();
