const express = require('express');
const router = express.Router();

const { createProduceListing } = require('../controllers/listingController');
const { placeBid, acceptBid } = require('../controllers/biddingController');

// Produce Listing Routes
router.post('/listings', createProduceListing);

// Bidding & Escrow Routes
router.post('/bids', placeBid);
router.post('/bids/accept', acceptBid);

module.exports = router;