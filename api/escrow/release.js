const transitionEscrow = require('../../lib/escrowTransition');

module.exports = (req, res) => transitionEscrow(req, res, {
  expectedStatus: 'FUNDS_HELD',
  nextStatus: 'RELEASED',
  timestampField: 'fundsReleasedAt',
  actionLabel: 'release funds'
});