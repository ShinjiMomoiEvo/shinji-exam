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
        // 1️⃣ Fetch & insert categories
        // ---------------------------
        console.log('📡 Fetching categories...');
        const categoriesRes = await axios.get('https://dummyjson.com/products/categories');
        const categories = categoriesRes.data;
        console.log(`✅ Fetched ${categories.length} categories`);

        for (const cat of categories) {
            console.log(`🔹 Inserting/updating category: ${cat.name}`);
            await connection.query(
                `INSERT INTO shinji_categories (name, slug)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [cat.name, cat.slug]
            );
        }

        // ---------------------------
        // 2️⃣ Fetch & insert products
        // ---------------------------
        console.log('📡 Fetching products...');
        const productsRes = await axios.get('https://dummyjson.com/products?limit=100');
        const products = productsRes.data.products;
        console.log(`✅ Fetched ${products.length} products`);

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

            console.log(`🔹 Inserting/updating product: ${prod.title}`);
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

            // ---------------------------
            // 3️⃣ Insert images
            // ---------------------------
            if (prod.images && prod.images.length > 0) {
                for (const imgUrl of prod.images) {
                    await connection.query(
                        `INSERT INTO shinji_images (product_id, url)
                         VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE url = VALUES(url)`,
                        [result.insertId, imgUrl]
                    );
                }
            }
        }

        console.log('🎉 fetchAndImport.js finished successfully!');
    } catch (err) {
        console.error('❌ Error occurred:', err.message);
    } finally {
        await connection.end();
    }
}

module.exports = fetchAndImport;
