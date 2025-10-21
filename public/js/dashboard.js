import { createProductForm } from './form.js';

export function initDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // --- BUILD LAYOUT ---
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `<div class="logo">MyShop</div><nav id="category-list"></nav>`;

    const main = document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
        <header>
            <button id="hamburger">&#9776;</button>
            <h1>Products</h1>
            <div class="search-container">
                <input type="text" id="search-box" placeholder="Search products...">
            </div>
            <button id="add-product-btn">Add</button>
        </header>
        <section id="product-grid"></section>
    `;

    dashboard.appendChild(sidebar);
    dashboard.appendChild(main);

    // --- ELEMENTS ---
    const hamburger = document.getElementById('hamburger');
    const categoryList = document.getElementById('category-list');
    const productGrid = document.getElementById('product-grid');
    const addProductBtn = document.getElementById('add-product-btn');
    const searchBox = document.getElementById('search-box');

    let selectedCategory = null;
    let searchTerm = '';

    // --- SIDEBAR TOGGLE ---
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // --- FETCH & RENDER CATEGORIES ---
    fetch('/api/categories')
        .then(res => res.json())
        .then(categories => {
            categoryList.innerHTML = '';
            const allBtn = document.createElement('button');
            allBtn.textContent = 'All Products';
            allBtn.classList.add('active');
            allBtn.addEventListener('click', () => {
                selectedCategory = null;
                updateActiveCategory(allBtn);
                loadProducts();
            });
            categoryList.appendChild(allBtn);

            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.textContent = cat.name;
                btn.addEventListener('click', () => {
                    selectedCategory = cat.id;
                    updateActiveCategory(btn);
                    loadProducts();
                });
                categoryList.appendChild(btn);
            });
        });

    // --- HIGHLIGHT ACTIVE CATEGORY ---
    function updateActiveCategory(activeBtn) {
        const buttons = categoryList.querySelectorAll('button');
        buttons.forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // --- MODAL SETUP ---
    const formModal = document.createElement('div');
    formModal.id = 'formModal';
    formModal.className = 'modal';
    formModal.innerHTML = `<div class="modal-content" id="formContainer"></div>`;
    document.body.appendChild(formModal);

    // Function to open modal and create form
    function openProductForm() {
        const formContainer = document.getElementById('formContainer');
        formContainer.innerHTML = ''; // clear previous form
        formContainer.style.display = 'block'; // ensure visible

        createProductForm('formContainer', () => {
            loadProducts();
            formModal.style.display = 'none'; // hide modal after submission
        });

        formModal.style.display = 'flex'; // show modal mask
    }

    // Open modal on button click
    addProductBtn.addEventListener('click', openProductForm);

    // Close modal if clicking outside form content
    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) {
            formModal.style.display = 'none';
        }
    });


    // --- LOAD PRODUCTS ---
    function loadProducts() {
        let url;
        const params = new URLSearchParams();

        // If searching, use the search endpoint
        if (searchTerm) {
            url = '/api/products/search';
            params.append('q', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory); // optional support
        } else {
            // Otherwise, use the normal endpoint
            url = '/api/products';
            if (selectedCategory) params.append('category', selectedCategory);
        }

        const query = params.toString();
        if (query) url += '?' + query;

        fetch(url)
            .then(res => res.json())
            .then(products => {
                productGrid.innerHTML = '';
                if (!products.length) {
                    productGrid.innerHTML = '<p class="empty">No products found.</p>';
                    return;
                }

                products.forEach(product => {
                    const div = document.createElement('div');
                    div.className = 'product-card';
                    div.innerHTML = `
                        <img src="${product.images.length ? product.images[0] : 'default.jpg'}" alt="${product.title}">
                        <h3>${product.title}</h3>
                        <p>$${product.price}</p>
                    `;
                    productGrid.appendChild(div);
                });
            })
            .catch(err => console.error('Error loading products:', err));
    }


    // --- SEARCH LOGIC WITH DEBOUNCE ---
    let searchTimeout;
    searchBox.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value.trim();
            loadProducts();
        }, 400);
    });

    // --- INITIAL LOAD ---
    loadProducts();

    return { loadProducts };
}
