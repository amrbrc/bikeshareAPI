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
router.post('/missing', bikeController.missing);
router.post('/delivered', bikeController.delivered);
router.post('/points', bikeController.points);

// Help Routes
router.post('/help', helpController.help);
router.post('/how', helpController.how);

// Public Auth & Admin Routes
router.post('/auth/login', memberController.login);
router.post('/admin/login', adminController.login);

// Admin Routes (Secured with authMiddleware)
router.get('/admin/settings', authMiddleware, adminController.getSettings);
router.post('/admin/settings', authMiddleware, adminController.updateSettings);
router.get('/admin/members', authMiddleware, adminController.getMembers);
router.post('/admin/members', authMiddleware, adminController.addMember);
router.post('/admin/bicycles', authMiddleware, adminController.addBicycle);
router.post('/admin/locations', authMiddleware, adminController.addLocation);
router.post('/admin/resolve-dispute', authMiddleware, adminController.resolveDispute);

router.get('/admin/search-bike', authMiddleware, adminController.searchBike);
router.get('/admin/search-member', authMiddleware, adminController.searchMember);
router.post('/admin/override-points', authMiddleware, adminController.overridePoints);
router.post('/admin/override-bike', authMiddleware, adminController.overrideBike);
router.post('/admin/delete-member', authMiddleware, adminController.deleteMember);
router.post('/admin/delete-bike', authMiddleware, adminController.deleteBike);
router.post('/admin/bicycles/toggle', authMiddleware, adminController.toggleBike);
router.post('/admin/delete-location', authMiddleware, adminController.deleteLocation);
router.post('/admin/locations/toggle', authMiddleware, adminController.toggleLocation);
router.get('/admin/reports', authMiddleware, adminController.getReports);

// Fallback Routes
router.post('/invalid-command', fallbackController.invalidCommand);
router.post('/non-registered', fallbackController.nonRegistered);

// Public Dashboard Routes
router.get('/student/dashboard', authMiddleware, memberController.getStudentDashboard);
router.get('/student/leaderboards', authMiddleware, memberController.getLeaderboards);
router.get('/bicycles', bikeController.getBicycles);
router.get('/locations', bikeController.getLocations);
router.get('/history/:bicycleCode', bikeController.getHistory);
router.get('/analytics', analyticsController.getAnalytics);

// Admin UI Routes (Requires authentication)
router.get('/admin/search/bicycles', authMiddleware, adminController.searchBicycles);
router.get('/admin/search/members', authMiddleware, adminController.searchMembers);
router.post('/admin/bicycles/override', authMiddleware, adminController.overrideBicycle);
router.delete('/admin/locations/:name', authMiddleware, adminController.deleteLocation);
router.get('/admin/maintenance', authMiddleware, adminController.getMaintenanceQueue);
router.get('/admin/honesty', authMiddleware, adminController.getHonestyLogs);

module.exports = router;
