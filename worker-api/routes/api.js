const express = require('express');
const router = express.Router();

// Controllers
const memberController = require('../controllers/memberController');
const bikeController = require('../controllers/bikeController');
const helpController = require('../controllers/helpController');
const fallbackController = require('../controllers/fallbackController');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');

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

// Admin Routes
router.post('/admin/login', adminController.login);
router.get('/admin/members', authMiddleware, adminController.getMembers);
router.post('/admin/members', authMiddleware, adminController.addMember);
router.post('/admin/bicycles', authMiddleware, adminController.addBicycle);
router.post('/admin/locations', authMiddleware, adminController.addLocation);
router.post('/admin/locations/toggle', authMiddleware, adminController.toggleLocation);

module.exports = router;
