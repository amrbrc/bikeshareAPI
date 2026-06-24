const express = require('express');
const router = express.Router();

// Controllers
const memberController = require('../controllers/memberController');
const bikeController = require('../controllers/bikeController');
const helpController = require('../controllers/helpController');
const fallbackController = require('../controllers/fallbackController');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');

const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');

// Member Check Route
router.post('/members/check', memberController.checkMember);

// Bike Routes (SMS Endpoints)
router.post('/search', bikeController.search);
router.post('/search-all', bikeController.searchAll);
router.post('/locations', bikeController.locations);
router.post('/usage', bikeController.usage);
router.post('/borrow', bikeController.borrow);
router.post('/done', bikeController.done);
router.post('/good', bikeController.good);
router.post('/broken', bikeController.broken);
router.post('/fixed', bikeController.fixed);

// Help Routes
router.post('/help', helpController.help);
router.post('/how', helpController.how);
router.post('/admin/resolve-dispute', adminController.resolveDispute);

// Fallback Routes
router.post('/invalid-command', fallbackController.invalidCommand);
router.post('/non-registered', fallbackController.nonRegistered);

// Public Dashboard Routes
router.get('/bicycles', bikeController.getBicycles);
router.get('/locations', bikeController.getLocations);
router.get('/history/:bicycleCode', bikeController.getHistory);
router.get('/analytics', analyticsController.getAnalytics);

module.exports = router;
