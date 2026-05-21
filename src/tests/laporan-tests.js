// Report Tests

const LaporanTests = {
    tests: [], passed: 0, failed: 0,
    test(name, fn) { this.tests.push({ name, fn }); },
    async run() {
        this.passed = 0; this.failed = 0;
        console.log('📊 Running Laporan Tests...\n');
        for (const test of this.tests) {
            try { setupMockTauri(); await test.fn(); console.log(`✅ ${test.name}`); this.passed++; }
            catch (error) { console.error(`❌ ${test.name}: ${error.message}`); this.failed++; }
        }
        console.log(`\n📊 Laporan Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },
    _addBlock(code, capacity, fee) {
        MockTauri.db.blocks.push({ id: ++MockTauri.db.autoIncrement.blocks, code, description: '', total_capacity: capacity, annual_fee: fee, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return MockTauri.db.autoIncrement.blocks;
    },
    _addGrave(blockId, name, number) {
        MockTauri.db.graves.push({ id: ++MockTauri.db.autoIncrement.graves, deceased_name: name, block_id: blockId, number, date_of_death: '2024-01-01', burial_date: null, birth_place: null, birth_date: null, notes: null, grave_type: 'new', initial_fee_amount: 0, initial_fee_payment_date: null, initial_fee_payment_method: null, initial_fee_payment_proof: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return MockTauri.db.autoIncrement.graves;
    },
};

LaporanTests.test('Empty yearly report', async () => {
    const report = await MockTauri.invoke('get_yearly_report', { year: 2025 });
    if (report.total_graves !== 0) throw new Error('Expected 0 graves, got ' + report.total_graves);
    if (report.block_reports.length !== 0) throw new Error('Expected empty block reports');
});

LaporanTests.test('Yearly report with data', async () => {
    const blockId = LaporanTests._addBlock('A', 10, 100000);
    const graveId = LaporanTests._addGrave(blockId, 'Almarhum', '01');
    MockTauri.db.payments.push({ id: ++MockTauri.db.autoIncrement.payments, grave_id: graveId, year: 2025, payment_date: '2025-06-01', amount: 100000, expected_fee: 100000, payment_method: 'cash', payment_proof: null, paid_by: null, notes: null, inputted_by: null, received_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const report = await MockTauri.invoke('get_yearly_report', { year: 2025 });
    if (report.total_graves !== 1) throw new Error('Expected 1 grave, got ' + report.total_graves);
    if (report.total_paid !== 1) throw new Error('Expected 1 paid, got ' + report.total_paid);
    if (report.total_revenue !== 100000) throw new Error('Expected 100000 revenue, got ' + report.total_revenue);
    if (report.block_reports.length !== 1) throw new Error('Expected 1 block report');
});

LaporanTests.test('Available years', async () => {
    const years = await MockTauri.invoke('get_available_years');
    if (years.length === 0) throw new Error('Should contain at least current year');
});

LaporanTests.test('Total capacity', async () => {
    LaporanTests._addBlock('A', 50, 100000);
    LaporanTests._addBlock('B', 30, 80000);
    const capacity = await MockTauri.invoke('get_total_capacity');
    if (capacity !== 80) throw new Error('Expected capacity 80, got ' + capacity);
});

LaporanTests.test('Grave payment detail', async () => {
    const blockId = LaporanTests._addBlock('A', 10, 100000);
    const graveId = LaporanTests._addGrave(blockId, 'Almarhum', '01');
    const detail = await MockTauri.invoke('get_grave_payment_detail', { grave_id: graveId });
    if (!detail) throw new Error('Detail should exist');
    if (detail.deceased_name !== 'Almarhum') throw new Error('Name should match');
});

LaporanTests.test('Yearly report with negative year returns empty', async () => {
    const report = await MockTauri.invoke('get_yearly_report', { year: -1 });
    if (report.total_graves !== 0) throw new Error('Negative year should return empty report');
    if (report.block_reports.length !== 0) throw new Error('Negative year should have no block reports');
});

LaporanTests.test('Generate PDF report returns bytes', async () => {
    const result = await MockTauri.invoke('generate_pdf_report');
    if (!result.pdf_bytes) throw new Error('Should return pdf_bytes');
});

window.LaporanTests = LaporanTests;
