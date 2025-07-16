// =======================================================
// 1. GLOBAL VARIABLES AND INITIAL SETUP
// =======================================================

let products = [];
let nextProductId = 1;
let cart = [];
let cashCounter = 0;
let salesHistory = [];

// Owner password (change this to something secure)
const OWNER_PASSWORD = "owner2024";

// Initialize jsPDF
const { jsPDF } = window.jspdf;

// =======================================================
// 2. GET REFERENCES TO HTML ELEMENTS
// =======================================================

// Product Management Section Elements
const addProductForm = document.getElementById('add-product-form');
const productNameInput = document.getElementById('product-name');
const singleBarcodeInput = document.getElementById('single-barcode');
const singlePriceInput = document.getElementById('single-price');
const bulkBarcodeInput = document.getElementById('bulk-barcode');
const bulkPriceInput = document.getElementById('bulk-price');
const bulkQuantityInput = document.getElementById('bulk-quantity');
const initialStockInput = document.getElementById('initial-stock');
const initialBoxesInput = document.getElementById('initial-boxes');
const productListDiv = document.getElementById('product-list');

// Stock Management Section Elements
const addStockForm = document.getElementById('add-stock-form');
const stockProductSelect = document.getElementById('stock-product-select');
const addSingleUnitsInput = document.getElementById('add-single-units');
const addBulkBoxesInput = document.getElementById('add-bulk-boxes');
const stockUpdateInfoDiv = document.getElementById('stock-update-info');

// Point of Sale (POS) System Section Elements
const barcodeInput = document.getElementById('barcode-input');
const posQuantityInput = document.getElementById('pos-quantity-input');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const cartItemsDiv = document.getElementById('cart-items');
const billTotalSpan = document.getElementById('bill-total');
const checkoutBtn = document.getElementById('checkout-btn');

// Inventory View Section Elements
const inventoryListDiv = document.getElementById('inventory-list');

// Cash Tracking Elements
const cashTotalSpan = document.getElementById('cash-total');
const viewSalesBtn = document.getElementById('view-sales-btn');
const resetCashBtn = document.getElementById('reset-cash-btn');
const salesHistoryDiv = document.getElementById('sales-history');

// Modal Elements
const allProductsModal = document.getElementById('all-products-modal');
const allProductsList = document.getElementById('all-products-list');
const closeModalBtn = document.querySelector('.close-modal');

// Message Box Element
const messageBox = createMessageBox();
document.body.appendChild(messageBox);

// =======================================================
// 3. HELPER FUNCTIONS
// =======================================================

function generateProductId() {
    const id = `prod_${String(nextProductId).padStart(3, '0')}`;
    nextProductId++;
    return id;
}

function createMessageBox() {
    const div = document.createElement('div');
    div.id = 'message-box';
    div.style.cssText = `
position: fixed;
top: 20px;
left: 50%;
transform: translateX(-50%);
background-color: #333;
color: white;
padding: 10px 20px;
border-radius: 5px;
z-index: 1000;
display: none;
opacity: 0;
transition: opacity 0.3s ease-in-out;
box-shadow: 0 4px 8px rgba(0,0,0,0.2);
`;
    return div;
}

function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    let bgColor = '#333';
    if (type === 'success') bgColor = '#4CAF50';
    else if (type === 'error') bgColor = '#f44336';
    else if (type === 'info') bgColor = '#2196F3';

    messageBox.style.backgroundColor = bgColor;
    messageBox.style.display = 'block';
    messageBox.offsetWidth;
    messageBox.style.opacity = '1';

    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.addEventListener('transitionend', function handler() {
            messageBox.style.display = 'none';
            messageBox.removeEventListener('transitionend', handler);
        }, { once: true });
    }, 3000);
}

function saveProductsToLocalStorage() {
    try {
        localStorage.setItem('stationeryShopProducts', JSON.stringify(products));
    } catch (e) {
        console.error('Error saving to Local Storage:', e);
        showMessage('Could not save data to browser storage.', 'error');
    }
}

function loadProductsFromLocalStorage() {
    try {
        const storedProducts = localStorage.getItem('stationeryShopProducts');
        if (storedProducts) {
            products = JSON.parse(storedProducts);
            const maxId = products.reduce((max, p) => {
                const idNum = parseInt(p.id.replace('prod_', ''));
                return idNum > max ? idNum : max;
            }, 0);
            nextProductId = maxId + 1;
        }
    } catch (e) {
        console.error('Error loading from Local Storage:', e);
        showMessage('Could not load data from browser storage.', 'error');
        products = [];
    }
}

function saveSalesData() {
    try {
        localStorage.setItem('stationeryShopCashCounter', cashCounter.toString());
        localStorage.setItem('stationeryShopSalesHistory', JSON.stringify(salesHistory));
    } catch (e) {
        console.error('Error saving sales data:', e);
    }
}

function loadSalesData() {
    try {
        const savedCash = localStorage.getItem('stationeryShopCashCounter');
        const savedSales = localStorage.getItem('stationeryShopSalesHistory');

        if (savedCash) cashCounter = parseFloat(savedCash) || 0;
        if (savedSales) salesHistory = JSON.parse(savedSales) || [];
    } catch (e) {
        console.error('Error loading sales data:', e);
    }
}

// Helper function to calculate boxes and singles
function calculateStockDisplay(product) {
    if (!product.bulkQuantity || product.bulkQuantity <= 0) {
        return {
            fullBoxes: 0,
            singleUnits: product.currentStock,
            displayText: product.currentStock === 0 ? 'Out of Stock' : `${product.currentStock} singles`
        };
    }

    const fullBoxes = Math.floor(product.currentStock / product.bulkQuantity);
    const singleUnits = product.currentStock % product.bulkQuantity;

    let displayText = '';
    if (product.currentStock === 0) {
        displayText = 'Out of Stock';
    } else if (fullBoxes > 0 && singleUnits > 0) {
        displayText = `${fullBoxes} box${fullBoxes > 1 ? 'es' : ''} + ${singleUnits} single${singleUnits > 1 ? 's' : ''}`;
    } else if (fullBoxes > 0) {
        displayText = `${fullBoxes} full box${fullBoxes > 1 ? 'es' : ''}`;
    } else {
        displayText = `${singleUnits} single${singleUnits > 1 ? 's' : ''}`;
    }

    return {
        fullBoxes: fullBoxes,
        singleUnits: singleUnits,
        displayText: displayText
    };
}

// Function to update product dropdown
function updateProductDropdown() {
    stockProductSelect.innerHTML = '<option value="">Select Product</option>';

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        const stockInfo = calculateStockDisplay(product);
        option.textContent = `${product.name} (Current: ${stockInfo.displayText})`;
        stockProductSelect.appendChild(option);
    });
}

// New function to validate barcode format
function isValidBarcode(barcode) {
    // Basic validation - at least 8 characters, alphanumeric
    return barcode.length >= 8 && /^[A-Z0-9]+$/.test(barcode);
}

// Generate barcode automatically
function generateBarcode(productName, type) {
    const nameCode = productName.substring(0, 4).toUpperCase().padEnd(4, 'X');
    const timeCode = Date.now().toString().slice(-4);
    const suffix = type === 'bulk' ? '00' : '11';
    return nameCode + timeCode + suffix;
}

// Check owner password
function checkOwnerPassword() {
    const password = prompt("Enter owner password:");
    return password === OWNER_PASSWORD;
}

// Search products
function searchProducts(searchTerm) {
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.singleBarcode.includes(term) ||
        (product.bulkBarcode && product.bulkBarcode.includes(term))
    );
}

// Generate daily report
function generateDailyReport() {
    const today = new Date().toDateString();
    const todaySales = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === today && !sale.isReturn
    );
    const todayReturns = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === today && sale.isReturn
    );

    const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalReturns = Math.abs(todayReturns.reduce((sum, sale) => sum + sale.total, 0));
    const netSales = totalSales - totalReturns;

    const report = {
        date: today,
        totalTransactions: todaySales.length,
        totalReturns: todayReturns.length,
        grossSales: totalSales,
        returns: totalReturns,
        netSales: netSales,
        items: {}
    };

    // Count items sold
    todaySales.forEach(sale => {
        sale.items.forEach(item => {
            const key = `${item.name}_${item.type}`;
            if (!report.items[key]) {
                report.items[key] = {
                    name: item.name,
                    type: item.type,
                    quantity: 0,
                    revenue: 0
                };
            }
            report.items[key].quantity += item.quantity;
            report.items[key].revenue += (item.type === 'single' ?
                item.singlePrice * item.quantity :
                item.bulkPrice * item.quantity);
        });
    });

    return report;
}

// Print receipt
function printReceipt(sale) {
    const receiptWindow = window.open('', '', 'width=300,height=600');
    const receiptContent = `
<html>
<head>
<title>Receipt</title>
<style>
    body { font-family: monospace; padding: 10px; }
    .header { text-align: center; margin-bottom: 10px; }
    .item { margin: 5px 0; }
    .total { font-weight: bold; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
</style>
</head>
<body>
<div class="header">
    <h3>STATIONERY SHOP</h3>
    <p>${new Date(sale.timestamp).toLocaleString()}</p>
    <p>Bill No: ${sale.id}</p>
</div>
<div class="items">
    ${sale.items.map(item => `
                    <div class="item">
                        ${item.name} (${item.type})<br>
                        Qty: ${item.quantity} x Rs.${item.type === 'single' ? item.singlePrice : item.bulkPrice} = Rs.${
    item.type === 'single' ?
        (item.singlePrice * item.quantity).toFixed(2) :
        (item.bulkPrice * item.quantity).toFixed(2)
}
                    </div>
                `).join('')}
</div>
<div class="total">
    TOTAL: Rs.${sale.total.toFixed(2)}
</div>
<div style="text-align: center; margin-top: 20px;">
    <p>Thank You!</p>
</div>
</body>
</html>
`;
    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
    receiptWindow.print();
}

// =======================================================
// 4. UI RENDERING FUNCTIONS
// =======================================================

function displayProducts() {
    productListDiv.innerHTML = '';

    if (products.length === 0) {
        productListDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No products added yet. Use the form above to add your first product.</p></div>';
        return;
    }

    // Show only the last 5 products (most recent first)
    const recentProducts = products.slice(-5).reverse();

    const ul = document.createElement('ul');
    recentProducts.forEach((product, index) => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');
        const stockClass = product.currentStock === 0 ? 'out-of-stock' :
            product.currentStock < 10 ? 'low-stock' : '';

        li.innerHTML = `
${index === 0 ? '<span class="recent-badge">NEW</span>' : ''}
<strong>${product.name}</strong> <span class="product-id">(ID: ${product.id})</span><br>
    Single: <code>${product.singleBarcode}</code> (Rs. ${product.singlePrice.toFixed(2)})<br>
    ${product.bulkBarcode ? `Bulk (${product.bulkQuantity} pcs): <code>${product.bulkBarcode}</code> (Rs. ${product.bulkPrice.toFixed(2)})<br>` : ''}
    Stock: <span class="stock-display ${stockClass}">${stockInfo.displayText}</span> <span class="stock-info">(Total: ${product.currentStock} units)</span><br>
    <button class="edit-product-btn" data-product-id="${product.id}">Edit</button>
    <button class="delete-product-btn" data-product-id="${product.id}">Delete</button>
    `;
    ul.appendChild(li);
    });
    productListDiv.appendChild(ul);

    // Always show "View All Products" button if there are products
    if (products.length > 0) {
    const viewAllBtn = document.createElement('button');
    viewAllBtn.textContent = `View All Products (${products.length} total)`;
    viewAllBtn.className = 'view-all-products-btn';
    viewAllBtn.addEventListener('click', showAllProducts);
    productListDiv.appendChild(viewAllBtn);
}

    // Add event listeners
    document.querySelectorAll('.delete-product-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const productIdToDelete = event.target.dataset.productId;
        deleteProduct(productIdToDelete);
    });
});

    document.querySelectorAll('.edit-product-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const productIdToEdit = event.target.dataset.productId;
        editProduct(productIdToEdit);
    });
});

    updateProductDropdown();
    }

    function showAllProducts() {
    allProductsList.innerHTML = '';

    if (products.length === 0) {
    allProductsList.innerHTML = '<p>No products to display.</p>';
    allProductsModal.style.display = 'block';
    return;
}

    // Add search functionality in modal
    const searchInput = document.getElementById('modal-search');
    const sortSelect = document.getElementById('modal-sort');

    let displayProducts = [...products];

    // Apply search if there's a search term
    if (searchInput && searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase();
    displayProducts = displayProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm) ||
    product.singleBarcode.includes(searchTerm) ||
    (product.bulkBarcode && product.bulkBarcode.includes(searchTerm))
    );
}

    // Apply sorting
    if (sortSelect && sortSelect.value) {
    switch(sortSelect.value) {
    case 'name':
    displayProducts.sort((a, b) => a.name.localeCompare(b.name));
    break;
    case 'stock':
    displayProducts.sort((a, b) => a.currentStock - b.currentStock);
    break;
    case 'recent':
    displayProducts.reverse();
    break;
}
}

    const ul = document.createElement('ul');
    displayProducts.forEach(product => {
    const stockInfo = calculateStockDisplay(product);
    const li = document.createElement('li');
    const stockClass = product.currentStock === 0 ? 'out-of-stock' :
    product.currentStock < 10 ? 'low-stock' : '';

    li.innerHTML = `
            <strong>${product.name}</strong> <span class="product-id">(ID: ${product.id})</span><br>
            Single: <code>${product.singleBarcode}</code> (Rs. ${product.singlePrice.toFixed(2)})<br>
            ${product.bulkBarcode ? `Bulk (${product.bulkQuantity} pcs): <code>${product.bulkBarcode}</code> (Rs. ${product.bulkPrice.toFixed(2)})<br>` : ''}
            Stock: <span class="stock-display ${stockClass}">${stockInfo.displayText}</span> <span class="stock-info">(Total: ${product.currentStock} units)</span><br>
            <button class="edit-product-btn-modal" data-product-id="${product.id}">Edit</button>
            <button class="delete-product-btn-modal" data-product-id="${product.id}">Delete</button>
        `;
    ul.appendChild(li);
});
    allProductsList.appendChild(ul);

    // Add event listeners for modal buttons
    document.querySelectorAll('.delete-product-btn-modal').forEach(button => {
    button.addEventListener('click', (event) => {
    const productIdToDelete = event.target.dataset.productId;
    deleteProduct(productIdToDelete);
    showAllProducts(); // Refresh the modal
});
});

    document.querySelectorAll('.edit-product-btn-modal').forEach(button => {
    button.addEventListener('click', (event) => {
    const productIdToEdit = event.target.dataset.productId;
    allProductsModal.style.display = 'none';
    editProduct(productIdToEdit);
});
});

    allProductsModal.style.display = 'block';
}

    function displayInventory() {
    inventoryListDiv.innerHTML = '';

    if (products.length === 0) {
    inventoryListDiv.innerHTML = '<p>No inventory to display. Add products first.</p>';
    return;
}

    // Add low stock alert at top
    const lowStockProducts = products.filter(p => p.currentStock > 0 && p.currentStock < 10);
    const outOfStockProducts = products.filter(p => p.currentStock === 0);

    if (outOfStockProducts.length > 0 || lowStockProducts.length > 0) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'stock-alert';
    alertDiv.innerHTML = `
            ${outOfStockProducts.length > 0 ? `<div class="alert-danger">⚠️ ${outOfStockProducts.length} product(s) OUT OF STOCK!</div>` : ''}
            ${lowStockProducts.length > 0 ? `<div class="alert-warning">⚠️ ${lowStockProducts.length} product(s) running LOW!</div>` : ''}
        `;
    inventoryListDiv.appendChild(alertDiv);
}

    const ul = document.createElement('ul');
    products.forEach(product => {
    const li = document.createElement('li');
    const stockInfo = calculateStockDisplay(product);

    let stockStatus = 'Good Stock';
    let stockColor = 'green';
    if (product.currentStock <= 0) {
    stockStatus = 'Out of Stock!';
    stockColor = 'red';
} else if (product.currentStock < 10) {
    stockStatus = 'Low Stock';
    stockColor = 'orange';
}

    li.innerHTML = `
            <strong>${product.name}:</strong>
            <span style="color: ${stockColor}; font-weight: bold;">${stockInfo.displayText}</span>
            <span class="stock-info">(Total: ${product.currentStock} units)</span>
            <span style="color: ${stockColor};">[${stockStatus}]</span>
        `;
    ul.appendChild(li);
});
    inventoryListDiv.appendChild(ul);
}

    function displayCart() {
    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p>Cart is empty.</p>';
} else {
    const ul = document.createElement('ul');
    cart.forEach((item, index) => {
    const li = document.createElement('li');
    let displayText = '';
    let itemTotal = 0;

    if (item.type === 'single') {
    displayText = `${item.name} (Single) x ${item.quantity}`;
    itemTotal = item.singlePrice * item.quantity;
} else if (item.type === 'bulk') {
    displayText = `${item.name} (Bulk Pack of ${item.bulkQuantity}) x ${item.quantity}`;
    itemTotal = item.bulkPrice * item.quantity;
}

    li.innerHTML = `
                ${displayText} - Rs. ${itemTotal.toFixed(2)}
                <button class="remove-from-cart-btn" data-index="${index}">Remove</button>
            `;
    ul.appendChild(li);
    total += itemTotal;
});
    cartItemsDiv.appendChild(ul);

    document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
    button.addEventListener('click', (event) => {
    const itemIndexToRemove = parseInt(event.target.dataset.index);
    removeItemFromCart(itemIndexToRemove);
});
});
}

    billTotalSpan.textContent = total.toFixed(2);
}

    function updateCashDisplay() {
    cashTotalSpan.textContent = cashCounter.toFixed(2);
}

    function displaySalesHistory() {
    salesHistoryDiv.innerHTML = '';

    if (salesHistory.length === 0) {
    salesHistoryDiv.innerHTML = '<p>No sales recorded yet.</p>';
    return;
}

    // Add summary at top
    const today = new Date().toDateString();
    const todaySales = salesHistory.filter(sale =>
    new Date(sale.timestamp).toDateString() === today && !sale.isReturn && !sale.isReplacement
    );
    const todayReturns = salesHistory.filter(sale =>
    new Date(sale.timestamp).toDateString() === today && sale.isReturn
    );
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0) -
    Math.abs(todayReturns.reduce((sum, sale) => sum + sale.total, 0));

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'sales-summary';
    summaryDiv.innerHTML = `
        <strong>Today's Sales:</strong> ${todaySales.length} transactions, Returns: ${todayReturns.length}, Net Total: Rs. ${todayTotal.toFixed(2)}<br>
        <strong>All Time:</strong> ${salesHistory.length} transactions, Total Cash: Rs. ${cashCounter.toFixed(2)}
    `;
    salesHistoryDiv.appendChild(summaryDiv);

    // Add daily report button
    const reportBtn = document.createElement('button');
    reportBtn.textContent = 'Generate Daily Report';
    reportBtn.style.marginTop = '10px';
    reportBtn.addEventListener('click', () => {
    const report = generateDailyReport();
    alert(`Daily Report for ${report.date}:\n
Sales: ${report.totalTransactions} transactions
Returns: ${report.totalReturns} transactions
Gross Sales: Rs. ${report.grossSales.toFixed(2)}
Returns: Rs. ${report.returns.toFixed(2)}
Net Sales: Rs. ${report.netSales.toFixed(2)}`);
});
    summaryDiv.appendChild(reportBtn);

    const sortedSales = [...salesHistory].reverse();

    sortedSales.forEach(sale => {
    const saleDiv = document.createElement('div');
    saleDiv.className = 'sale-item';

    const saleDate = new Date(sale.timestamp);
    const dateStr = saleDate.toLocaleDateString();
    const timeStr = saleDate.toLocaleTimeString();

    if (sale.isReplacement) {
    // Display replacement record
    saleDiv.innerHTML = `
                <div class="sale-item-header">Replacement ID: ${sale.id}</div>
                Date: ${dateStr} ${timeStr}<br>
                Returned: ${sale.oldProduct.name} x${sale.oldProduct.quantity}<br>
                Replaced with: ${sale.newProduct.name} x${sale.newProduct.quantity}<br>
                Price Difference: Rs. ${sale.priceDifference.toFixed(2)}
                <span class="return-label">REPLACEMENT</span>
            `;
} else {
    // Display normal sale or return
    let itemsHtml = '';
    sale.items.forEach(item => {
    let itemTotal = 0;
    let description = '';

    if (item.type === 'single') {
    itemTotal = item.singlePrice * item.quantity;
    description = `${item.name} (Single) x ${item.quantity}`;
} else {
    itemTotal = item.bulkPrice * item.quantity;
    description = `${item.name} (Bulk ${item.bulkQuantity} pcs) x ${item.quantity}`;
}

    itemsHtml += `${description} = Rs. ${itemTotal.toFixed(2)}<br>`;
});

    saleDiv.innerHTML = `
                <div class="sale-item-header">Sale ID: ${sale.id}</div>
                Date: ${dateStr} ${timeStr}<br>
                ${sale.billNo ? `Bill No: ${sale.billNo}<br>` : ''}
                Items:<br>
                ${itemsHtml}
                <strong>Total: Rs. ${Math.abs(sale.total).toFixed(2)}</strong>
                ${sale.isReturn ? `<span class="return-label">RETURN${sale.reason ? ' - ' + sale.reason : ''}</span>` : ''}
            `;
}

    salesHistoryDiv.appendChild(saleDiv);
});
}

    // =======================================================
    // 5. PRODUCT MANAGEMENT LOGIC
    // =======================================================

    function handleAddProduct(event) {
    event.preventDefault();

    const name = productNameInput.value.trim();
    const singleBarcode = singleBarcodeInput.value.trim().toUpperCase();
    const singlePrice = parseFloat(singlePriceInput.value);
    const bulkBarcode = bulkBarcodeInput.value.trim().toUpperCase() || null;
    const bulkPrice = parseFloat(bulkPriceInput.value) || null;
    const bulkQuantity = parseInt(bulkQuantityInput.value) || null;
    const initialStock = parseInt(initialStockInput.value) || 0;
    const initialBoxes = parseInt(initialBoxesInput.value) || 0;

    if (!name || !singleBarcode || isNaN(singlePrice) || singlePrice <= 0) {
    showMessage('Please fill in all required fields correctly.', 'error');
    return;
}

    // Validate barcode format
    if (!isValidBarcode(singleBarcode)) {
    showMessage('Single barcode must be at least 8 characters and alphanumeric!', 'error');
    return;
}

    if (bulkBarcode && !isValidBarcode(bulkBarcode)) {
    showMessage('Bulk barcode must be at least 8 characters and alphanumeric!', 'error');
    return;
}

    if (bulkBarcode && (isNaN(bulkPrice) || bulkPrice <= 0 || isNaN(bulkQuantity) || bulkQuantity <= 0)) {
    showMessage('If providing bulk details, all bulk fields must be valid.', 'error');
    return;
}

    // Check if barcodes are the same
    if (singleBarcode === bulkBarcode) {
    showMessage('Single and bulk barcodes must be different!', 'error');
    return;
}

    const isSingleBarcodeDuplicate = products.some(p => p.singleBarcode === singleBarcode || p.bulkBarcode === singleBarcode);
    const isBulkBarcodeDuplicate = bulkBarcode && products.some(p => p.singleBarcode === bulkBarcode || p.bulkBarcode === bulkBarcode);

    if (isSingleBarcodeDuplicate || isBulkBarcodeDuplicate) {
    showMessage('Barcode already exists. Please use unique barcodes.', 'error');
    return;
}

    // Calculate total stock from boxes + singles
    let totalInitialStock = initialStock;
    if (bulkQuantity && initialBoxes > 0) {
    totalInitialStock += (initialBoxes * bulkQuantity);
}

    const newProduct = {
    id: generateProductId(),
    name: name,
    singleBarcode: singleBarcode,
    singlePrice: singlePrice,
    bulkBarcode: bulkBarcode,
    bulkPrice: bulkPrice,
    bulkQuantity: bulkQuantity,
    currentStock: totalInitialStock
};

    products.push(newProduct);
    showMessage(`Product "${name}" added successfully!`, 'success');

    // Reset form and update button text
    addProductForm.reset();
    const submitBtn = addProductForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Product';

    displayProducts();
    displayInventory();
    saveProductsToLocalStorage();
}

    function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
    showMessage('Product not found.', 'error');
    return;
}

    const confirmDelete = window.confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmDelete) return;

    const initialLength = products.length;
    products = products.filter(p => p.id !== productId);

    if (products.length < initialLength) {
    showMessage('Product deleted successfully.', 'success');
    displayProducts();
    displayInventory();
    saveProductsToLocalStorage();
}
}

    // Function to edit products
    function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
    showMessage('Product not found.', 'error');
    return;
}

    // Store the current stock to preserve it
    const currentStock = product.currentStock;

    // Fill the form with existing values
    productNameInput.value = product.name;
    singleBarcodeInput.value = product.singleBarcode;
    singlePriceInput.value = product.singlePrice;
    bulkBarcodeInput.value = product.bulkBarcode || '';
    bulkPriceInput.value = product.bulkPrice || '';
    bulkQuantityInput.value = product.bulkQuantity || '';

    // Remove the product temporarily
    products = products.filter(p => p.id !== productId);

    // Update the form button text
    const submitBtn = addProductForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Product';

    // Store the current stock to restore it after update
    initialStockInput.value = currentStock;
    initialBoxesInput.value = 0;

    showMessage('Edit the product details and click Update.', 'info');

    // Scroll to form
    addProductForm.scrollIntoView({ behavior: 'smooth' });
}

    // =======================================================
    // 6. STOCK MANAGEMENT LOGIC
    // =======================================================

    function handleAddStock(event) {
    event.preventDefault();

    const selectedProductId = stockProductSelect.value;
    const addSingleUnits = parseInt(addSingleUnitsInput.value) || 0;
    const addBulkBoxes = parseInt(addBulkBoxesInput.value) || 0;

    if (!selectedProductId) {
    showMessage('Please select a product to add stock.', 'error');
    return;
}

    if (addSingleUnits === 0 && addBulkBoxes === 0) {
    showMessage('Please enter quantity to add (singles or boxes).', 'error');
    return;
}

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
    showMessage('Product not found.', 'error');
    return;
}

    const previousStock = product.currentStock;
    const previousStockInfo = calculateStockDisplay(product);

    // Calculate units to add
    let unitsToAdd = addSingleUnits;
    if (product.bulkQuantity && addBulkBoxes > 0) {
    unitsToAdd += (addBulkBoxes * product.bulkQuantity);
}

    // Update stock
    product.currentStock += unitsToAdd;

    const newStockInfo = calculateStockDisplay(product);

    // Show detailed update info
    let updateMessage = `Stock Updated for ${product.name}:<br>`;
    updateMessage += `Previous: ${previousStockInfo.displayText} (${previousStock} units)<br>`;
    updateMessage += `Added: `;

    const addedParts = [];
    if (addSingleUnits > 0) {
    addedParts.push(`${addSingleUnits} single${addSingleUnits > 1 ? 's' : ''}`);
}
    if (addBulkBoxes > 0) {
    addedParts.push(`${addBulkBoxes} box${addBulkBoxes > 1 ? 'es' : ''}`);
}
    updateMessage += addedParts.join(' + ');
    updateMessage += ` (${unitsToAdd} units)<br>`;
    updateMessage += `New Stock: ${newStockInfo.displayText} (${product.currentStock} units)`;

    stockUpdateInfoDiv.innerHTML = `<div class="stock-update-success">${updateMessage}</div>`;

    showMessage('Stock added successfully!', 'success');

    // Reset form
    addStockForm.reset();

    // Update displays
    displayProducts();
    displayInventory();
    saveProductsToLocalStorage();

    // Clear the update info after 5 seconds
    setTimeout(() => {
    stockUpdateInfoDiv.innerHTML = '';
}, 5000);
}

    // =======================================================
    // 7. POINT OF SALE (POS) LOGIC
    // =======================================================

    function handleAddToCart() {
    const scannedBarcode = barcodeInput.value.trim().toUpperCase();
    const quantity = parseInt(posQuantityInput.value) || 1;

    if (!scannedBarcode) {
    showMessage('Please enter or scan a barcode.', 'info');
    return;
}

    // Find the product by barcode
    const product = products.find(p =>
    p.singleBarcode === scannedBarcode || p.bulkBarcode === scannedBarcode
    );

    if (!product) {
    showMessage('Product not found for this barcode.', 'error');
    barcodeInput.value = '';
    return;
}

    let cartItem = null;

    // Check if it's a single item barcode
    if (scannedBarcode === product.singleBarcode) {
    // Check stock for single items
    if (product.currentStock < quantity) {
    showMessage(`Not enough stock! Only ${product.currentStock} units available.`, 'error');
    barcodeInput.value = '';
    return;
}

    cartItem = {
    productId: product.id,
    name: product.name,
    type: 'single',
    quantity: quantity,
    singlePrice: product.singlePrice,
    bulkPrice: null,
    bulkQuantity: null,
    barcode: scannedBarcode
};
}
    // Check if it's a bulk item barcode
    else if (scannedBarcode === product.bulkBarcode && product.bulkBarcode) {
    // Check stock for bulk items
    const unitsNeeded = product.bulkQuantity * quantity;
    if (product.currentStock < unitsNeeded) {
    const availableBoxes = Math.floor(product.currentStock / product.bulkQuantity);
    showMessage(`Not enough stock for ${quantity} bulk pack(s)! Only ${availableBoxes} box(es) available.`, 'error');
    barcodeInput.value = '';
    return;
}

    cartItem = {
    productId: product.id,
    name: product.name,
    type: 'bulk',
    quantity: quantity,
    singlePrice: product.singlePrice,
    bulkPrice: product.bulkPrice,
    bulkQuantity: product.bulkQuantity,
    barcode: scannedBarcode
};
}

    // Check if this exact item already exists in cart
    const existingIndex = cart.findIndex(item =>
    item.productId === cartItem.productId && item.type === cartItem.type
    );

    if (existingIndex > -1) {
    // Check if adding more would exceed stock
    const newQuantity = cart[existingIndex].quantity + cartItem.quantity;
    const unitsNeeded = cartItem.type === 'bulk' ?
    newQuantity * cartItem.bulkQuantity : newQuantity;

    if (product.currentStock < unitsNeeded) {
    showMessage('Adding this quantity would exceed available stock!', 'error');
    return;
}

    cart[existingIndex].quantity = newQuantity;
} else {
    cart.push(cartItem);
}

    const itemDescription = cartItem.type === 'bulk'
    ? `${cartItem.name} (Bulk Pack) x${quantity}`
    : `${cartItem.name} (Single) x${quantity}`;

    showMessage(`${itemDescription} added to cart!`, 'success');

    barcodeInput.value = '';
    posQuantityInput.value = '1';
    barcodeInput.focus();

    displayCart();
}

    function removeItemFromCart(index) {
    if (index >= 0 && index < cart.length) {
    const removedItem = cart.splice(index, 1);
    showMessage(`${removedItem[0].name} removed from cart.`, 'info');
    displayCart();
}
}

    function handleCheckout() {
    if (cart.length === 0) {
    showMessage('Cart is empty. Nothing to checkout.', 'info');
    return;
}

    const confirmCheckout = window.confirm('Confirm checkout? This will update stock and record the sale.');
    if (!confirmCheckout) return;

    try {
    let totalBill = 0;
    const saleItems = [];

    // First, verify all items have sufficient stock
    for (const cartItem of cart) {
    const product = products.find(p => p.id === cartItem.productId);
    if (!product) {
    throw new Error(`Product not found: ${cartItem.name}`);
}

    let unitsNeeded = 0;
    if (cartItem.type === 'single') {
    unitsNeeded = cartItem.quantity;
} else if (cartItem.type === 'bulk') {
    unitsNeeded = cartItem.bulkQuantity * cartItem.quantity;
}

    if (product.currentStock < unitsNeeded) {
    throw new Error(`Not enough stock for ${product.name}. Available: ${product.currentStock}, Required: ${unitsNeeded}`);
}
}

    // Process the sale
    cart.forEach(cartItem => {
    const product = products.find(p => p.id === cartItem.productId);
    if (product) {
    let unitsToDeduct = 0;
    let itemTotal = 0;

    if (cartItem.type === 'single') {
    unitsToDeduct = cartItem.quantity;
    itemTotal = cartItem.singlePrice * cartItem.quantity;
} else if (cartItem.type === 'bulk') {
    unitsToDeduct = cartItem.bulkQuantity * cartItem.quantity;
    itemTotal = cartItem.bulkPrice * cartItem.quantity;
}

    product.currentStock -= unitsToDeduct;
    totalBill += itemTotal;
    saleItems.push({...cartItem});
}
});

    // Record the sale
    const sale = {
    id: `sale_${Date.now()}`,
    timestamp: new Date().toISOString(),
    items: saleItems,
    total: totalBill,
    isReturn: false
};

    salesHistory.push(sale);
    cashCounter += totalBill;

    // Ask if customer wants receipt
    const wantReceipt = window.confirm(`Checkout successful! Total: Rs. ${totalBill.toFixed(2)}\n\nPrint receipt?`);
    if (wantReceipt) {
    printReceipt(sale);
}

    cart = [];
    displayCart();
    displayInventory();
    displayProducts();
    saveProductsToLocalStorage();
    saveSalesData();
    updateCashDisplay();
    updateProductDropdown();
    barcodeInput.focus();

} catch (error) {
    showMessage(error.message || 'Checkout failed!', 'error');
}
}

    // =======================================================
    // 8. NEW RETURN SYSTEM FUNCTIONS
    // =======================================================

    function setupReturnSystem() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update active states
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // Return form submission
    document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);

    // Replacement form submission
    document.getElementById('replacement-form').addEventListener('submit', handleReplacementSubmit);
}

    function handleReturnSubmit(event) {
    event.preventDefault();

    const billNo = document.getElementById('return-bill-no').value.trim();
    const barcode = document.getElementById('return-barcode').value.trim().toUpperCase();
    const quantity = parseInt(document.getElementById('return-quantity').value);
    const reason = document.getElementById('return-reason').value;

    const product = products.find(p =>
    p.singleBarcode === barcode || p.bulkBarcode === barcode
    );

    if (!product) {
    showReturnMessage('error', 'Product not found!');
    return;
}

    const isBulk = barcode === product.bulkBarcode;
    const returnAmount = isBulk ?
    product.bulkPrice * quantity :
    product.singlePrice * quantity;

    // Update stock
    const unitsToAdd = isBulk ? quantity * product.bulkQuantity : quantity;
    product.currentStock += unitsToAdd;

    // Update cash
    cashCounter -= returnAmount;

    // Record the return
    const returnRecord = {
    id: `return_${Date.now()}`,
    billNo: billNo || 'N/A',
    timestamp: new Date().toISOString(),
    items: [{
    productId: product.id,
    name: product.name,
    type: isBulk ? 'bulk' : 'single',
    quantity: quantity,
    singlePrice: product.singlePrice,
    bulkPrice: product.bulkPrice,
    bulkQuantity: product.bulkQuantity
}],
    total: -returnAmount,
    reason: reason,
    isReturn: true
};

    salesHistory.push(returnRecord);

    showReturnMessage('success', `Return processed successfully!<br>
        Product: ${product.name}<br>
        Quantity: ${quantity} ${isBulk ? 'box(es)' : 'unit(s)'}<br>
        Refund Amount: Rs. ${returnAmount.toFixed(2)}`);

    // Reset form
    document.getElementById('return-form').reset();

    // Update displays
    displayProducts();
    displayInventory();
    saveProductsToLocalStorage();
    saveSalesData();
    updateCashDisplay();
}

    function handleReplacementSubmit(event) {
    event.preventDefault();

    const oldBarcode = document.getElementById('old-product-barcode').value.trim().toUpperCase();
    const newBarcode = document.getElementById('new-product-barcode').value.trim().toUpperCase();
    const quantity = parseInt(document.getElementById('replacement-quantity').value);

    const oldProduct = products.find(p =>
    p.singleBarcode === oldBarcode || p.bulkBarcode === oldBarcode
    );

    const newProduct = products.find(p =>
    p.singleBarcode === newBarcode || p.bulkBarcode === newBarcode
    );

    if (!oldProduct || !newProduct) {
    showReplacementMessage('error', 'One or both products not found!');
    return;
}

    const oldIsBulk = oldBarcode === oldProduct.bulkBarcode;
    const newIsBulk = newBarcode === newProduct.bulkBarcode;

    // Check new product stock
    const newUnitsNeeded = newIsBulk ? quantity * newProduct.bulkQuantity : quantity;
    if (newProduct.currentStock < newUnitsNeeded) {
    showReplacementMessage('error', 'Not enough stock for replacement product!');
    return;
}

    // Process replacement
    const oldUnitsToAdd = oldIsBulk ? quantity * oldProduct.bulkQuantity : quantity;
    oldProduct.currentStock += oldUnitsToAdd;

    newProduct.currentStock -= newUnitsNeeded;

    // Calculate price difference
    const oldPrice = oldIsBulk ? oldProduct.bulkPrice * quantity : oldProduct.singlePrice * quantity;
    const newPrice = newIsBulk ? newProduct.bulkPrice * quantity : newProduct.singlePrice * quantity;
    const priceDiff = newPrice - oldPrice;

    // Update cash if there's a price difference
    cashCounter += priceDiff;

    // Record the replacement
    const replacementRecord = {
    id: `replace_${Date.now()}`,
    timestamp: new Date().toISOString(),
    oldProduct: {
    productId: oldProduct.id,
    name: oldProduct.name,
    type: oldIsBulk ? 'bulk' : 'single',
    quantity: quantity
},
    newProduct: {
    productId: newProduct.id,
    name: newProduct.name,
    type: newIsBulk ? 'bulk' : 'single',
    quantity: quantity
},
    priceDifference: priceDiff,
    isReplacement: true
};

    salesHistory.push(replacementRecord);

    let message = `Replacement processed successfully!<br>
        Returned: ${oldProduct.name} x${quantity}<br>
        Replaced with: ${newProduct.name} x${quantity}`;

    if (priceDiff > 0) {
    message += `<br>Additional payment: Rs. ${priceDiff.toFixed(2)}`;
} else if (priceDiff < 0) {
    message += `<br>Refund amount: Rs. ${Math.abs(priceDiff).toFixed(2)}`;
}

    showReplacementMessage('success', message);

    // Reset form
    document.getElementById('replacement-form').reset();

    // Update displays
    displayProducts();
    displayInventory();
    saveProductsToLocalStorage();
    saveSalesData();
    updateCashDisplay();
}

    function showReturnMessage(type, message) {
    const infoDiv = document.getElementById('return-info');
    infoDiv.className = type === 'success' ? 'return-success' : 'return-error';
    infoDiv.innerHTML = message;
    infoDiv.style.display = 'block';

    setTimeout(() => {
    infoDiv.style.display = 'none';
}, 5000);
}

    function showReplacementMessage(type, message) {
    const infoDiv = document.getElementById('replacement-info');
    infoDiv.className = type === 'success' ? 'return-success' : 'return-error';
    infoDiv.innerHTML = message;
    infoDiv.style.display = 'block';

    setTimeout(() => {
    infoDiv.style.display = 'none';
}, 5000);
}

    // =======================================================
    // 9. PDF EXPORT FUNCTION
    // =======================================================

    function exportPDF() {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.text('Stationery Shop Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Summary Section
    pdf.setFontSize(14);
    pdf.text('Summary', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const summary = [
    `Total Products: ${products.length}`,
    `Total Cash: Rs. ${cashCounter.toFixed(2)}`,
    `Total Sales: ${salesHistory.filter(s => !s.isReturn && !s.isReplacement).length}`,
    `Total Returns: ${salesHistory.filter(s => s.isReturn).length}`,
    `Total Replacements: ${salesHistory.filter(s => s.isReplacement).length}`,
    `Out of Stock Items: ${products.filter(p => p.currentStock === 0).length}`,
    `Low Stock Items: ${products.filter(p => p.currentStock > 0 && p.currentStock < 10).length}`
    ];

    summary.forEach(item => {
    pdf.text(item, 20, yPosition);
    yPosition += 6;
});

    // Add new page for inventory
    pdf.addPage();
    yPosition = 20;

    // Inventory Section
    pdf.setFontSize(14);
    pdf.text('Current Inventory', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(9);
    products.forEach(product => {
    if (yPosition > pageHeight - 30) {
    pdf.addPage();
    yPosition = 20;
}

    const stockInfo = calculateStockDisplay(product);
    pdf.text(`${product.name} - Stock: ${stockInfo.displayText}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`  Single: ${product.singleBarcode} @ Rs.${product.singlePrice}`, 25, yPosition);
    yPosition += 5;
    if (product.bulkBarcode) {
    pdf.text(`  Bulk: ${product.bulkBarcode} @ Rs.${product.bulkPrice} (${product.bulkQuantity} pcs)`, 25, yPosition);
    yPosition += 5;
}
    yPosition += 3;
});

    // Today's Sales
    const today = new Date().toDateString();
    const todaySales = salesHistory.filter(sale =>
    new Date(sale.timestamp).toDateString() === today && !sale.isReturn && !sale.isReplacement
    );

    if (todaySales.length > 0) {
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(14);
    pdf.text("Today's Sales", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(9);
    todaySales.forEach(sale => {
    if (yPosition > pageHeight - 30) {
    pdf.addPage();
    yPosition = 20;
}

    pdf.text(`Sale ID: ${sale.id} - Time: ${new Date(sale.timestamp).toLocaleTimeString()}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Total: Rs. ${sale.total.toFixed(2)}`, 25, yPosition);
    yPosition += 8;
});
}

    // Save the PDF
    pdf.save(`shop_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showMessage('PDF report generated successfully!', 'success');
}

    // =======================================================
    // 10. INVENTORY SEARCH FUNCTIONS
    // =======================================================

    function setupInventorySearch() {
    const searchInput = document.getElementById('inventory-search');
    const lowStockFilter = document.getElementById('low-stock-filter');
    let showLowStockOnly = false;

    searchInput.addEventListener('input', () => {
    filterInventory(searchInput.value, showLowStockOnly);
});

    lowStockFilter.addEventListener('click', () => {
    showLowStockOnly = !showLowStockOnly;
    lowStockFilter.textContent = showLowStockOnly ? 'Show All' : 'Show Low Stock Only';
    filterInventory(searchInput.value, showLowStockOnly);
});
}

    function filterInventory(searchTerm, lowStockOnly) {
    let filteredProducts = products;

    if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product =>
    product.name.toLowerCase().includes(term) ||
    product.singleBarcode.includes(term) ||
    (product.bulkBarcode && product.bulkBarcode.includes(term))
    );
}

    if (lowStockOnly) {
    filteredProducts = filteredProducts.filter(p => p.currentStock < 10);
}

    displayFilteredInventory(filteredProducts);
}

    function displayFilteredInventory(filteredProducts) {
    inventoryListDiv.innerHTML = '';

    if (filteredProducts.length === 0) {
    inventoryListDiv.innerHTML = '<div class="empty-state"><p>No products match your criteria.</p></div>';
    return;
}

    const ul = document.createElement('ul');
    filteredProducts.forEach(product => {
    const li = document.createElement('li');
    const stockInfo = calculateStockDisplay(product);

    let stockStatus = 'Good Stock';
    let stockColor = 'green';
    if (product.currentStock <= 0) {
    stockStatus = 'Out of Stock!';
    stockColor = 'red';
} else if (product.currentStock < 10) {
    stockStatus = 'Low Stock';
    stockColor = 'orange';
}

    li.innerHTML = `
            <strong>${product.name}:</strong>
            <span style="color: ${stockColor}; font-weight: bold;">${stockInfo.displayText}</span>
            <span class="stock-info">(Total: ${product.currentStock} units)</span>
            <span style="color: ${stockColor};">[${stockStatus}]</span>
        `;
    ul.appendChild(li);
});
    inventoryListDiv.appendChild(ul);
}

    // =======================================================
    // 11. ADDITIONAL UTILITY FUNCTIONS
    // =======================================================

    // Clear Cart Function
    function clearCart() {
    if (cart.length === 0) {
    showMessage('Cart is already empty.', 'info');
    return;
}

    const confirmClear = window.confirm('Are you sure you want to clear the cart?');
    if (confirmClear) {
    cart = [];
    displayCart();
    showMessage('Cart cleared successfully.', 'success');
}
}

    // =======================================================
    // 12. EVENT LISTENERS
    // =======================================================

    addProductForm.addEventListener('submit', handleAddProduct);
    addStockForm.addEventListener('submit', handleAddStock);
    addToCartBtn.addEventListener('click', handleAddToCart);

    barcodeInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
    event.preventDefault();
    handleAddToCart();
}
});

    // Allow quantity input to submit on Enter
    posQuantityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
    event.preventDefault();
    handleAddToCart();
}
});

    checkoutBtn.addEventListener('click', handleCheckout);

    viewSalesBtn.addEventListener('click', () => {
    if (salesHistoryDiv.style.display === 'none') {
    displaySalesHistory();
    salesHistoryDiv.style.display = 'block';
    viewSalesBtn.textContent = 'Hide Sales History';
} else {
    salesHistoryDiv.style.display = 'none';
    viewSalesBtn.textContent = 'View Sales History';
}
});

    resetCashBtn.addEventListener('click', () => {
    if (!checkOwnerPassword()) {
    showMessage('Incorrect password!', 'error');
    return;
}

    const confirmReset = window.confirm('Are you sure you want to reset the cash counter to 0? This will also clear sales history!');
    if (confirmReset) {
    cashCounter = 0;
    salesHistory = [];
    saveSalesData();
    updateCashDisplay();
    showMessage('Cash counter and sales history reset!', 'info');
}
});

    // Modal close button
    if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        allProductsModal.style.display = 'none';
    });
}

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
    if (event.target === allProductsModal) {
    allProductsModal.style.display = 'none';
}
});

    // Keyboard shortcut for quick barcode focus (Ctrl+B)
    document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'b') {
    event.preventDefault();
    barcodeInput.focus();
}
});

    // Modal search and sort functionality
    const modalSearch = document.getElementById('modal-search');
    const modalSort = document.getElementById('modal-sort');

    if (modalSearch) {
    modalSearch.addEventListener('input', showAllProducts);
}

    if (modalSort) {
    modalSort.addEventListener('change', showAllProducts);
}

    // =======================================================
    // 13. INITIALIZATION
    // =======================================================

    document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromLocalStorage();
    loadSalesData();
    displayProducts();
    displayInventory();
    displayCart();
    updateCashDisplay();

    // Setup new systems
    setupReturnSystem();
    setupInventorySearch();

    // Clear cart button
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
}

    // Export PDF button
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportPDF);
}
});