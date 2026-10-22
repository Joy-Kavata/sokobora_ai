const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'sokobora_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a value of at least 32 characters.');
  }
  return secret;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, keyHex] = storedHash.split(':');
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) {
    return false;
  }

  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scrypt(password, Buffer.from(saltHex, 'hex'), expectedKey.length);
  return actualKey.length === expectedKey.length && crypto.timingSafeEqual(actualKey, expectedKey);
}

function createSessionToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;

  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest();
  let receivedSignature;
  try {
    receivedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (receivedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof session.userId !== 'string' || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session.userId;
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(request, prisma) {
  const userId = readSessionToken(request);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true }
  });
}

function setSessionCookie(response, userId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${createSessionToken(userId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
  );
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
  );
}

module.exports = {
  clearSessionCookie,
  getSessionSecret,
  getAuthenticatedUser,
  hashPassword,
  setSessionCookie,
  verifyPassword
};
