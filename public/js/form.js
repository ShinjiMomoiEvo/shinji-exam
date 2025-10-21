// form.js
export function createProductForm(containerId, onProductAdded) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <span class="close-btn" id="closeFormBtn">&times;</span>
        <form id="productForm">
            <h2>Add New Product</h2>

            <label for="title">Title:</label>
            <input type="text" id="title" name="title" required>

            <label for="price">Price:</label>
            <input type="number" id="price" name="price" required step="0.01">

            <label for="description">Description:</label>
            <textarea id="description" name="description" required></textarea>

            <label for="category">Category:</label>
            <select id="category" name="category_id" required>
                <option value="">Select category</option>
            </select>

            <label for="images">Images:</label>
            <input type="file" id="images" name="images" accept="image/*" multiple required>
            <div id="image-preview" style="display:flex; gap:10px; margin-top:10px;"></div>

            <button type="submit">Add Product</button>
        </form>
    `;

    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('image-preview');
    const closeBtn = document.getElementById('closeFormBtn');
    const categorySelect = document.getElementById('category');

    // Fetch and populate categories
    fetch('/api/categories')
        .then(res => res.json())
        .then(categories => {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        })
        .catch(err => console.error('Error fetching categories:', err));

    // Show image previews
    imageInput.addEventListener('change', () => {
        imagePreview.innerHTML = '';
        Array.from(imageInput.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.border = '1px solid #ccc';
                img.style.borderRadius = '4px';
                imagePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // Handle form submission
    productForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', productForm.title.value);
        formData.append('price', productForm.price.value);
        formData.append('description', productForm.description.value);
        formData.append('category_id', productForm.category.value);

        Array.from(imageInput.files).forEach(file => {
            formData.append('images[]', file);
        });

        fetch('/api/products', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(newProduct => {
            console.log('Product added:', newProduct);

            // Refresh the product grid
            if (typeof onProductAdded === 'function') onProductAdded();

            // Reset the form fields and preview (do NOT hide formContainer)
            productForm.reset();
            imagePreview.innerHTML = '';
        })
        .catch(err => console.error('Error adding product:', err));
    });


    // Close modal when clicking the X button
    closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('formModal');
        if (modal) modal.style.display = 'none';
    });
}
