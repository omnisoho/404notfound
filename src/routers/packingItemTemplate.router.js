const express = require('express');
const { getAllPackingItems } = require('../models/packingItemTemplate.model'); // <-- import both
const router = express.Router();

router.get('/', (req, res, next) => {
  getAllPackingItems()
    .then((items) => res.status(200).json(items))
    .catch(next);
});

module.exports = router;