require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use(express.static(path.join(__dirname, '../dashboard')));

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Worker API' });
});

// Mount all API endpoints from the router
app.use('/api', apiRoutes);

// Listen on port 3001
app.listen(PORT, () => {
    console.log(`Worker API online and listening on port ${PORT}`);
});
