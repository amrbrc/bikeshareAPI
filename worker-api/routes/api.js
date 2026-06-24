const express = require('express');
const router = express.Router();

// Controllers
const memberController = require('../controllers/memberController');
const bikeController = require('../controllers/bikeController');
const helpController = require('../controllers/helpController');
const fallbackController = require('../controllers/fallbackController');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');

// Member Check Route
router.post('/members/check', memberController.checkMember);

// Bike Routes (SMS Endpoints)
router.post('/search', bikeController.search);
router.post('/search-all', bikeController.searchAll);
router.post('/locations', bikeController.locations);
router.post('/usage', bikeController.usage);
router.post('/borrow', bikeController.borrow);

// Help Routes
router.post('/help', helpController.help);
router.post('/how', helpController.how);

// Fallback Routes
router.post('/invalid-command', fallbackController.invalidCommand);
router.post('/non-registered', fallbackController.nonRegistered);

// Public Dashboard Routes
router.get('/bicycles', bikeController.getBicycles);
router.get('/locations', bikeController.getLocations);
router.get('/history/:bicycleCode', bikeController.getHistory);
router.get('/analytics', analyticsController.getAnalytics);

module.exports = router;
