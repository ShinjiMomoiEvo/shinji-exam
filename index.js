const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    try {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

