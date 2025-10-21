const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fetchAndImport() {
    console.log('🔹 fetchAndImport.js started');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // ---------------------------
        // 2️⃣ Fetch & insert products (batched)
        // ---------------------------
        console.log('📡 Fetching products in batches...');

        let skip = 0;
        const limit = 100;
        let total = 0;

        do {
        const productsRes = await axios.get(`https://dummyjson.com/products?limit=${limit}&skip=${skip}`);
        const products = productsRes.data.products;
        total = productsRes.data.total; // total number of products in API

        console.log(`✅ Fetched ${products.length} products (skip=${skip})`);

        for (const prod of products) {
            // Get category_id
            const [rows] = await connection.query(
            'SELECT id FROM shinji_categories WHERE slug = ?',
            [prod.category]
            );
            const categoryId = rows[0]?.id || null;

            if (!categoryId) {
            console.warn(`⚠️ Category not found for product: ${prod.title}, skipping`);
            continue;
            }

            // Insert or update product
            const [result] = await connection.query(
            `INSERT INTO shinji_products 
                (title, description, price, discount_percentage, rating, stock, brand, sku, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                price = VALUES(price),
                discount_percentage = VALUES(discount_percentage),
                rating = VALUES(rating),
                stock = VALUES(stock),
                brand = VALUES(brand),
                sku = VALUES(sku),
                category_id = VALUES(category_id)`,
            [
                prod.title,
                prod.description,
                prod.price,
                prod.discountPercentage,
                prod.rating,
                prod.stock,
                prod.brand,
                prod.sku,
                categoryId
            ]
            );

            // Get actual product ID (inserted or existing)
            let productId = result.insertId;
            if (!productId) {
            const [existing] = await connection.query(
                'SELECT id FROM shinji_products WHERE title = ?',
                [prod.title]
            );
            productId = existing[0].id;
            }

            console.log(`🔹 Inserting/updating product: ${prod.title} (ID: ${productId})`);

            // Insert images
            if (prod.images && prod.images.length > 0) {
            for (const imgUrl of prod.images) {
                await connection.query(
                `INSERT INTO shinji_images (product_id, url)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE url = VALUES(url)`,
                [productId, imgUrl]
                );
            }
            }
        }

        skip += limit;
        } while (skip < total);

        console.log('🎉 All products fetched and inserted!');

    } catch (err) {
        console.error('❌ Error occurred:', err);
    } finally {
        await connection.end();
        console.log('🔹 Database connection closed');
    }
}

module.exports = fetchAndImport;
