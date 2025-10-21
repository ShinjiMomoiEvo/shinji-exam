const express = require('express');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for HTTPS behind Nginx)
app.set('trust proxy', true);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API routes
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));

// --- Catch-all for frontend routing ---
// Express catch-all using regex compatible with all path-to-regexp versions
app.get(/^\/(?!api\/).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
