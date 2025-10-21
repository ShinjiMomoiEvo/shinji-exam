import { initDashboard } from './dashboard.js';
import { createProductForm } from './form.js';

const { loadProducts } = initDashboard();

// Initialize the form but keep it hidden until button is clicked
createProductForm('formContainer', () => {
    loadProducts();
    // Optionally hide the form after adding a product
    const formContainer = document.getElementById('formContainer');
    formContainer.style.display = 'none';
});
