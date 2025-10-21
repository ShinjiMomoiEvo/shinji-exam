// routes/products.js
const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products');
const fileUpload = require('express-fileupload');

// Middleware to handle file uploads
router.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    abortOnLimit: true,
}));

// API Routes
router.get('/', productsController.getProducts);
router.get('/search', productsController.searchProducts);
router.post('/', productsController.addProduct);

module.exports = router;
