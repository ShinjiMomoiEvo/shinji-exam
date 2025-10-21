const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL connection helper (same style as products)
async function getConnection() {
    return mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

// GET /api/categories
exports.getCategories = async (req, res) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.query(`
            SELECT ID AS id, name, slug, created_at, updated_at
            FROM shinji_categories
            ORDER BY name
        `);
        await connection.end();
        res.json(rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
