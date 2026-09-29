const transitionEscrow = require('../../lib/escrowTransition');

module.exports = (req, res) => transitionEscrow(req, res, {
  expectedStatus: 'PENDING_DEPOSIT',
  nextStatus: 'FUNDS_HELD',
  timestampField: 'depositRecordedAt',
  actionLabel: 'record deposit'
});