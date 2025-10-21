const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy headers (important behind Nginx HTTPS)
app.set('trust proxy', true);

const path = require('path');

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies (for POST requests)
app.use(express.json());

// Mount routes
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));

// Root test route
app.get('/', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const [rows] = await connection.query('SELECT NOW() AS now');
        await connection.end();

        res.send(`<h1>Hello Shinji!</h1><p>Database time: ${rows[0].now}</p>`);
    } catch (err) {
        res.status(500).send('Database connection error: ' + err.message);
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
