// Payment Tests

const PembayaranTests = {
    tests: [], passed: 0, failed: 0,
    test(name, fn) { this.tests.push({ name, fn }); },
    async run() {
        this.passed = 0; this.failed = 0;
        console.log('💰 Running Pembayaran Tests...\n');
        for (const test of this.tests) {
            try { setupMockTauri(); await test.fn(); console.log(`✅ ${test.name}`); this.passed++; }
            catch (error) { console.error(`❌ ${test.name}: ${error.message}`); this.failed++; }
        }
        console.log(`\n📊 Pembayaran Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },
    _addBlock(code) {
        MockTauri.db.blocks.push({ id: ++MockTauri.db.autoIncrement.blocks, code, description: '', total_capacity: 50, annual_fee: 100000, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return MockTauri.db.autoIncrement.blocks;
    },
    _addGrave(blockId, name, number) {
        MockTauri.db.graves.push({ id: ++MockTauri.db.autoIncrement.graves, deceased_name: name, block_id: blockId, number, date_of_death: '2024-01-01', burial_date: null, birth_place: null, birth_date: null, notes: null, grave_type: 'new', initial_fee_amount: 0, initial_fee_payment_date: null, initial_fee_payment_method: null, initial_fee_payment_proof: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return MockTauri.db.autoIncrement.graves;
    },
};

PembayaranTests.test('Load payments empty', async () => {
    const payments = await MockTauri.invoke('get_payments_by_grave', { grave_id: 1 });
    if (payments.length !== 0) throw new Error('Expected empty payments');
});

PembayaranTests.test('Create single payment', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    const paymentId = await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0, payment_method: 'cash' } });
    if (!paymentId || paymentId <= 0) throw new Error('Payment ID should be valid');
    const payments = await MockTauri.invoke('get_payments_by_grave', { grave_id: graveId });
    if (payments.length !== 1) throw new Error('Expected 1 payment, got ' + payments.length);
});

PembayaranTests.test('Create multi-year payments', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    const ids = await MockTauri.invoke('create_multi_year_payments', { grave_id: graveId, years: [2023, 2024, 2025], payment_date: '2025-01-01', amount: 100000, expected_fee: 100000 });
    if (ids.length !== 3) throw new Error('Expected 3 payment IDs, got ' + ids.length);
    const payments = await MockTauri.invoke('get_payments_by_grave', { grave_id: graveId });
    if (payments.length !== 3) throw new Error('Expected 3 payments, got ' + payments.length);
});

PembayaranTests.test('Duplicate year payment fails', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-01-01', amount: 100000, expected_fee: 0 } });
    try {
        await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: 90000, expected_fee: 0 } });
        throw new Error('Duplicate year should fail');
    } catch (e) {
        if (!e.message.includes('sudah ada')) throw new Error('Expected duplicate error');
    }
});

PembayaranTests.test('Delete payment', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    const paymentId = await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0 } });
    await MockTauri.invoke('delete_payment', { id: paymentId });
    const payments = await MockTauri.invoke('get_payments_by_grave', { grave_id: graveId });
    if (payments.length !== 0) throw new Error('Payments should be empty after delete');
});

PembayaranTests.test('Get payment by grave and year', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0 } });
    const payment = await MockTauri.invoke('get_payment_by_grave_and_year', { grave_id: graveId, year: 2025 });
    if (!payment) throw new Error('Payment should exist for 2025');
    const noPayment = await MockTauri.invoke('get_payment_by_grave_and_year', { grave_id: graveId, year: 2026 });
    if (noPayment) throw new Error('Payment should not exist for 2026');
});

PembayaranTests.test('Count graves payment status', async () => {
    const blockA = PembayaranTests._addBlock('A');
    const blockB = PembayaranTests._addBlock('B');
    const g1 = PembayaranTests._addGrave(blockA, 'G1', '01');
    const g2 = PembayaranTests._addGrave(blockA, 'G2', '02');
    const g3 = PembayaranTests._addGrave(blockB, 'G3', '01');
    await MockTauri.invoke('create_payment', { payment: { grave_id: g1, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0 } });
    await MockTauri.invoke('create_payment', { payment: { grave_id: g2, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0 } });
    const status = await MockTauri.invoke('count_graves_with_payment_status', { year: 2025 });
    if (status.total !== 3) throw new Error('Total should be 3');
    if (status.paid !== 2) throw new Error('Paid should be 2');
    if (status.unpaid !== 1) throw new Error('Unpaid should be 1');
});

PembayaranTests.test('Create payment with negative amount fails', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    try {
        await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: -50000, expected_fee: 0 } });
        throw new Error('Should have thrown on negative amount');
    } catch (e) { /* expected */ }
});

PembayaranTests.test('Create payment with invalid grave_id fails', async () => {
    try {
        await MockTauri.invoke('create_payment', { payment: { grave_id: 9999, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 0 } });
        throw new Error('Should have thrown on invalid grave_id');
    } catch (e) { /* expected */ }
});

PembayaranTests.test('Create payment with invalid year fails', async () => {
    const blockId = PembayaranTests._addBlock('A');
    const graveId = PembayaranTests._addGrave(blockId, 'Almarhum', '01');
    try {
        await MockTauri.invoke('create_payment', { payment: { grave_id: graveId, year: 1800, payment_date: '1800-01-01', amount: 100000, expected_fee: 0 } });
        throw new Error('Should have thrown on invalid year');
    } catch (e) { /* expected */ }
});

PembayaranTests.test('Delete non-existent payment fails', async () => {
    try {
        await MockTauri.invoke('delete_payment', { id: 9999 });
        throw new Error('Should have thrown on non-existent delete');
    } catch (e) { /* expected */ }
});

PembayaranTests.test('Generate single receipt returns PDF bytes', async () => {
    const result = await MockTauri.invoke('generate_single_receipt');
    if (!result.pdf_bytes) throw new Error('Should return pdf_bytes');
    if (result.pdf_bytes[0] !== 37) throw new Error('Should start with PDF magic bytes (%)');
});

PembayaranTests.test('Generate combined receipt returns PDF bytes', async () => {
    const result = await MockTauri.invoke('generate_combined_receipt');
    if (!result.pdf_bytes) throw new Error('Should return pdf_bytes');
});

window.PembayaranTests = PembayaranTests;
