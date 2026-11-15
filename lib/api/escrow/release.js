const transitionEscrow = require('../../escrowTransition');

module.exports = (req, res) => transitionEscrow(req, res, {
  expectedStatus: 'DELIVERY_CONFIRMED',
  nextStatus: 'RELEASED',
  timestampField: 'fundsReleasedAt',
  actionLabel: 'record the release'
});