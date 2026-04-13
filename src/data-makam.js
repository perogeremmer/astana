// Data Makam - CRUD JavaScript for Graves and Heirs
// Integrates with Tauri backend

// Global state
let currentGraves = [];
let currentBlocks = [];
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 30;
let currentEditingId = null;
let currentDeletingId = null;
let currentDeletingName = '';

// Variables for Add Modal
let jumlahAhliWaris = 1;
const maxAhliWaris = 3;

// Variables for Edit Modal
let jumlahAhliWarisEdit = 1;

// View Mode State
const STORAGE_KEY_VIEW_MODE = 'astana_view_mode';
let currentViewMode = 'classic'; // 'classic' or 'modern'

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing...');
    
    // Initialize view mode first
    initViewMode();
    
    await loadBlocks();
    await loadGraves();
    setupEventListeners();
    setupTableActionListeners();
    setupClassicFormListeners();
    
    // Setup MutationObserver to watch for corruption of classicTipeMakam options
    const classicTipeMakam = document.getElementById('classicTipeMakam');
    if (classicTipeMakam) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const options = Array.from(classicTipeMakam.options);
                    const hasNewOption = options.some(opt => opt.value === 'new');
                    const hasStackedOption = options.some(opt => opt.value === 'stacked');
                    
                    if (!hasNewOption || !hasStackedOption) {
                        console.error('MutationObserver: classicTipeMakam corrupted! Resetting options...');
                        classicTipeMakam.innerHTML = `
                            <option value="">Pilih Tipe</option>
                            <option value="new">Makam Baru</option>
                            <option value="stacked">Makam Tumpuk</option>
                        `;
                    }
                }
            });
        });
        
        observer.observe(classicTipeMakam, { childList: true });
        console.log('MutationObserver setup for classicTipeMakam');
    }
});

function initViewMode() {
    // Load from localStorage, default to 'classic'
    const savedMode = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    currentViewMode = savedMode === 'modern' ? 'modern' : 'classic';
    console.log('View mode initialized:', currentViewMode);
    applyViewMode();
}

function applyViewMode() {
    const classicContainer = document.getElementById('classicFormContainer');
    const btnTambahData = document.getElementById('btnTambahData');
    const iconClassic = document.getElementById('iconClassic');
    const iconModern = document.getElementById('iconModern');
    const labelToggle = document.getElementById('labelToggleView');
    
    if (currentViewMode === 'classic') {
        // Show classic form, hide tambah data button
        if (classicContainer) classicContainer.classList.remove('hidden');
        if (btnTambahData) btnTambahData.classList.add('hidden');
        if (iconClassic) iconClassic.classList.remove('hidden');
        if (iconModern) iconModern.classList.add('hidden');
        if (labelToggle) labelToggle.textContent = 'Mode Klasik';
    } else {
        // Hide classic form, show tambah data button
        if (classicContainer) classicContainer.classList.add('hidden');
        if (btnTambahData) btnTambahData.classList.remove('hidden');
        if (iconClassic) iconClassic.classList.add('hidden');
        if (iconModern) iconModern.classList.remove('hidden');
        if (labelToggle) labelToggle.textContent = 'Mode Modern';
    }
}

function toggleViewMode() {
    currentViewMode = currentViewMode === 'classic' ? 'modern' : 'classic';
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, currentViewMode);
    console.log('View mode toggled to:', currentViewMode);
    applyViewMode();
    
    // If switching to classic mode, reset the form
    if (currentViewMode === 'classic') {
        resetClassicForm();
    }
}

function setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            currentPage = 1;
            await loadGraves(e.target.value);
        }, 300));
    }

    // Block filter
    const blockSelect = document.getElementById('filterBlockSelect');
    if (blockSelect) {
        blockSelect.addEventListener('change', async () => {
            currentPage = 1;
            await loadGraves();
        });
    }
    
    // Export modal year selectors
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    
    if (startYearSelect) {
        startYearSelect.addEventListener('change', updateYearPreview);
    }
    
    if (endYearSelect) {
        endYearSelect.addEventListener('change', updateYearPreview);
    }
    
    // Sort field and order dropdowns
    const sortField = document.getElementById('sortField');
    const sortOrder = document.getElementById('sortOrder');
    
    if (sortField) {
        sortField.addEventListener('change', () => {
            currentPage = 1;
            loadGraves();
        });
    }
    
    if (sortOrder) {
        sortOrder.addEventListener('change', () => {
            currentPage = 1;
            loadGraves();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Export button
    const exportBtn = document.getElementById('btnExportExcel');
    if (exportBtn) {
        exportBtn.addEventListener('click', openExportExcelModal);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', handleImport);
    }
    
    // Toggle View Mode button
    const btnToggleView = document.getElementById('btnToggleView');
    if (btnToggleView) {
        btnToggleView.addEventListener('click', toggleViewMode);
    }
    
    // Tambah Data button (only for modern mode)
    const btnTambahData = document.getElementById('btnTambahData');
    if (btnTambahData) {
        btnTambahData.addEventListener('click', openModal);
    }

    // Modal Tambah - Ahli Waris buttons
    const btnTambahWaris = document.getElementById('btnTambahWaris');
    const btnHapusWaris = document.getElementById('btnHapusWaris');
    const btnSimpanData = document.getElementById('btnSimpanData');

    if (btnTambahWaris) {
        btnTambahWaris.addEventListener('click', tambahAhliWaris);
    }
    if (btnHapusWaris) {
        btnHapusWaris.addEventListener('click', hapusAhliWarisTerakhir);
    }
    if (btnSimpanData) {
        btnSimpanData.addEventListener('click', simpanData);
    }

    // Modal Edit - Ahli Waris buttons
    const btnTambahWarisEdit = document.getElementById('btnTambahWarisEdit');
    const btnHapusWarisEdit = document.getElementById('btnHapusWarisEdit');
    const btnSimpanEdit = document.getElementById('btnSimpanEdit');

    if (btnTambahWarisEdit) {
        btnTambahWarisEdit.addEventListener('click', tambahAhliWarisEdit);
    }
    if (btnHapusWarisEdit) {
        btnHapusWarisEdit.addEventListener('click', hapusAhliWarisTerakhirEdit);
    }
    if (btnSimpanEdit) {
        btnSimpanEdit.addEventListener('click', simpanEdit);
    }

    // Delete confirmation button
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', confirmDelete);
    }

    // Modal backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                const modalId = backdrop.dataset.modal;
                if (modalId) {
                    closeModalById(modalId);
                }
            }
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) {
                closeModalById(modalId);
            }
        });
    });

    // Quick select buttons for export range
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const range = btn.dataset.range;
            setExportRange(range);
        });
    });
    
    // Confirm export button
    const btnConfirmExport = document.getElementById('btnConfirmExportExcel');
    if (btnConfirmExport) {
        btnConfirmExport.addEventListener('click', confirmExportExcel);
    }
    
    // Close success modal
    const btnCloseSukses = document.getElementById('btnCloseSuksesModal');
    if (btnCloseSukses) {
        btnCloseSukses.addEventListener('click', closeSuksesModal);
    }
}

function setupClassicFormListeners() {
    // Classic form buttons
    const btnClassicSimpan = document.getElementById('btnClassicSimpan');
    const btnClassicReset = document.getElementById('btnClassicReset');
    
    if (btnClassicSimpan) {
        btnClassicSimpan.addEventListener('click', handleClassicFormSubmit);
    }
    
    if (btnClassicReset) {
        btnClassicReset.addEventListener('click', resetClassicForm);
    }
}

function closeModalById(modalId) {
    console.log('Closing modal:', modalId);
    switch(modalId) {
        case 'inputModal':
            closeModal();
            break;
        case 'editModal':
            closeEditModal();
            break;
        case 'deleteModal':
            closeDeleteModal();
            break;
        case 'detailModal':
            closeDetailModal();
            break;
        case 'exportExcelModal':
            closeExportExcelModal();
            break;
        case 'modalSukses':
            closeSuksesModal();
            break;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== CLASSIC FORM FUNCTIONS ====================

function populateClassicBlockSelect() {
    // STRICT CHECK: Only populate classicBlockSelect, NEVER touch classicTipeMakam
    const blockSelect = document.getElementById('classicBlockSelect');
    
    console.log('=== populateClassicBlockSelect ===');
    console.log('blockSelect found:', !!blockSelect);
    
    if (!blockSelect) {
        console.error('ERROR: classicBlockSelect not found!');
        return;
    }
    
    // Verify we have the correct element by ID
    if (blockSelect.id !== 'classicBlockSelect') {
        console.error('ERROR: Wrong element! Expected classicBlockSelect, got:', blockSelect.id);
        return;
    }
    
    console.log('Populating classicBlockSelect with', currentBlocks.length, 'blocks');
    
    // Clear and populate ONLY the blockSelect
    blockSelect.innerHTML = '<option value="">Pilih Blok</option>';
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        blockSelect.appendChild(option);
    });
    
    console.log('SUCCESS: classicBlockSelect populated');
    
    // Schedule a check after a short delay to catch any async corruption
    setTimeout(() => {
        const tipeSelect = document.getElementById('classicTipeMakam');
        if (tipeSelect) {
            const hasNewOption = Array.from(tipeSelect.options).some(opt => opt.value === 'new');
            const hasStackedOption = Array.from(tipeSelect.options).some(opt => opt.value === 'stacked');
            
            if (!hasNewOption || !hasStackedOption) {
                console.error('DELAYED CHECK: tipeSelect corrupted! Fixing...');
                tipeSelect.innerHTML = `
                    <option value="">Pilih Tipe</option>
                    <option value="new">Makam Baru</option>
                    <option value="stacked">Makam Tumpuk</option>
                `;
            }
        }
    }, 100);
}

function resetClassicForm() {
    console.log('Resetting classic form...');
    
    // Reset hidden edit ID
    const editIdInput = document.getElementById('classicEditId');
    if (editIdInput) editIdInput.value = '';
    
    // Reset form title
    const formTitle = document.getElementById('classicFormTitle');
    if (formTitle) formTitle.textContent = 'Tambah Data Makam';
    
    // Reset tombol simpan
    const btnSimpan = document.getElementById('btnClassicSimpan');
    if (btnSimpan) btnSimpan.textContent = 'Simpan Data';
    
    // Reset fields - STRICT ID CHECK
    const fieldIds = [
        'classicNama', 
        'classicBlockSelect', 
        'classicNomor', 
        'classicTanggal', 
        'classicTipeMakam', 
        'classicTempatLahir', 
        'classicTanggalLahir', 
        'classicKeterangan',
        'classicInitialFeeAmount',
        'classicInitialFeePaymentDate',
        'classicInitialFeePaymentMethod'
    ];
    
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            console.log(`Resetting ${fieldId}:`, field.id);
            if (fieldId === 'classicInitialFeeAmount') {
                field.value = '0';
            } else {
                field.value = '';
            }
        } else {
            console.warn(`Field ${fieldId} not found`);
        }
    });

    // Reset file input
    const proofInput = document.getElementById('classicInitialFeePaymentProof');
    if (proofInput) proofInput.value = '';
    
    // Reset ahli waris fields
    const containers = document.querySelectorAll('#classicAhliWarisContainer > div');
    containers.forEach((container, index) => {
        const namaInput = container.querySelector('.classic-heir-nama');
        const telpInput = container.querySelector('.classic-heir-telp');
        const hubunganSelect = container.querySelector('.classic-heir-hubungan');
        const alamatTextarea = container.querySelector('.classic-heir-alamat');
        
        if (namaInput) namaInput.value = '';
        if (telpInput) telpInput.value = '';
        if (hubunganSelect) hubunganSelect.value = '';
        if (alamatTextarea) alamatTextarea.value = '';
    });
    
    // Force restore tipe makam options in case they got corrupted
    const tipeSelect = document.getElementById('classicTipeMakam');
    if (tipeSelect) {
        console.log('Force restoring tipe makam options');
        tipeSelect.innerHTML = `
            <option value="">Pilih Tipe</option>
            <option value="new">Makam Baru</option>
            <option value="stacked">Makam Tumpuk</option>
        `;
    }
    
    currentEditingId = null;
}

function populateClassicForm(grave, heirs) {
    console.log('Populating classic form with:', grave, heirs);
    
    // Set edit ID
    const editIdInput = document.getElementById('classicEditId');
    if (editIdInput) editIdInput.value = grave.id;
    
    // Update form title
    const formTitle = document.getElementById('classicFormTitle');
    if (formTitle) formTitle.textContent = 'Edit Data Makam';
    
    // Update tombol simpan
    const btnSimpan = document.getElementById('btnClassicSimpan');
    if (btnSimpan) btnSimpan.textContent = 'Update Data';
    
    // Populate fields with strict ID verification
    const fieldMap = {
        'classicNama': grave.deceased_name,
        'classicBlockSelect': grave.block_id,
        'classicNomor': grave.number,
        'classicTanggal': grave.date_of_death,
        'classicTipeMakam': grave.grave_type,
        'classicTempatLahir': grave.birth_place,
        'classicTanggalLahir': grave.birth_date,
        'classicKeterangan': grave.notes,
        'classicInitialFeeAmount': grave.initial_fee_amount !== undefined && grave.initial_fee_amount !== null ? grave.initial_fee_amount : '0',
        'classicInitialFeePaymentDate': grave.initial_fee_payment_date,
        'classicInitialFeePaymentMethod': grave.initial_fee_payment_method
    };
    
    Object.entries(fieldMap).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) {
            console.log(`Setting ${fieldId} = ${value}`);
            field.value = value || '';
        }
    });
    
    // Verify tipe makam still has correct options
    const tipeSelect = document.getElementById('classicTipeMakam');
    if (tipeSelect) {
        const hasNewOption = Array.from(tipeSelect.options).some(opt => opt.value === 'new');
        const hasStackedOption = Array.from(tipeSelect.options).some(opt => opt.value === 'stacked');
        
        if (!hasNewOption || !hasStackedOption) {
            console.error('ERROR: Tipe Makam options corrupted! Restoring...');
            tipeSelect.innerHTML = `
                <option value="">Pilih Tipe</option>
                <option value="new">Makam Baru</option>
                <option value="stacked">Makam Tumpuk</option>
            `;
            // Re-set the value
            tipeSelect.value = grave.grave_type || '';
        }
    }
    
    // Populate ahli waris
    if (heirs && heirs.length > 0) {
        const containers = document.querySelectorAll('#classicAhliWarisContainer > div');
        
        heirs.forEach((heir, index) => {
            if (index < containers.length) {
                const container = containers[index];
                const namaInput = container.querySelector('.classic-heir-nama');
                const telpInput = container.querySelector('.classic-heir-telp');
                const hubunganSelect = container.querySelector('.classic-heir-hubungan');
                const alamatTextarea = container.querySelector('.classic-heir-alamat');
                
                if (namaInput) namaInput.value = heir.full_name || '';
                if (telpInput) telpInput.value = heir.phone_number || '';
                if (hubunganSelect) hubunganSelect.value = heir.relationship || '';
                if (alamatTextarea) alamatTextarea.value = heir.address || '';
            }
        });
    }
}

function scrollToClassicForm() {
    const classicContainer = document.getElementById('classicFormContainer');
    if (classicContainer) {
        classicContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function collectClassicFormData() {
    const initialFeeAmountRaw = document.getElementById('classicInitialFeeAmount')?.value;
    const data = {
        deceased_name: document.getElementById('classicNama')?.value?.trim(),
        block_id: parseInt(document.getElementById('classicBlockSelect')?.value),
        number: document.getElementById('classicNomor')?.value?.trim(),
        date_of_death: document.getElementById('classicTanggal')?.value,
        grave_type: document.getElementById('classicTipeMakam')?.value,
        birth_place: document.getElementById('classicTempatLahir')?.value?.trim() || null,
        birth_date: document.getElementById('classicTanggalLahir')?.value || null,
        notes: document.getElementById('classicKeterangan')?.value?.trim() || null,
        initial_fee_amount: initialFeeAmountRaw ? parseInt(initialFeeAmountRaw) : 0,
        initial_fee_payment_date: document.getElementById('classicInitialFeePaymentDate')?.value || null,
        initial_fee_payment_method: document.getElementById('classicInitialFeePaymentMethod')?.value || null,
        initial_fee_payment_proof: null,
        heirs: []
    };
    
    // Collect ahli waris
    const containers = document.querySelectorAll('#classicAhliWarisContainer > div');
    containers.forEach((container, index) => {
        const namaInput = container.querySelector('.classic-heir-nama');
        const telpInput = container.querySelector('.classic-heir-telp');
        const hubunganSelect = container.querySelector('.classic-heir-hubungan');
        const alamatTextarea = container.querySelector('.classic-heir-alamat');
        
        const nama = namaInput?.value?.trim();
        
        if (nama || index === 0) { // Include if has name or is first (required)
            data.heirs.push({
                grave_id: 0,  // Will be set by backend
                order_number: index + 1,
                full_name: nama || '',
                phone_number: telpInput?.value?.trim() || null,
                relationship: hubunganSelect?.value || null,
                address: alamatTextarea?.value?.trim() || null,
                is_primary: index === 0
            });
        }
    });
    
    return data;
}

async function handleClassicFormSubmit() {
    try {
        const data = collectClassicFormData();
        const editId = document.getElementById('classicEditId')?.value;
        
        // Validation
        if (!data.deceased_name) {
            showToast('Nama almarhum wajib diisi', 'error');
            return;
        }
        if (!data.block_id) {
            showToast('Blok makam wajib dipilih', 'error');
            return;
        }
        if (!data.number) {
            showToast('Nomor makam wajib diisi', 'error');
            return;
        }
        // Note: date_of_death (tanggal dimakamkan) is now optional
        if (!data.grave_type) {
            showToast('Tipe makam wajib dipilih', 'error');
            return;
        }
        if (data.initial_fee_amount === null || data.initial_fee_amount === undefined || isNaN(data.initial_fee_amount) || data.initial_fee_amount < 0) {
            showToast('Jumlah bayar biaya makam awal wajib diisi', 'error');
            return;
        }
        if (data.heirs.length === 0 || !data.heirs[0].full_name) {
            showToast('Ahli waris pertama wajib diisi', 'error');
            return;
        }
        
        showLoading(true);

        // Handle payment proof upload
        const proofInput = document.getElementById('classicInitialFeePaymentProof');
        let proofPath = null;
        if (editId) {
            // Get existing proof path to keep if no new file selected
            const detail = await window.__TAURI__?.core?.invoke('get_grave_by_id', { id: parseInt(editId) });
            if (detail && detail.initial_fee_payment_proof && (!proofInput || !proofInput.files || proofInput.files.length === 0)) {
                proofPath = detail.initial_fee_payment_proof;
            }
        }
        if (proofInput && proofInput.files && proofInput.files.length > 0) {
            proofPath = await uploadPaymentProofFile(proofInput);
        }
        data.initial_fee_payment_proof = proofPath;
        
        if (editId) {
            // Update existing
            console.log('Updating grave via classic form:', editId, data);
            
            const token = window.astanaApp?.getSessionToken?.() || localStorage.getItem('astana_session_token');
            
            await window.__TAURI__?.core?.invoke('update_grave', {
                token: token,
                id: parseInt(editId),
                grave: {
                    deceased_name: data.deceased_name,
                    block_id: data.block_id,
                    number: data.number,
                    date_of_death: data.date_of_death,
                    birth_place: data.birth_place,
                    birth_date: data.birth_date,
                    burial_date: null,
                    notes: data.notes,
                    grave_type: data.grave_type,
                    initial_fee_amount: data.initial_fee_amount,
                    initial_fee_payment_date: data.initial_fee_payment_date,
                    initial_fee_payment_method: data.initial_fee_payment_method,
                    initial_fee_payment_proof: data.initial_fee_payment_proof
                }
            });
            
            // Delete existing heirs and create new ones
            await window.__TAURI__?.core?.invoke('delete_heirs_by_grave', { graveId: parseInt(editId) });
            
            for (const heir of data.heirs) {
                if (heir.full_name) {
                    await window.__TAURI__?.core?.invoke('create_heir', {
                        heir: {
                            ...heir,
                            grave_id: parseInt(editId)
                        }
                    });
                }
            }
            
            showToast('Data makam berhasil diperbarui', 'success');
        } else {
            // Create new
            console.log('Creating new grave via classic form:', data);
            console.log('Block ID:', data.block_id, 'Number:', data.number);
            
            // Check for duplicate before creating (only for 'new' graves, not 'stacked')
            if (data.grave_type === 'new') {
                const existingGraves = currentGraves.filter(g => 
                    g.block_id === data.block_id && g.number === data.number && g.grave_type === 'new'
                );
                if (existingGraves.length > 0) {
                    showToast(`Makam Baru dengan Blok ${data.block_id} Nomor ${data.number} sudah ada! Gunakan tipe Makam Tumpuk jika ingin menambahkan ke lokasi yang sama.`, 'error');
                    return;
                }
            }
            
            const token = window.astanaApp?.getSessionToken?.() || localStorage.getItem('astana_session_token');
            const requestPayload = {
                grave: {
                    deceased_name: data.deceased_name,
                    block_id: data.block_id,
                    number: data.number,
                    date_of_death: data.date_of_death,
                    birth_place: data.birth_place,
                    birth_date: data.birth_date,
                    burial_date: null,
                    notes: data.notes,
                    grave_type: data.grave_type,
                    initial_fee_amount: data.initial_fee_amount,
                    initial_fee_payment_date: data.initial_fee_payment_date,
                    initial_fee_payment_method: data.initial_fee_payment_method,
                    initial_fee_payment_proof: data.initial_fee_payment_proof
                },
                heirs: data.heirs
            };
            console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
            await window.__TAURI__?.core?.invoke('create_grave_with_heirs', { 
                token: token,
                request: requestPayload 
            });
            showToast('Data makam berhasil disimpan', 'success');
        }

        // Reset form and refresh table
        resetClassicForm();
        await loadGraves();
        
    } catch (error) {
        console.error('Failed to save via classic form:', error);
        // Better error message for duplicate constraint
        let errorMsg = error.toString();
        if (errorMsg.includes('UNIQUE constraint failed')) {
            errorMsg = 'Makam dengan Blok dan Nomor tersebut sudah ada di database!';
        }
        showToast('Gagal menyimpan data: ' + errorMsg, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== DATA LOADING ====================

async function handleLogout() {
    try {
        if (window.__TAURI__) {
            await window.__TAURI__.core.invoke('logout');
        }
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login.html';
    }
}

async function loadBlocks() {
    try {
        console.log('Loading blocks...');
        currentBlocks = await window.__TAURI__?.core?.invoke('get_blocks');
        console.log('Blocks loaded:', currentBlocks.length);
        populateBlockFilter();
        populateTambahBlockSelect();
        populateEditBlockSelect();
        populateClassicBlockSelect(); // Also populate classic form
    } catch (error) {
        console.error('Failed to load blocks:', error);
        showToast('Gagal memuat data blok', 'error');
    }
}

function populateBlockFilter() {
    const blockSelect = document.getElementById('filterBlockSelect');
    if (!blockSelect) return;
    
    const currentValue = blockSelect.value;
    
    while (blockSelect.options.length > 1) {
        blockSelect.remove(1);
    }
    
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        blockSelect.appendChild(option);
    });
    
    blockSelect.value = currentValue;
}

function populateTambahBlockSelect() {
    const blockSelect = document.getElementById('tambahBlockSelect');
    if (!blockSelect) return;
    
    blockSelect.innerHTML = '<option value="">Pilih Blok</option>';
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        blockSelect.appendChild(option);
    });
}

function populateEditBlockSelect(selectedBlockId = null) {
    const blockSelect = document.getElementById('editBlockSelect');
    if (!blockSelect) return;
    
    blockSelect.innerHTML = '<option value="">Pilih Blok</option>';
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        if (selectedBlockId && block.id === selectedBlockId) {
            option.selected = true;
        }
        blockSelect.appendChild(option);
    });
}

async function loadGraves(search = null) {
    try {
        // If no search provided, read from current search input
        if (search === null) {
            const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
            search = searchInput ? searchInput.value : '';
        }
        console.log('Loading graves... Search:', search);
        showLoading(true);
        
        const blockSelect = document.getElementById('filterBlockSelect');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const offset = (currentPage - 1) * itemsPerPage;
        
        const sortField = document.getElementById('sortField')?.value || 'nama';
        const sortOrder = document.getElementById('sortOrder')?.value || 'asc';
        
        console.log('Fetching graves with params:', { search, blockId, limit: itemsPerPage, offset, sortField, sortOrder });
        
        const graves = await window.__TAURI__?.core?.invoke('get_graves', {
            search: search || null,
            blockId: blockId,
            limit: itemsPerPage,
            offset: offset,
            sortField: sortField,
            sortOrder: sortOrder
        });
        
        console.log('Graves loaded:', graves.length, graves);
        
        const totalCount = await window.__TAURI__?.core?.invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        console.log('Total count:', totalCount);
        
        currentGraves = graves;
        totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
        
        console.log('Rendering table with', currentGraves.length, 'graves');
        renderGravesTable();
        updatePagination(totalCount);
    } catch (error) {
        console.error('Failed to load graves:', error);
        showToast('Gagal memuat data makam', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadHeirsForGrave(graveId) {
    try {
        console.log('Loading heirs for grave:', graveId);
        const heirs = await window.__TAURI__?.core?.invoke('get_heirs_by_grave', { graveId });
        console.log('Heirs loaded:', heirs.length);
        return heirs;
    } catch (error) {
        console.error('Failed to load heirs:', error);
        return [];
    }
}

// ==================== RENDER TABLE ====================

function renderGravesTable() {
    console.log('renderGravesTable called. Current graves:', currentGraves.length);
    
    const tbody = document.getElementById('gravesTableBody');
    if (!tbody) {
        console.error('tbody with id gravesTableBody not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (currentGraves.length === 0) {
        console.log('No graves to render, showing empty message');
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="px-4 py-8 text-center text-gray-500">
                    Tidak ada data makam
                </td>
            </tr>
        `;
        return;
    }
    
    currentGraves.forEach((grave, index) => {
        console.log('Rendering grave:', grave.id, grave.deceased_name);
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
        row.dataset.graveId = grave.id;
        
        const burialDate = grave.burial_date ? formatDate(grave.burial_date) : '-';
        const birthDate = grave.birth_date ? formatDate(grave.birth_date) : '-';
        
        const statusMakam = grave.grave_type === 'new' ? 'Makam Baru' : (grave.grave_type === 'stacked' ? 'Makam Tumpuk' : '-');

        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-500 border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600 border-r">${escapeHtml(grave.code)}-${grave.number}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${statusMakam}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-800 sticky left-0 bg-white border-r">${escapeHtml(grave.deceased_name)}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${escapeHtml(grave.birth_place || '-')}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${birthDate}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${burialDate}</td>
            <td class="px-4 py-3 text-sm text-gray-800 border-r">
                <span class="heir-name-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">
                <span class="heir-phone-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">
                <span class="heir-address-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${truncateText(grave.notes || '-', 20)}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${formatRupiah(grave.initial_fee_amount)}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button data-edit-id="${grave.id}" class="btn-edit-grave p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button data-delete-id="${grave.id}" data-delete-name="${escapeHtml(grave.deceased_name)}" class="btn-delete-grave p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit-grave') || e.target.closest('.btn-delete-grave')) {
                return;
            }
            showDetailModal(grave.id);
        });
        
        tbody.appendChild(row);
        
        loadAndRenderHeirsForRow(grave.id, row);
    });
    
    console.log('Table rendering complete');
}

async function loadAndRenderHeirsForRow(graveId, row) {
    console.log('Loading heirs for row:', graveId);
    const heirs = await loadHeirsForGrave(graveId);
    const nameCell = row.querySelector(`.heir-name-${graveId}`);
    const phoneCell = row.querySelector(`.heir-phone-${graveId}`);
    const addressCell = row.querySelector(`.heir-address-${graveId}`);
    
    if (heirs && heirs.length > 0) {
        const firstHeir = heirs[0];
        if (nameCell) nameCell.textContent = escapeHtml(firstHeir.full_name);
        if (phoneCell) phoneCell.textContent = escapeHtml(firstHeir.phone_number || '-');
        if (addressCell) addressCell.textContent = truncateText(firstHeir.address || '-', 30);
    } else {
        if (nameCell) nameCell.textContent = '-';
        if (phoneCell) phoneCell.textContent = '-';
        if (addressCell) addressCell.textContent = '-';
    }
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '-';
    return text.substring(0, maxLength) + '...';
}

function updatePagination(totalCount) {
    const paginationInfo = document.querySelector('.border-t.border-gray-200 p.text-gray-500');
    
    if (paginationInfo) {
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, totalCount);
        paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${totalCount} data`;
    }
    
    const paginationContainer = document.querySelector('.border-t.border-gray-200 .flex.gap-2');
    if (paginationContainer) {
        renderPaginationButtons(paginationContainer);
    }
}

function renderPaginationButtons(container) {
    let html = '';
    
    html += `<button data-page="${currentPage - 1}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>`;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button data-page="1" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button data-page="${i}" class="pagination-btn px-3 py-1.5 text-sm ${isActive ? 'bg-emerald-600 text-white' : 'border border-gray-300 hover:bg-gray-50'} rounded-lg">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
        html += `<button data-page="${totalPages}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">${totalPages}</button>`;
    }
    
    html += `<button data-page="${currentPage + 1}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>Selanjutnya</button>`;
    
    container.innerHTML = html;
}

async function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    await loadGraves(searchInput ? searchInput.value : '');
}

// ==================== DETAIL MODAL ====================

function openDetailModal() {
    const modal = document.getElementById('detailModal');
    if (!modal) {
        console.error('detailModal not found!');
        return;
    }
    modal.classList.remove('hidden');
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openImagePreview(src) {
    console.log('openImagePreview called');
    // Create overlay dynamically to guarantee it's on top
    const overlay = document.createElement('div');
    overlay.id = 'dynamicImagePreview';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';

    const container = document.createElement('div');
    container.style.cssText = 'position:relative;max-width:56rem;max-height:90vh;width:100%;display:flex;flex-direction:column;align-items:center;';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    closeBtn.style.cssText = 'position:absolute;top:-40px;right:0;color:white;background:transparent;border:none;cursor:pointer;';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeImagePreview(); });

    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Preview';
    img.style.cssText = 'max-width:100%;max-height:80vh;border-radius:8px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);object-fit:contain;';

    const hint = document.createElement('p');
    hint.textContent = 'Klik di luar gambar untuk menutup';
    hint.style.cssText = 'color:rgba(255,255,255,0.8);font-size:14px;margin-top:12px;';

    container.appendChild(closeBtn);
    container.appendChild(img);
    container.appendChild(hint);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    const backdropClick = (e) => {
        if (e.target === overlay) {
            removeImagePreview();
        }
    };
    overlay.addEventListener('click', backdropClick);

    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            removeImagePreview();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function removeImagePreview() {
    const overlay = document.getElementById('dynamicImagePreview');
    if (overlay) {
        overlay.remove();
    }
}

function closeImagePreview() {
    removeImagePreview();
}

async function showDetailModal(graveId) {
    console.log('Showing detail for grave:', graveId);
    try {
        showLoading(true);
        
        const detail = await window.__TAURI__?.core?.invoke('get_grave_detail', { id: graveId });
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        console.log('Detail loaded:', detail);
        
        const namaEl = document.getElementById('detailNamaAlmarhum');
        const blokEl = document.getElementById('detailBlokNomor');
        const tipeEl = document.getElementById('detailTipeMakam');
        const tempatLahirEl = document.getElementById('detailTempatLahir');
        const tanggalLahirEl = document.getElementById('detailTanggalLahir');
        const tanggalDimakamkanEl = document.getElementById('detailTanggalDimakamkan');
        const keteranganEl = document.getElementById('detailKeterangan');
        const initialFeeAmountEl = document.getElementById('detailInitialFeeAmount');
        const initialFeePaymentDateEl = document.getElementById('detailInitialFeePaymentDate');
        const initialFeePaymentMethodEl = document.getElementById('detailInitialFeePaymentMethod');
        const initialFeePaymentProofEl = document.getElementById('detailInitialFeePaymentProof');

        if (namaEl) namaEl.textContent = detail.grave.deceased_name || '-';
        if (blokEl) blokEl.textContent = (detail.grave.code || '-') + ' - ' + (detail.grave.number || '-');
        if (tipeEl) tipeEl.textContent = detail.grave.grave_type === 'new' ? 'Makam Baru' : (detail.grave.grave_type === 'stacked' ? 'Makam Tumpuk' : '-');
        if (tempatLahirEl) tempatLahirEl.textContent = detail.grave.birth_place || '-';
        if (tanggalLahirEl) tanggalLahirEl.textContent = detail.grave.birth_date ? formatDate(detail.grave.birth_date) : '-';
        if (tanggalDimakamkanEl) tanggalDimakamkanEl.textContent = detail.grave.burial_date ? formatDate(detail.grave.burial_date) : '-';
        if (keteranganEl) keteranganEl.textContent = detail.grave.notes || '-';

        if (initialFeeAmountEl) initialFeeAmountEl.textContent = formatRupiah(detail.grave.initial_fee_amount);
        if (initialFeePaymentDateEl) initialFeePaymentDateEl.textContent = detail.grave.initial_fee_payment_date ? formatDate(detail.grave.initial_fee_payment_date) : '-';
        if (initialFeePaymentMethodEl) initialFeePaymentMethodEl.textContent = formatPaymentMethod(detail.grave.initial_fee_payment_method);

        if (initialFeePaymentProofEl) {
            if (detail.grave.initial_fee_payment_proof) {
                initialFeePaymentProofEl.innerHTML = '<p class="text-sm text-blue-600">Memuat preview...</p>';
                try {
                    const dataUrl = await window.__TAURI__?.core?.invoke('get_payment_proof_data', {
                        path: detail.grave.initial_fee_payment_proof
                    });
                    if (dataUrl.startsWith('data:image')) {
                        initialFeePaymentProofEl.innerHTML = '';
                        const wrapper = document.createElement('button');
                        wrapper.type = 'button';
                        wrapper.className = 'inline-flex flex-col items-start gap-1 cursor-pointer group pointer-events-auto';
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.alt = 'Bukti Transfer';
                        img.className = 'h-12 w-auto max-w-[80px] object-contain rounded border border-gray-200 group-hover:opacity-80 transition-opacity pointer-events-auto';
                        const caption = document.createElement('span');
                        caption.className = 'text-xs text-blue-600 group-hover:underline pointer-events-auto';
                        caption.textContent = 'Klik untuk memperbesar';
                        wrapper.appendChild(img);
                        wrapper.appendChild(caption);
                        wrapper.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Thumbnail clicked, opening preview');
                            openImagePreview(dataUrl);
                        });
                        initialFeePaymentProofEl.appendChild(wrapper);
                    } else if (dataUrl.startsWith('data:application/pdf')) {
                        initialFeePaymentProofEl.innerHTML = '<p class="text-sm text-gray-700">Bukti Transfer (PDF)</p>';
                    } else {
                        initialFeePaymentProofEl.innerHTML = '<p class="text-sm text-gray-700">Bukti Transfer Tersedia</p>';
                    }
                } catch (e) {
                    initialFeePaymentProofEl.innerHTML = '<p class="text-sm text-red-500">Gagal memuat bukti transfer</p>';
                }
            } else {
                initialFeePaymentProofEl.innerHTML = '-';
            }
        }
        
        const heirsContainer = document.getElementById('detailAhliWarisContainer');
        if (heirsContainer) {
            heirsContainer.innerHTML = '';
            
            if (detail.heirs && detail.heirs.length > 0) {
                detail.heirs.forEach((heir, index) => {
                    const heirCard = document.createElement('div');
                    heirCard.className = 'p-4 bg-gray-50 rounded-lg border border-gray-200';
                    heirCard.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-gray-800">Ahli Waris #${index + 1}</span>
                            <span class="text-xs ${index === 0 ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded">${index === 0 ? 'Utama' : 'Opsional'}</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div>
                                <span class="text-gray-500">Nama:</span>
                                <span class="font-medium text-gray-800">${escapeHtml(heir.full_name)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Telepon:</span>
                                <span class="text-gray-800">${escapeHtml(heir.phone_number || '-')}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Hubungan:</span>
                                <span class="text-gray-800">${formatRelationship(heir.relationship)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Alamat:</span>
                                <span class="text-gray-800">${escapeHtml(heir.address || '-')}</span>
                            </div>
                        </div>
                    `;
                    heirsContainer.appendChild(heirCard);
                });
            } else {
                heirsContainer.innerHTML = '<p class="text-gray-500 text-sm">Tidak ada data ahli waris</p>';
            }
        }
        
        const btnEdit = document.getElementById('btnEditFromDetail');
        const btnDelete = document.getElementById('btnDeleteFromDetail');
        
        if (btnEdit) {
            btnEdit.onclick = () => {
                closeDetailModal();
                handleEditFromDetail(graveId);
            };
        }
        
        if (btnDelete) {
            btnDelete.onclick = () => {
                closeDetailModal();
                openDeleteModal(graveId, detail.grave.deceased_name);
            };
        }
        
        openDetailModal();
    } catch (error) {
        console.error('Failed to load grave detail:', error);
        showToast('Gagal memuat detail makam: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditFromDetail(graveId) {
    console.log('Editing from detail, graveId:', graveId, 'mode:', currentViewMode);
    
    if (currentViewMode === 'classic') {
        // Classic mode: populate classic form and scroll
        try {
            showLoading(true);
            const detail = await window.__TAURI__?.core?.invoke('get_grave_detail', { id: graveId });
            if (detail) {
                currentEditingId = graveId;
                populateClassicForm(detail.grave, detail.heirs);
                scrollToClassicForm();
                showToast('Silakan edit data di form atas', 'info');
            }
        } catch (error) {
            console.error('Failed to load for edit:', error);
            showToast('Gagal memuat data untuk edit', 'error');
        } finally {
            showLoading(false);
        }
    } else {
        // Modern mode: open edit modal
        openEditModal(graveId);
    }
}

// ==================== MODAL FUNCTIONS (Modern Mode) ====================

function openModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
    if (!modal || !panel) return;
    
    modal.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    
    const namaInput = document.getElementById('tambahNama');
    const blockSelect = document.getElementById('tambahBlockSelect');
    const nomorInput = document.getElementById('tambahNomor');
    const tanggalInput = document.getElementById('tambahTanggal');
    const tipeSelect = document.getElementById('tambahTipeMakam');
    const tempatLahirInput = document.getElementById('tambahTempatLahir');
    const tanggalLahirInput = document.getElementById('tambahTanggalLahir');
    const keteranganInput = document.getElementById('tambahKeterangan');
    
    if (namaInput) namaInput.value = '';
    if (blockSelect) blockSelect.value = '';
    if (nomorInput) nomorInput.value = '';
    if (tanggalInput) tanggalInput.value = '';
    if (tipeSelect) tipeSelect.value = '';
    if (tempatLahirInput) tempatLahirInput.value = '';
    if (tanggalLahirInput) tanggalLahirInput.value = '';
    if (keteranganInput) keteranganInput.value = '';

    const initialFeeAmount = document.getElementById('tambahInitialFeeAmount');
    const initialFeePaymentDate = document.getElementById('tambahInitialFeePaymentDate');
    const initialFeePaymentMethod = document.getElementById('tambahInitialFeePaymentMethod');
    const initialFeePaymentProof = document.getElementById('tambahInitialFeePaymentProof');
    if (initialFeeAmount) initialFeeAmount.value = '0';
    if (initialFeePaymentDate) initialFeePaymentDate.value = '';
    if (initialFeePaymentMethod) initialFeePaymentMethod.value = '';
    if (initialFeePaymentProof) initialFeePaymentProof.value = '';

    resetAhliWaris();
}

function closeModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
    if (!modal || !panel) return;
    
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function resetAhliWaris() {
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    container.innerHTML = createHeirHTML(1, true);
    jumlahAhliWaris = 1;
    updateTombolWaris();
}

function createHeirHTML(index, isRequired, heir = null) {
    return `
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100" data-heir-index="${index}">
            <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-blue-800">Ahli Waris #${index}</span>
                <span class="text-xs ${isRequired ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded">${isRequired ? 'Wajib' : 'Opsional'}</span>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                    <input type="text" class="heir-nama w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nama ahli waris" value="${heir ? escapeHtml(heir.full_name) : ''}">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Nomor Telepon</label>
                        <input type="tel" class="heir-telp w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="08xxxxxxxx" value="${heir ? escapeHtml(heir.phone_number || '') : ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Hubungan</label>
                        <select class="heir-hubungan w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs">
                            <option value="">Pilih</option>
                            <option value="anak" ${heir && heir.relationship === 'anak' ? 'selected' : ''}>Anak</option>
                            <option value="istri" ${heir && heir.relationship === 'istri' ? 'selected' : ''}>Istri</option>
                            <option value="suami" ${heir && heir.relationship === 'suami' ? 'selected' : ''}>Suami</option>
                            <option value="cucu" ${heir && heir.relationship === 'cucu' ? 'selected' : ''}>Cucu</option>
                            <option value="saudara" ${heir && heir.relationship === 'saudara' ? 'selected' : ''}>Saudara</option>
                            <option value="lainnya" ${heir && heir.relationship === 'lainnya' ? 'selected' : ''}>Lainnya</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Alamat Lengkap</label>
                    <textarea class="heir-alamat w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="2" placeholder="Alamat lengkap ahli waris">${heir ? escapeHtml(heir.address || '') : ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function tambahAhliWaris() {
    if (jumlahAhliWaris >= maxAhliWaris) return;
    
    jumlahAhliWaris++;
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWaris, false);
    container.appendChild(div.firstElementChild);
    updateTombolWaris();
}

function hapusAhliWarisTerakhir() {
    if (jumlahAhliWaris <= 1) return;
    
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    container.removeChild(container.lastElementChild);
    jumlahAhliWaris--;
    updateTombolWaris();
}

function updateTombolWaris() {
    const btnTambah = document.getElementById('btnTambahWaris');
    const btnHapus = document.getElementById('btnHapusWaris');
    
    if (btnTambah) {
        if (jumlahAhliWaris >= maxAhliWaris) {
            btnTambah.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnTambah.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (btnHapus) {
        if (jumlahAhliWaris > 1) {
            btnHapus.classList.remove('hidden');
        } else {
            btnHapus.classList.add('hidden');
        }
    }
}

async function simpanData() {
    try {
        const nama = document.getElementById('tambahNama')?.value?.trim();
        const blockId = parseInt(document.getElementById('tambahBlockSelect')?.value);
        const nomor = document.getElementById('tambahNomor')?.value?.trim();
        const tanggalWafat = document.getElementById('tambahTanggal')?.value;
        const tipeMakam = document.getElementById('tambahTipeMakam')?.value;
        const tempatLahir = document.getElementById('tambahTempatLahir')?.value?.trim() || null;
        const tanggalLahir = document.getElementById('tambahTanggalLahir')?.value || null;
        const keterangan = document.getElementById('tambahKeterangan')?.value?.trim() || null;
        const initialFeeAmountRaw = document.getElementById('tambahInitialFeeAmount')?.value;
        const initialFeeAmount = initialFeeAmountRaw ? parseInt(initialFeeAmountRaw) : 0;
        const initialFeePaymentDate = document.getElementById('tambahInitialFeePaymentDate')?.value || null;
        const initialFeePaymentMethod = document.getElementById('tambahInitialFeePaymentMethod')?.value || null;

        if (!nama) {
            showToast('Nama almarhum wajib diisi', 'error');
            return;
        }
        if (!blockId) {
            showToast('Blok makam wajib dipilih', 'error');
            return;
        }
        if (!nomor) {
            showToast('Nomor makam wajib diisi', 'error');
            return;
        }
        // Note: tanggal dimakamkan (date_of_death) is now optional
        if (!tipeMakam) {
            showToast('Tipe makam wajib dipilih', 'error');
            return;
        }
        if (isNaN(initialFeeAmount) || initialFeeAmount < 0) {
            showToast('Jumlah bayar biaya makam awal wajib diisi', 'error');
            return;
        }
        
        const heirs = [];
        const heirElements = document.querySelectorAll('#ahliWarisContainer > div');
        
        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama')?.value?.trim();
            
            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }
            
            if (namaWaris) {
                heirs.push({
                    grave_id: 0,  // Will be set by backend
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp')?.value?.trim() || null,
                    relationship: el.querySelector('.heir-hubungan')?.value || null,
                    address: el.querySelector('.heir-alamat')?.value?.trim() || null,
                    is_primary: i === 0
                });
            }
        }
        
        if (heirs.length === 0) {
            showToast('Minimal 1 ahli waris wajib diisi', 'error');
            return;
        }
        
        console.log('Saving grave via modal - Block ID:', blockId, 'Number:', nomor, 'Type:', tipeMakam);
        
        // Check for duplicate before creating (only for 'new' graves, not 'stacked')
        if (tipeMakam === 'new') {
            const existingGraves = currentGraves.filter(g => 
                g.block_id === blockId && g.number === nomor && g.grave_type === 'new'
            );
            if (existingGraves.length > 0) {
                showToast(`Makam Baru dengan Blok ${blockId} Nomor ${nomor} sudah ada! Gunakan tipe Makam Tumpuk jika ingin menambahkan ke lokasi yang sama.`, 'error');
                return;
            }
        }
        
        showLoading(true);

        // Handle payment proof upload
        const proofInput = document.getElementById('tambahInitialFeePaymentProof');
        let proofPath = null;
        if (proofInput && proofInput.files && proofInput.files.length > 0) {
            proofPath = await uploadPaymentProofFile(proofInput);
        }

        const token = window.astanaApp?.getSessionToken?.() || localStorage.getItem('astana_session_token');
        const requestPayload = {
            grave: {
                deceased_name: nama,
                block_id: blockId,
                number: nomor,
                date_of_death: tanggalWafat,
                    birth_place: tempatLahir,
                    birth_date: tanggalLahir,
                    burial_date: null,
                    notes: keterangan,
                    grave_type: tipeMakam,
                    initial_fee_amount: initialFeeAmount,
                initial_fee_payment_date: initialFeePaymentDate,
                initial_fee_payment_method: initialFeePaymentMethod,
                initial_fee_payment_proof: proofPath
            },
            heirs: heirs
        };
        console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
        await window.__TAURI__?.core?.invoke('create_grave_with_heirs', {
            token: token,
            request: requestPayload
        });

        closeModal();
        showToast('Data makam berhasil disimpan', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to save grave:', error);
        // Better error message for duplicate constraint
        let errorMsg = error.toString();
        if (errorMsg.includes('UNIQUE constraint failed')) {
            errorMsg = 'Makam dengan Blok dan Nomor tersebut sudah ada di database!';
        }
        showToast('Gagal menyimpan data: ' + errorMsg, 'error');
    } finally {
        showLoading(false);
    }
}

async function openEditModal(graveId) {
    currentEditingId = graveId;
    
    try {
        showLoading(true);
        
        const detail = await window.__TAURI__?.core?.invoke('get_grave_by_id', { id: graveId });
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        console.log('Editing grave via modal:', detail);
        
        const namaInput = document.getElementById('editNama');
        const tanggalInput = document.getElementById('editTanggal');
        const nomorInput = document.getElementById('editNomor');
        const tipeSelect = document.getElementById('editTipeMakam');
        const tempatLahirInput = document.getElementById('editTempatLahir');
        const tanggalLahirInput = document.getElementById('editTanggalLahir');
        
        const keteranganInput = document.getElementById('editKeterangan');

        if (namaInput) namaInput.value = detail.deceased_name || '';
        if (tanggalInput) tanggalInput.value = detail.date_of_death || '';
        if (nomorInput) nomorInput.value = detail.number || '';
        if (tipeSelect) tipeSelect.value = detail.grave_type || '';
        if (tempatLahirInput) tempatLahirInput.value = detail.birth_place || '';
        if (tanggalLahirInput) tanggalLahirInput.value = detail.birth_date || '';
        if (keteranganInput) keteranganInput.value = detail.notes || '';

        const editInitialFeeAmount = document.getElementById('editInitialFeeAmount');
        const editInitialFeePaymentDate = document.getElementById('editInitialFeePaymentDate');
        const editInitialFeePaymentMethod = document.getElementById('editInitialFeePaymentMethod');
        const editInitialFeePaymentProof = document.getElementById('editInitialFeePaymentProof');
        if (editInitialFeeAmount) editInitialFeeAmount.value = detail.initial_fee_amount !== undefined && detail.initial_fee_amount !== null ? detail.initial_fee_amount : '0';
        if (editInitialFeePaymentDate) editInitialFeePaymentDate.value = detail.initial_fee_payment_date || '';
        if (editInitialFeePaymentMethod) editInitialFeePaymentMethod.value = detail.initial_fee_payment_method || '';
        if (editInitialFeePaymentProof) editInitialFeePaymentProof.value = '';

        populateEditBlockSelect(detail.block_id);
        
        const heirs = await loadHeirsForGrave(graveId);
        const container = document.getElementById('editAhliWarisContainer');
        if (container) {
            container.innerHTML = '';
            jumlahAhliWarisEdit = heirs.length || 1;
            
            if (heirs.length === 0) {
                container.innerHTML = createHeirHTML(1, true, null);
            } else {
                heirs.forEach((heir, index) => {
                    container.innerHTML += createHeirHTML(index + 1, index === 0, heir);
                });
            }
        }
        
        updateTombolWarisEdit();
        
        const modal = document.getElementById('editModal');
        const panel = document.getElementById('editModalPanel');
        if (modal && panel) {
            modal.classList.remove('hidden');
            setTimeout(() => panel.classList.remove('translate-x-full'), 10);
        }
    } catch (error) {
        console.error('Failed to load grave detail:', error);
        showToast('Gagal memuat detail makam: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    const panel = document.getElementById('editModalPanel');
    if (!modal || !panel) return;
    
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentEditingId = null;
}

function tambahAhliWarisEdit() {
    if (jumlahAhliWarisEdit >= maxAhliWaris) return;
    
    jumlahAhliWarisEdit++;
    const container = document.getElementById('editAhliWarisContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWarisEdit, false, null);
    container.appendChild(div.firstElementChild);
    updateTombolWarisEdit();
}

function hapusAhliWarisTerakhirEdit() {
    if (jumlahAhliWarisEdit <= 1) return;
    
    const container = document.getElementById('editAhliWarisContainer');
    if (!container) return;
    
    container.removeChild(container.lastElementChild);
    jumlahAhliWarisEdit--;
    updateTombolWarisEdit();
}

function updateTombolWarisEdit() {
    const btnTambah = document.getElementById('btnTambahWarisEdit');
    const btnHapus = document.getElementById('btnHapusWarisEdit');
    
    if (btnTambah) {
        if (jumlahAhliWarisEdit >= maxAhliWaris) {
            btnTambah.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnTambah.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (btnHapus) {
        if (jumlahAhliWarisEdit > 1) {
            btnHapus.classList.remove('hidden');
        } else {
            btnHapus.classList.add('hidden');
        }
    }
}

async function simpanEdit() {
    if (!currentEditingId) return;

    try {
        const nama = document.getElementById('editNama')?.value?.trim();
        const blockId = parseInt(document.getElementById('editBlockSelect')?.value);
        const nomor = document.getElementById('editNomor')?.value?.trim();
        const tanggalWafat = document.getElementById('editTanggal')?.value;
        const tipeMakam = document.getElementById('editTipeMakam')?.value;
        const tempatLahir = document.getElementById('editTempatLahir')?.value?.trim() || null;
        const tanggalLahir = document.getElementById('editTanggalLahir')?.value || null;
        const keterangan = document.getElementById('editKeterangan')?.value?.trim() || null;
        const initialFeeAmountRaw = document.getElementById('editInitialFeeAmount')?.value;
        const initialFeeAmount = initialFeeAmountRaw ? parseInt(initialFeeAmountRaw) : 0;
        const initialFeePaymentDate = document.getElementById('editInitialFeePaymentDate')?.value || null;
        const initialFeePaymentMethod = document.getElementById('editInitialFeePaymentMethod')?.value || null;

        if (!nama) {
            showToast('Nama almarhum wajib diisi', 'error');
            return;
        }
        if (!blockId) {
            showToast('Blok makam wajib dipilih', 'error');
            return;
        }
        if (!nomor) {
            showToast('Nomor makam wajib diisi', 'error');
            return;
        }
        // Note: tanggal dimakamkan (date_of_death) is now optional
        if (!tipeMakam) {
            showToast('Tipe makam wajib dipilih', 'error');
            return;
        }
        if (isNaN(initialFeeAmount) || initialFeeAmount < 0) {
            showToast('Jumlah bayar biaya makam awal wajib diisi', 'error');
            return;
        }

        const heirs = [];
        const heirElements = document.querySelectorAll('#editAhliWarisContainer > div');

        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama')?.value?.trim();

            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }

            if (namaWaris) {
                heirs.push({
                    grave_id: currentEditingId,
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp')?.value?.trim() || null,
                    relationship: el.querySelector('.heir-hubungan')?.value || null,
                    address: el.querySelector('.heir-alamat')?.value?.trim() || null,
                    is_primary: i === 0
                });
            }
        }

        if (heirs.length === 0) {
            showToast('Minimal 1 ahli waris wajib diisi', 'error');
            return;
        }

        showLoading(true);

        // Handle payment proof upload
        const proofInput = document.getElementById('editInitialFeePaymentProof');
        let proofPath = null;
        const detail = await window.__TAURI__?.core?.invoke('get_grave_by_id', { id: currentEditingId });
        if (detail && detail.initial_fee_payment_proof && (!proofInput || !proofInput.files || proofInput.files.length === 0)) {
            proofPath = detail.initial_fee_payment_proof;
        }
        if (proofInput && proofInput.files && proofInput.files.length > 0) {
            proofPath = await uploadPaymentProofFile(proofInput);
        }

        const graveUpdate = {
            deceased_name: nama,
            block_id: blockId,
            number: nomor,
            date_of_death: tanggalWafat,
                    birth_place: tempatLahir,
                    birth_date: tanggalLahir,
                    burial_date: null,
                    notes: keterangan,
                    grave_type: tipeMakam,
            initial_fee_amount: initialFeeAmount,
            initial_fee_payment_date: initialFeePaymentDate,
            initial_fee_payment_method: initialFeePaymentMethod,
            initial_fee_payment_proof: proofPath
        };

        console.log('Updating grave via modal:', currentEditingId, graveUpdate);

        const token = window.astanaApp?.getSessionToken?.() || localStorage.getItem('astana_session_token');

        await window.__TAURI__?.core?.invoke('update_grave', {
            token: token,
            id: currentEditingId,
            grave: graveUpdate
        });

        await window.__TAURI__?.core?.invoke('delete_heirs_by_grave', { graveId: currentEditingId });

        for (const heir of heirs) {
            await window.__TAURI__?.core?.invoke('create_heir', {
                heir: {
                    ...heir,
                    grave_id: currentEditingId
                }
            });
        }

        closeEditModal();
        showToast('Data makam berhasil diperbarui', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to update grave:', error);
        showToast('Gagal memperbarui data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function openDeleteModal(graveId, nama) {
    currentDeletingId = graveId;
    currentDeletingName = nama;
    const deleteNamaEl = document.getElementById('deleteNama');
    if (deleteNamaEl) deleteNamaEl.textContent = nama;
    
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
    
    currentDeletingId = null;
    currentDeletingName = '';
}

async function confirmDelete() {
    if (!currentDeletingId) return;
    
    try {
        showLoading(true);
        await window.__TAURI__?.core?.invoke('delete_grave', { id: currentDeletingId });
        
        closeDeleteModal();
        showToast('Data makam berhasil dihapus', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to delete grave:', error);
        showToast('Gagal menghapus data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleImport() {
    try {
        showLoading(true);
        const result = await window.__TAURI__?.core?.invoke('import_database');
        
        if (result.success) {
            showToast(result.message || 'Database berhasil diimport', 'success');
            await loadGraves();
        } else {
            showToast(result.error || 'Gagal mengimport database', 'error');
        }
    } catch (error) {
        console.error('Import failed:', error);
        showToast('Gagal mengimport database: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== UTILITIES ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (show) {
        document.body.style.cursor = 'wait';
    } else {
        document.body.style.cursor = 'default';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EXPORT EXCEL ====================

let exportStartYear = null;
let exportEndYear = null;

function openExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateYearOptions();
        setExportRange(5);
        updateExportDataCount();
    }
}

function closeExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    if (modal) modal.classList.add('hidden');
}

function populateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startSelect = document.getElementById('exportStartYear');
    const endSelect = document.getElementById('exportEndYear');
    
    if (!startSelect || !endSelect) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    for (let year = 2000; year <= currentYear + 5; year++) {
        const startOption = document.createElement('option');
        startOption.value = year;
        startOption.textContent = year;
        startSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = year;
        endOption.textContent = year;
        endSelect.appendChild(endOption);
    }
}

function setExportRange(range) {
    const currentYear = new Date().getFullYear();
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    
    if (!startYearSelect || !endYearSelect) return;
    
    const yearSelectorsDiv = startYearSelect.closest('.grid');
    
    if (range === 'all') {
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'none';
        }
        exportStartYear = null;
        exportEndYear = null;
    } else {
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'grid';
        }
        exportEndYear = currentYear;
        exportStartYear = currentYear - range + 1;
        
        startYearSelect.value = exportStartYear;
        endYearSelect.value = exportEndYear;
    }
    
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-100', 'text-emerald-700', 'active');
        btn.classList.add('bg-gray-100');
    });
    
    const activeBtn = document.querySelector(`button[data-range="${range}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100');
        activeBtn.classList.add('bg-emerald-100', 'text-emerald-700', 'active');
    }
    
    updateYearPreview();
}

function updateYearPreview() {
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    const previewElement = document.getElementById('previewYears');
    
    if (!startYearSelect || !endYearSelect || !previewElement) return;
    
    const allBtn = document.querySelector('button[data-range="all"]');
    if (allBtn && allBtn.classList.contains('active')) {
        previewElement.textContent = 'Semua Data (Otomatis berdasarkan data di database)';
        return;
    }
    
    exportStartYear = parseInt(startYearSelect.value);
    exportEndYear = parseInt(endYearSelect.value);
    
    if (exportStartYear > exportEndYear) {
        exportEndYear = exportStartYear;
        endYearSelect.value = exportEndYear;
    }
    
    const yearCount = exportEndYear - exportStartYear + 1;
    previewElement.textContent = `${exportStartYear} - ${exportEndYear} (${yearCount} tahun)`;
}

async function updateExportDataCount() {
    try {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
        const search = searchInput ? searchInput.value : '';
        
        const blockSelect = document.getElementById('filterBlockSelect');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const count = await window.__TAURI__?.core?.invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        const exportDataCountEl = document.getElementById('exportDataCount');
        if (exportDataCountEl) {
            exportDataCountEl.textContent = `${count} data makam`;
        }
    } catch (error) {
        const exportDataCountEl = document.getElementById('exportDataCount');
        if (exportDataCountEl) exportDataCountEl.textContent = '-';
    }
}

async function confirmExportExcel() {
    closeExportExcelModal();
    await exportToExcel(exportStartYear, exportEndYear);
}

async function exportToExcel(startYear, endYear) {
    try {
        showLoading(true);
        
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
        const search = searchInput ? searchInput.value : '';
        
        const blockSelect = document.getElementById('filterBlockSelect');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const exportData = await window.__TAURI__?.core?.invoke('get_all_graves_with_heirs', {
            search: search || null,
            blockId: blockId
        });
        
        if (!exportData || exportData.length === 0) {
            showToast('Tidak ada data untuk diexport', 'error');
            showLoading(false);
            return;
        }
        
        const excelData = exportData.map((item, index) => {
            const row = {
                'No': index + 1,
                'Nama Almarhum': item.deceased_name,
                'Blok': item.block_code,
                'Nomor Makam': item.number,
                'Tempat Lahir': item.birth_place || '-',
                'Tanggal Lahir': item.birth_date ? formatDate(item.birth_date) : '-',
                'Tanggal Dimakamkan': item.burial_date ? formatDate(item.burial_date) : '-',
                'Keterangan': item.notes || '-',
                'Biaya Makam Awal': item.initial_fee_amount || 0,
                'Tanggal Bayar Biaya Awal': item.initial_fee_payment_date ? formatDate(item.initial_fee_payment_date) : '-',
                'Metode Bayar Biaya Awal': formatPaymentMethod(item.initial_fee_payment_method),
            };
            
            for (let i = 0; i < 3; i++) {
                const heir = item.heirs[i];
                const num = i + 1;
                if (heir) {
                    row[`Ahli Waris ${num}`] = heir.full_name;
                    row[`No. HP ${num}`] = heir.phone_number || '-';
                    row[`Hubungan ${num}`] = formatRelationship(heir.relationship);
                    row[`Alamat ${num}`] = heir.address || '-';
                } else {
                    row[`Ahli Waris ${num}`] = '-';
                    row[`No. HP ${num}`] = '-';
                    row[`Hubungan ${num}`] = '-';
                    row[`Alamat ${num}`] = '-';
                }
            }
            
            return row;
        });
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        const colWidths = [
            { wch: 5 },
            { wch: 25 },
            { wch: 8 },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 20 },
            { wch: 18 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 25 },
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Data Makam');
        
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const defaultFilename = `Data_Makam_${timestamp}.xlsx`;
        
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        if (window.__TAURI__) {
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const fileData = Array.from(uint8Array);
                
                const savedPath = await window.__TAURI__?.core?.invoke('save_excel_file', {
                    fileData: fileData,
                    defaultName: defaultFilename
                });
                
                if (savedPath) {
                    showToast(`Berhasil export ${exportData.length} data ke:\n${savedPath}`, 'success');
                } else {
                    showToast('Export dibatalkan', 'info');
                }
            } catch (tauriError) {
                console.error('Tauri save failed:', tauriError);
                fallbackDownload(blob, defaultFilename, exportData.length);
            }
        } else {
            fallbackDownload(blob, defaultFilename, exportData.length);
        }
        
    } catch (error) {
        console.error('Failed to export:', error);
        showToast('Gagal mengexport data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function fallbackDownload(blob, filename, dataCount) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Berhasil export ${dataCount} data ke folder Downloads`, 'success');
}

function formatRelationship(relationship) {
    if (!relationship) return '-';
    const map = {
        'anak': 'Anak',
        'istri': 'Istri',
        'suami': 'Suami',
        'cucu': 'Cucu',
        'saudara': 'Saudara',
        'lainnya': 'Lainnya'
    };
    return map[relationship] || relationship;
}

function formatPaymentMethod(method) {
    if (!method) return '-';
    const map = {
        'cash': 'Tunai',
        'transfer': 'Transfer Bank',
        'qris': 'QRIS'
    };
    return map[method] || method;
}

function formatRupiah(amount) {
    if (amount === null || amount === undefined || amount === '') return '-';
    const num = parseInt(amount);
    if (isNaN(num)) return '-';
    return 'Rp ' + num.toLocaleString('id-ID');
}

async function uploadPaymentProofFile(inputElement) {
    if (!inputElement || !inputElement.files || inputElement.files.length === 0) {
        return null;
    }
    const file = inputElement.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const fileData = Array.from(uint8Array);
    const proofPath = await window.__TAURI__?.core?.invoke('upload_payment_proof', {
        fileData: fileData,
        fileName: file.name
    });
    return proofPath;
}

// ==================== TABLE ACTION LISTENERS ====================

function setupTableActionListeners() {
    console.log('Setting up table action listeners...');
    
    const tbody = document.getElementById('gravesTableBody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            console.log('Table clicked:', e.target);
            
            const editGraveBtn = e.target.closest('.btn-edit-grave');
            if (editGraveBtn) {
                e.stopPropagation();
                const graveId = parseInt(editGraveBtn.dataset.editId);
                console.log('Edit button clicked for grave:', graveId);
                
                // Check current mode
                if (currentViewMode === 'classic') {
                    handleEditFromDetail(graveId);
                } else {
                    openEditModal(graveId);
                }
                return;
            }
            
            const deleteGraveBtn = e.target.closest('.btn-delete-grave');
            if (deleteGraveBtn) {
                e.stopPropagation();
                const graveId = parseInt(deleteGraveBtn.dataset.deleteId);
                const graveName = deleteGraveBtn.dataset.deleteName;
                console.log('Delete button clicked for grave:', graveId, graveName);
                openDeleteModal(graveId, graveName);
                return;
            }
            
            const row = e.target.closest('tr');
            if (row && row.dataset.graveId) {
                const graveId = parseInt(row.dataset.graveId);
                console.log('Row clicked for detail:', graveId);
                showDetailModal(graveId);
            }
        });
    }
    
    const paginationContainer = document.querySelector('.border-t.border-gray-200 .flex.gap-2');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-page]');
            if (btn) {
                const page = parseInt(btn.dataset.page);
                goToPage(page);
            }
        });
    }
}

function closeSuksesModal() {
    const modal = document.getElementById('modalSukses');
    if (modal) modal.classList.add('hidden');
}

// Expose functions to global scope
window.openModal = openModal;
window.closeModal = closeModal;
window.tambahAhliWaris = tambahAhliWaris;
window.hapusAhliWarisTerakhir = hapusAhliWarisTerakhir;
window.simpanData = simpanData;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.tambahAhliWarisEdit = tambahAhliWarisEdit;
window.hapusAhliWarisTerakhirEdit = hapusAhliWarisTerakhirEdit;
window.simpanEdit = simpanEdit;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.goToPage = goToPage;
window.exportToExcel = exportToExcel;
window.openExportExcelModal = openExportExcelModal;
window.closeExportExcelModal = closeExportExcelModal;
window.setExportRange = setExportRange;
window.confirmExportExcel = confirmExportExcel;
window.updateYearPreview = updateYearPreview;
window.closeSuksesModal = closeSuksesModal;
window.showDetailModal = showDetailModal;
window.closeDetailModal = closeDetailModal;
window.openDetailModal = openDetailModal;
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;
window.loadGraves = loadGraves;
window.toggleViewMode = toggleViewMode;
window.resetClassicForm = resetClassicForm;
window.handleClassicFormSubmit = handleClassicFormSubmit;
