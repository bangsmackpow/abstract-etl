const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const JWT_EXPIRES_IN = '24h';

async function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  console.log(`[AuthService] Querying for email: "${cleanEmail}"`);
  
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  
  if (!user) {
    console.warn(`[AuthService] No user found with email: "${cleanEmail}"`);
    throw new Error('Invalid email or password');
  }

  console.log(`[AuthService] User found: ${user.id}, role: ${user.role}. Verifying password...`);

  const isPasswordValid = comparePassword(password, user.password);
  if (!isPasswordValid) {
    console.warn(`[AuthService] Password mismatch for user: ${cleanEmail}`);
    throw new Error('Invalid email or password');
  }

  console.log(`[AuthService] Password verified for: ${cleanEmail}`);
  const token = generateToken(user);
  
  // Don't return the password
  const { password: _, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    token
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  login,
  JWT_SECRET
};
