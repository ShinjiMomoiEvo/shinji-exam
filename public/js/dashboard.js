import { createProductForm } from './form.js';

export function initDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // --- STATE FOR INFINITE SCROLL ---
    let currentPage = 0;
    let isLoading = false;
    let hasMore = true;

    // --- BUILD LAYOUT ---
    let sidebar = document.createElement('aside');
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
    `;

    dashboard.appendChild(sidebar);
    dashboard.appendChild(main);

    // --- ELEMENTS ---
    const categoryList = document.getElementById('category-list');
    const productGrid = document.getElementById('product-grid');
    const addProductBtn = document.getElementById('add-product-btn');
    const searchBox = document.getElementById('search-box');

    let selectedCategory = null;
    let searchTerm = '';

    // --- SIDEBAR TOGGLE ---
    const hamburger = document.getElementById('hamburger');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar if clicking outside (on mobile/tablet)
    document.addEventListener('click', (e) => {
        const isClickOnHamburger = hamburger.contains(e.target);

        if (!isClickOnHamburger && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Reset page on filter/search
    function resetAndLoad() {
        currentPage = 0;
        hasMore = true;
        isLoading = false; // <-- Add this line
        loadProducts();
    }

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
                    resetAndLoad();
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
    const PAGE_SIZE = 20; // match backend default limit

    function loadProducts(append = false) {
        if (isLoading || !hasMore) return;
        isLoading = true;

        // Always clear grid if not appending
        if (!append) productGrid.innerHTML = '';

        const params = new URLSearchParams();
        params.append('limit', PAGE_SIZE);
        params.append('offset', currentPage * PAGE_SIZE);
        let url;
        if (searchTerm) {
            params.append('q', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);
            url = '/api/products/search';
        } else {
            if (selectedCategory) params.append('category', selectedCategory);
            url = '/api/products';
        }

        url += '?' + params.toString();

        // show loader
        let loader = document.getElementById('loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader';
            loader.textContent = 'Loading...';
            loader.style.textAlign = 'center';
            loader.style.padding = '1em';
            productGrid.appendChild(loader);
        }
        loader.style.display = 'block';

        fetch(url)
            .then(res => res.json())
            .then(products => {
                loader.style.display = 'none';
                // productGrid.innerHTML = ''; // <-- Already cleared above

                if (!products.length) {
                    hasMore = false;
                    if (!append) productGrid.innerHTML = '<p class="empty">No products found.</p>';
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

                currentPage++;
                isLoading = false;
            })
            .catch(err => {
                console.error('Error loading products:', err);
                loader.style.display = 'none';
                isLoading = false;
            });
    }


    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            loadProducts(true); // append next page
        }
    });

    // --- SEARCH LOGIC WITH DEBOUNCE ---
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
