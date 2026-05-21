// Grave & Heir Tests

const DataMakamTests = {
    tests: [], passed: 0, failed: 0,
    test(name, fn) { this.tests.push({ name, fn }); },
    async run() {
        this.passed = 0; this.failed = 0;
        console.log('⚰️ Running Data Makam Tests...\n');
        for (const test of this.tests) {
            try { setupMockTauri(); await test.fn(); console.log(`✅ ${test.name}`); this.passed++; }
            catch (error) { console.error(`❌ ${test.name}: ${error.message}`); this.failed++; }
        }
        console.log(`\n📊 Data Makam Tests: ${this.passed} passed, ${this.failed} failed`);
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

DataMakamTests.test('Load graves empty', async () => {
    const result = await MockTauri.invoke('get_graves', { limit: 30, offset: 0 });
    if (result.data.length !== 0) throw new Error('Expected empty graves');
});

DataMakamTests.test('Load graves with data', async () => {
    const blockId = DataMakamTests._addBlock('A');
    DataMakamTests._addGrave(blockId, 'Almarhum Satu', '01');
    DataMakamTests._addGrave(blockId, 'Almarhum Dua', '02');
    const result = await MockTauri.invoke('get_graves', { limit: 30, offset: 0 });
    if (result.data.length !== 2) throw new Error('Expected 2 graves, got ' + result.data.length);
    if (result.data[0].code !== 'A') throw new Error('Block code should be A');
});

DataMakamTests.test('Graves pagination', async () => {
    const blockId = DataMakamTests._addBlock('A');
    for (let i = 1; i <= 35; i++) DataMakamTests._addGrave(blockId, `Grave ${i}`, String(i).padStart(2, '0'));
    const page1 = await MockTauri.invoke('get_graves', { limit: 30, offset: 0 });
    if (page1.data.length !== 30) throw new Error('Page 1 should have 30, got ' + page1.data.length);
    const page2 = await MockTauri.invoke('get_graves', { limit: 30, offset: 30 });
    if (page2.data.length !== 5) throw new Error('Page 2 should have 5, got ' + page2.data.length);
});

DataMakamTests.test('Graves search by name', async () => {
    const blockId = DataMakamTests._addBlock('A');
    DataMakamTests._addGrave(blockId, 'Ahmad', '01');
    DataMakamTests._addGrave(blockId, 'Budi', '02');
    const result = await MockTauri.invoke('get_graves', { search: 'Ahmad', limit: 30, offset: 0 });
    if (result.data.length !== 1) throw new Error('Expected 1 result for Ahmad, got ' + result.data.length);
    if (result.data[0].deceased_name !== 'Ahmad') throw new Error('Should match Ahmad');
});

DataMakamTests.test('Graves filter by block', async () => {
    const blockA = DataMakamTests._addBlock('A');
    const blockB = DataMakamTests._addBlock('B');
    DataMakamTests._addGrave(blockA, 'User A1', '01');
    DataMakamTests._addGrave(blockA, 'User A2', '02');
    DataMakamTests._addGrave(blockB, 'User B1', '01');
    const result = await MockTauri.invoke('get_graves', { block_id: blockA, limit: 30, offset: 0 });
    if (result.data.length !== 2) throw new Error('Expected 2 graves in block A, got ' + result.data.length);
});

DataMakamTests.test('Create grave with heirs', async () => {
    const blockId = DataMakamTests._addBlock('A');
    const graveId = await MockTauri.invoke('create_grave_with_heirs', {
        grave: { deceased_name: 'Almarhum', block_id: blockId, number: '10', date_of_death: '2024-03-15', grave_type: 'new', initial_fee_amount: 0, heirs: [{ full_name: 'Heir 1', is_primary: true }, { full_name: 'Heir 2', is_primary: false }] }
    });
    if (!graveId || graveId <= 0) throw new Error('Grave ID should be valid');
    const detail = await MockTauri.invoke('get_grave_detail', { id: graveId });
    if (!detail) throw new Error('Grave should exist');
    if (detail.heirs.length !== 2) throw new Error('Expected 2 heirs, got ' + detail.heirs.length);
});

DataMakamTests.test('Update grave', async () => {
    const blockId = DataMakamTests._addBlock('A');
    const graveId = DataMakamTests._addGrave(blockId, 'Old Name', '01');
    await MockTauri.invoke('update_grave', { id: graveId, grave: { deceased_name: 'New Name', number: '99' } });
    const grave = await MockTauri.invoke('get_grave_by_id', { id: graveId });
    if (grave.deceased_name !== 'New Name') throw new Error('Name should be updated');
    if (grave.number !== '99') throw new Error('Number should be updated');
});

DataMakamTests.test('Delete grave removes heirs', async () => {
    const blockId = DataMakamTests._addBlock('A');
    const graveId = DataMakamTests._addGrave(blockId, 'To Delete', '01');
    MockTauri.db.heirs.push({ id: ++MockTauri.db.autoIncrement.heirs, grave_id: graveId, order_number: 1, full_name: 'Heir', phone_number: null, relationship: null, address: null, is_primary: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await MockTauri.invoke('delete_grave', { id: graveId });
    const heirs = await MockTauri.invoke('get_heirs_by_grave', { grave_id: graveId });
    if (heirs.length !== 0) throw new Error('Heirs should be cascade deleted');
});

DataMakamTests.test('Create grave with empty name fails', async () => {
    try {
        await MockTauri.invoke('create_grave_with_heirs', { grave: { deceased_name: '', block_id: 1, number: '01', date_of_death: '2024-01-01', grave_type: 'new', initial_fee_amount: 0 } });
        throw new Error('Should have thrown on empty name');
    } catch (e) { /* expected */ }
});

DataMakamTests.test('Create grave with 1-char name', async () => {
    try {
        await MockTauri.invoke('create_grave_with_heirs', { grave: { deceased_name: 'A', block_id: 1, number: '01', date_of_death: '2024-01-01', grave_type: 'new', initial_fee_amount: 0 } });
        throw new Error('Should have thrown on 1-char name');
    } catch (e) { /* expected */ }
});

DataMakamTests.test('Create grave with invalid block_id fails', async () => {
    try {
        await MockTauri.invoke('create_grave_with_heirs', { grave: { deceased_name: 'Almarhum', block_id: 9999, number: '01', date_of_death: '2024-01-01', grave_type: 'new', initial_fee_amount: 0 } });
        throw new Error('Should have thrown on invalid block_id');
    } catch (e) { /* expected */ }
});

DataMakamTests.test('Update non-existent grave fails', async () => {
    try {
        await MockTauri.invoke('update_grave', { id: 9999, grave: { deceased_name: 'Nope' } });
        throw new Error('Should have thrown on non-existent grave');
    } catch (e) { /* expected */ }
});

DataMakamTests.test('Delete non-existent grave fails', async () => {
    try {
        await MockTauri.invoke('delete_grave', { id: 9999 });
        throw new Error('Should have thrown on non-existent delete');
    } catch (e) { /* expected */ }
});

DataMakamTests.test('Count graves', async () => {
    const blockA = DataMakamTests._addBlock('A');
    const blockB = DataMakamTests._addBlock('B');
    for (let i = 1; i <= 5; i++) DataMakamTests._addGrave(blockA, `G${i}`, String(i).padStart(2, '0'));
    for (let i = 1; i <= 3; i++) DataMakamTests._addGrave(blockB, `H${i}`, String(i).padStart(2, '0'));
    const total = await MockTauri.invoke('count_graves', {});
    if (total !== 8) throw new Error('Expected 8 total, got ' + total);
    const blockACount = await MockTauri.invoke('count_graves', { block_id: blockA });
    if (blockACount !== 5) throw new Error('Expected 5 in block A, got ' + blockACount);
});

window.DataMakamTests = DataMakamTests;
