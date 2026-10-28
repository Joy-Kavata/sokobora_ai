const express = require('express');
const cors = require('cors');

const app = express();

if (process.env.CLIENT_ORIGIN) {
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
  }));
}
app.use(express.json());

const handlers = {
  '/auth/register': require('../../lib/api/auth/register'),
  '/auth/login': require('../../lib/api/auth/login'),
  '/auth/me': require('../../lib/api/auth/me'),
  '/auth/logout': require('../../lib/api/auth/logout'),
  '/admin/users': require('../../lib/api/admin/users'),
  '/analytics/impact': require('../../lib/api/analytics/impact'),
  '/listings': require('../../lib/api/listings'),
  '/bids': require('../../lib/api/bids'),
  '/bids/accept': require('../../lib/api/bids/accept'),
  '/escrow/deposit': require('../../lib/api/escrow/deposit'),
  '/escrow/release': require('../../lib/api/escrow/release')
};

app.use((req, res) => {
  const route = req.query.__route;
  if (typeof route !== 'string') {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }

  if (route === '/health') {
    return res.status(200).json({ status: 'active', message: 'SokoBora AI API is operational' });
  }

  const handler = handlers[route];
  if (!handler) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }

  return handler(req, res);
});

module.exports = app;