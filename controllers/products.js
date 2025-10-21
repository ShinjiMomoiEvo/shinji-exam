// controllers/products.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// S3 setup
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: process.env.AWS_REGION
});
const BUCKET = process.env.AWS_BUCKET;

// MySQL connection helper
async function getConnection() {
    return mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

// GET /api/products?category=1&limit=20&offset=0
exports.getProducts = async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category ? parseInt(req.query.category) : null;

    try {
        const connection = await getConnection();

        let query = `
            SELECT p.*, c.name AS category_name, GROUP_CONCAT(i.url) AS images
            FROM shinji_products p
            LEFT JOIN shinji_categories c ON p.category_id = c.id
            LEFT JOIN shinji_images i ON i.product_id = p.id
        `;
        const params = [];

        if (category) {
            query += ' WHERE p.category_id = ?';
            params.push(category);
        }

        query += `
            GROUP BY p.id
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `;
        params.push(limit, offset);

        const [rows] = await connection.query(query, params);
        await connection.end();

        rows.forEach(r => {
            r.images = r.images ? r.images.split(',') : [];
        });

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/products/search?q=term
exports.searchProducts = async (req, res) => {
    const q = req.query.q || '';
    const category = req.query.category; // optional
    console.log('Search query:', q, 'Category filter:', category);

    try {
        const connection = await getConnection();

        let query = `
            SELECT p.*, c.name AS category_name, GROUP_CONCAT(i.url) AS images
            FROM shinji_products p
            LEFT JOIN shinji_categories c ON p.category_id = c.id
            LEFT JOIN shinji_images i ON i.product_id = p.id
            WHERE (p.title LIKE ? OR p.description LIKE ?)
        `;

        const params = [`%${q}%`, `%${q}%`];

        // If category filter exists, add it
        if (category) {
            query += ' AND p.category_id = ?';
            params.push(category);
        }

        query += ' GROUP BY p.id ORDER BY p.id DESC';

        const [rows] = await connection.query(query, params);
        await connection.end();

        // Convert images string to array
        rows.forEach(r => {
            r.images = r.images ? r.images.split(',') : [];
        });

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// POST /api/products
exports.addProduct = async (req, res) => {

    console.log('req.headers:', req.headers);
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    let { title, description, price, category_id, sku, discount_percentage = 0, rating = 0, stock = 0, brand = '' } = req.body;

    console.log(title, description, price, category_id, "required fields check");
    if (!title || !description || !price || !category_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const connection = await getConnection();

        // --- GENERATE SKU IF MISSING ---
        if (!sku) {
            // Fetch category name
            const [categoryRows] = await connection.query(
                `SELECT name FROM shinji_categories WHERE id = ?`,
                [category_id]
            );
            if (!categoryRows.length) {
                await connection.end();
                return res.status(400).json({ error: 'Invalid category_id' });
            }

            const categoryName = categoryRows[0].name;

            // Get last sequence number for this category
            const [lastProduct] = await connection.query(
                `SELECT sku FROM shinji_products WHERE category_id = ? ORDER BY id DESC LIMIT 1`,
                [category_id]
            );

            let lastNumber = 0;
            if (lastProduct.length) {
                const match = lastProduct[0].sku.match(/(\d{3})$/); // last 3 digits
                if (match) lastNumber = parseInt(match[1], 10);
            }

            // Helper function to generate SKU
            const generateSKU = (categoryName, title, lastNumber) => {
                const categoryCode = categoryName.slice(0, 3).toUpperCase();
                const titleCode = title.slice(0, 3).toUpperCase();
                const sequence = String(lastNumber + 1).padStart(3, '0');
                return `${categoryCode}-${titleCode}-${titleCode}-${sequence}`;
            };

            sku = generateSKU(categoryName, title, lastNumber);
        }

        // Check if SKU already exists
        const [existing] = await connection.query(
            `SELECT id FROM shinji_products WHERE sku = ?`,
            [sku]
        );
        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'SKU already exists' });
        }

        // Insert product
        const [result] = await connection.query(
            `INSERT INTO shinji_products 
                (title, description, price, category_id, sku, discount_percentage, rating, stock, brand)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, price, category_id, sku, discount_percentage, rating, stock, brand]
        );

        const productId = result.insertId;

        // Handle uploaded images

        console.log(req.files, "req.files check");
        if (req.files) {
            // Normalize the key: prefer 'images', fallback to 'images[]'
            const imagesField = req.files.images || req.files['images[]'];

            if (imagesField) {
                // Ensure it's always an array
                const images = Array.isArray(imagesField) ? imagesField : [imagesField];

                for (const img of images) {
                    try {
                        const fileContent = img.data;
                        const filename = `${Date.now()}_${img.name}`;

                        const params = {
                            Bucket: BUCKET,
                            Key: filename,
                            Body: fileContent,
                            ACL: 'public-read',
                            ContentType: img.mimetype
                        };

                        // Upload to S3
                        const uploadResult = await s3.upload(params).promise();

                        // Insert into DB
                        await connection.query(
                            `INSERT INTO shinji_images (product_id, url) VALUES (?, ?)`,
                            [productId, uploadResult.Location]
                        );

                        console.log(`Uploaded ${img.name} -> ${uploadResult.Location}`);
                    } catch (err) {
                        console.error(`Failed to upload ${img.name}:`, err.message);
                    }
                }
            } else {
                console.log('No files found in req.files');
            }
        } else {
            console.log('req.files is empty');
        }

        await connection.end();
        res.json({ message: 'Product added successfully', productId, sku });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
