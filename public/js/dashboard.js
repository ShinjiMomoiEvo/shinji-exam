import { createProductForm } from './form.js';

export function initDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // --- STATE ---
    let currentPage = 0;
    let isLoading = false;
    let hasMore = true;
    let searchTerm = '';
    let selectedCategory = null;
    const PAGE_SIZE = 20;
    const loadedProducts = new Set();

    // --- BUILD LAYOUT ---
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `<div class="logo">Categories</div><nav id="category-list"></nav>`;

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
        <div id="loader" style="text-align:center;padding:1em;display:none;">Loading...</div>
    `;

    dashboard.appendChild(sidebar);
    dashboard.appendChild(main);

    // --- ELEMENTS ---
    const categoryList = document.getElementById('category-list');
    const productGrid = document.getElementById('product-grid');
    const addProductBtn = document.getElementById('add-product-btn');
    const searchBox = document.getElementById('search-box');
    const loader = document.getElementById('loader');
    const hamburger = document.getElementById('hamburger');

    // --- SIDEBAR TOGGLE ---
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // --- MODAL ---
    const formModal = document.createElement('div');
    formModal.id = 'formModal';
    formModal.className = 'modal';
    formModal.innerHTML = `<div class="modal-content" id="formContainer"></div>`;
    document.body.appendChild(formModal);

    function openProductForm() {
        const formContainer = document.getElementById('formContainer');
        formContainer.innerHTML = '';
        formContainer.style.display = 'block';

        createProductForm('formContainer', () => {
            resetAndLoad();
            formModal.style.display = 'none';
        });

        formModal.style.display = 'flex';
    }

    addProductBtn.addEventListener('click', openProductForm);
    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) formModal.style.display = 'none';
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
                resetAndLoad();
            });
            categoryList.appendChild(allBtn);

            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.textContent = cat.name;
                btn.addEventListener('click', () => {
                    selectedCategory = cat.id;
                    updateActiveCategory(btn);
                    resetAndLoad();
                });
                categoryList.appendChild(btn);
            });
        });

    function updateActiveCategory(activeBtn) {
        const buttons = categoryList.querySelectorAll('button');
        buttons.forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // --- RESET & LOAD PRODUCTS ---
    function resetAndLoad() {
        currentPage = 0;
        hasMore = true;
        isLoading = false;
        loadedProducts.clear();
        productGrid.innerHTML = '';
        loadProducts();
    }

    async function loadProducts() {
        if (!hasMore || isLoading) return;
        isLoading = true;
        loader.style.display = 'block';

        const params = new URLSearchParams();
        params.append('limit', PAGE_SIZE);
        params.append('offset', currentPage * PAGE_SIZE);
        if (searchTerm) params.append('q', searchTerm);
        if (selectedCategory) params.append('category', selectedCategory);

        let url = searchTerm ? '/api/products/search' : '/api/products';
        url += '?' + params.toString();

        try {
            const res = await fetch(url);
            const products = await res.json();
            loader.style.display = 'none';

            if (!products.length) {
                hasMore = false;
                if (currentPage === 0) productGrid.innerHTML = '<p class="empty">No products found.</p>';
                return;
            }

            products.forEach(product => {
                if (loadedProducts.has(product.id)) return;
                loadedProducts.add(product.id);

                const div = document.createElement('div');
                div.className = 'product-card';
                div.innerHTML = `
                    <img src="${product.images.length ? product.images[0] : 'default.jpg'}" alt="${product.title}">
                    <h3>${product.title}</h3>
                    <p>$${product.price}</p>
                `;
                productGrid.appendChild(div);
            });

            currentPage++;
        } catch (err) {
            console.error('Error loading products:', err);
            loader.style.display = 'none';
        } finally {
            isLoading = false;
        }
    }

    // --- INFINITE SCROLL ---
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            loadProducts();
        }
    });

    // --- SEARCH WITH DEBOUNCE ---
    let searchTimeout;
    searchBox.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value.trim();
            resetAndLoad();
        }, 400);
    });

    // --- INITIAL LOAD ---
    loadProducts();

    return { loadProducts };
}
