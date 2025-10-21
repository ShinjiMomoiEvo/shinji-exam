const express = require('express');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: trust proxy to detect HTTPS correctly behind Nginx
app.set('trust proxy', true);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Example routes
app.get('/', (req, res) => {
    res.send(`<h1>Hello Shinji!</h1><p>Protocol: ${req.protocol}, Secure: ${req.secure}</p>`);
});

app.get('/check', (req, res) => {
    res.send(`protocol: ${req.protocol}, secure: ${req.secure}`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
