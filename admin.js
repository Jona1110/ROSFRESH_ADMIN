// panel_admin/admin.js
const API_URL = "https://script.google.com/macros/s/AKfycbzEWadNGyMnFZu_DZLAeRqn395nOcR-24DsEZxlXYmdlZpFhCG2BPY1U5JBgp64SLiFWw/exec"; 
const PASS = "1234"; 

let chartInstance = null;
let base64ImageString = "";
let cachedProducts = [];

document.getElementById('btnLogin').addEventListener('click', () => {
    const val = document.getElementById('adminPassword').value;
    if (val === PASS) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainDashboard').style.display = 'flex';
        initAdmin();
    } else {
        document.getElementById('loginError').textContent = "Contraseña incorrecta";
    }
});
document.getElementById('btnLogout').addEventListener('click', () => { location.reload(); });

document.querySelectorAll('.nav-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById(e.currentTarget.dataset.target).classList.add('active');
    });
});

function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}
function showLoader() { document.getElementById('adminLoader').style.display = 'flex'; }
function hideLoader() { document.getElementById('adminLoader').style.display = 'none'; }

function initAdmin() {
    loadFinanzas();
    loadProductos();
}

// --- CAPTURAR IMAGEN A BASE64 CON LECTURA SEGURA ---
document.getElementById('pImgFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            base64ImageString = uploadEvent.target.result; // Asigna correctamente la cadena Base64
        };
        reader.readAsDataURL(file);
    }
});

function openNewProductModal() {
    document.getElementById('prodForm').reset();
    document.getElementById('editProductId').value = "";
    document.getElementById('prodModalTitle').textContent = "Añadir al Menú";
    document.getElementById('btnSaveProd').textContent = "Publicar Producto";
    base64ImageString = ""; // Limpiar imagen previa
    document.getElementById('prodModal').style.display = 'flex';
}

function prepareEditProduct(id) {
    const prod = cachedProducts.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('editProductId').value = prod.id;
    document.getElementById('pNombre').value = prod.nombre;
    document.getElementById('pCat').value = prod.categoria;
    document.getElementById('pPrecio').value = prod.precio;
    document.getElementById('pDesc').value = prod.descripcion || "";
    base64ImageString = prod.imagen || ""; // Mantener la imagen existente si no se selecciona otra

    document.getElementById('prodModalTitle').textContent = "Editar Producto";
    document.getElementById('btnSaveProd').textContent = "Actualizar Cambios";
    document.getElementById('prodModal').style.display = 'flex';
}

// FINANZAS
document.getElementById('finForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    closeModals(); 
    showLoader();
    
    const data = {
        action: "addFinance",
        tipo: document.getElementById('fTipo').value,
        monto: document.getElementById('fMonto').value,
        detalle: document.getElementById('fDetalle').value
    };
    
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
        document.getElementById('finForm').reset();
        loadFinanzas();
    } catch (error) {
        alert("Error al guardar el movimiento. Intenta de nuevo.");
        hideLoader();
    }
});

async function loadFinanzas() {
    showLoader();
    try {
        const res = await fetch(`${API_URL}?action=getFinances`);
        const data = await res.json();
        
        const tb = document.getElementById('tbFinanzas');
        tb.innerHTML = "";
        let ing = 0, gas = 0;
        let chartData = { Ingreso: 0, Gasto: 0 };

        data.reverse().forEach(row => {
            const isIng = row.tipo === 'Ingreso';
            if (isIng) { ing += parseFloat(row.monto); chartData.Ingreso += parseFloat(row.monto); } 
            else { gas += parseFloat(row.monto); chartData.Gasto += parseFloat(row.monto); }
            
            const badgeClass = isIng ? 'badge-in' : 'badge-out';
            tb.innerHTML += `<tr>
                <td>${row.fecha ? row.fecha.split(',')[0] : ''}</td>
                <td>${row.detalle}</td>
                <td><span class="badge ${badgeClass}">${row.tipo}</span></td>
                <td>$${parseFloat(row.monto).toFixed(2)}</td>
                <td><button class="btn-danger" onclick="deleteRecord('deleteFinance', '${row.id}')"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        });

        document.getElementById('kpiIngresos').textContent = `$${ing.toFixed(2)}`;
        document.getElementById('kpiGastos').textContent = `$${gas.toFixed(2)}`;
        document.getElementById('kpiNeto').textContent = `$${(ing - gas).toFixed(2)}`;
        
        renderChart(chartData.Ingreso, chartData.Gasto);
    } catch (err) { 
        alert("Error cargando el historial."); 
    }
    hideLoader();
}

function renderChart(ingreso, gasto) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos Totales', 'Gastos Totales'],
            datasets: [{
                data: [ingreso, gasto],
                backgroundColor: ['#1bc5bd', '#f64e60'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// PRODUCTOS (CREAR Y EDITAR)
document.getElementById('prodForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    closeModals(); 
    showLoader();
    
    const id = document.getElementById('editProductId').value;
    const actionName = id ? "updateProduct" : "addProduct";

    const data = {
        action: actionName,
        id: id,
        nombre: document.getElementById('pNombre').value,
        categoria: document.getElementById('pCat').value,
        precio: document.getElementById('pPrecio').value,
        descripcion: document.getElementById('pDesc').value,
        imagen: base64ImageString // Envía la cadena Base64 procesada
    };
    
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
        document.getElementById('prodForm').reset();
        base64ImageString = "";
        loadProductos();
    } catch (error) {
        alert("Error al guardar el producto.");
        hideLoader();
    }
});

async function loadProductos() {
    showLoader();
    try {
        const res = await fetch(`${API_URL}?action=getProducts`);
        cachedProducts = await res.json();
        
        const tb = document.getElementById('tbProductos');
        tb.innerHTML = "";
        cachedProducts.reverse().forEach(row => {
            const imgPreview = row.imagen 
                ? `<img src="${row.imagen}" style="width:40px; height:40px; object-fit:cover; border-radius:8px;">` 
                : `<span style="color:#ccc; font-size:0.8rem;">Sin foto</span>`;

            tb.innerHTML += `<tr>
                <td>${imgPreview}</td>
                <td style="color:#a2a3b7; font-size:0.8rem;">${row.id.split('-')[1] || row.id}</td>
                <td><strong>${row.nombre}</strong><br><small style="color:#888">${row.descripcion || ''}</small></td>
                <td>${row.categoria}</td>
                <td>$${parseFloat(row.precio).toFixed(2)}</td>
                <td>
                    <button class="btn-primary" style="padding:6px 10px; font-size:0.85rem;" onclick="prepareEditProduct('${row.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="deleteRecord('deleteProduct', '${row.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (err) { 
        alert("Error cargando el catálogo."); 
    }
    hideLoader();
}

async function deleteRecord(actionName, id) {
    if(!confirm("¿Estás seguro de eliminar este registro?")) return;
    
    showLoader();
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: actionName, id: id })
        });
        if(actionName === 'deleteFinance') loadFinanzas();
        else loadProductos();
    } catch (err) { 
        alert("Error al eliminar."); 
        hideLoader(); 
    }
}
