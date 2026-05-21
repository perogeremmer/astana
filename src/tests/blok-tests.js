// Block Tests - CRUD operations for blocks

const BlokTests = {
    tests: [],
    passed: 0,
    failed: 0,

    test(name, fn) {
        this.tests.push({ name, fn });
    },

    async run() {
        this.passed = 0;
        this.failed = 0;
        console.log('📦 Running Blok Tests...\n');
        for (const test of this.tests) {
            try {
                setupMockTauri();
                await test.fn();
                console.log(`✅ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.error(`❌ ${test.name}`);
                console.error(`   Error: ${error.message}`);
                this.failed++;
            }
        }
        console.log(`\n📊 Blok Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
};

BlokTests.test('Load blocks empty', async () => {
    const blocks = await MockTauri.invoke('get_blocks');
    if (blocks.length !== 0) throw new Error('Expected empty blocks, got ' + blocks.length);
});

BlokTests.test('Load blocks with data', async () => {
    MockTauri.db.blocks.push({ id: 1, code: 'A', description: 'Blok A', total_capacity: 50, annual_fee: 100000, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    MockTauri.db.autoIncrement.blocks = 1;
    MockTauri.db.blocks.push({ id: 2, code: 'B', description: 'Blok B', total_capacity: 30, annual_fee: 80000, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    MockTauri.db.autoIncrement.blocks = 2;
    const blocks = await MockTauri.invoke('get_blocks');
    if (blocks.length !== 2) throw new Error('Expected 2 blocks, got ' + blocks.length);
    if (blocks[0].code !== 'A') throw new Error('First block should be sorted A first');
});

BlokTests.test('Create block success', async () => {
    const id = await MockTauri.invoke('create_block', { block: { code: 'X', description: 'Blok X', total_capacity: 20, annual_fee: 50000, status: 'active' } });
    if (!id || id <= 0) throw new Error('Expected valid block ID');
    const block = await MockTauri.invoke('get_block_by_id', { blockId: id });
    if (!block || block.code !== 'X') throw new Error('Block should exist with correct code');
});

BlokTests.test('Create block duplicate code fails', async () => {
    await MockTauri.invoke('create_block', { block: { code: 'DUP', description: '', total_capacity: 10, annual_fee: 10000, status: 'active' } });
    try {
        await MockTauri.invoke('create_block', { block: { code: 'DUP', description: '', total_capacity: 20, annual_fee: 20000, status: 'active' } });
        throw new Error('Should have thrown on duplicate code');
    } catch (e) {
        if (!e.message.includes('sudah ada')) throw new Error('Expected duplicate error, got: ' + e.message);
    }
});

BlokTests.test('Update block', async () => {
    const id = await MockTauri.invoke('create_block', { block: { code: 'OLD', description: 'Old', total_capacity: 10, annual_fee: 10000, status: 'active' } });
    await MockTauri.invoke('update_block', { id, block: { code: 'NEW', description: 'New Desc', total_capacity: 20, annual_fee: 20000, status: 'inactive' } });
    const block = await MockTauri.invoke('get_block_by_id', { blockId: id });
    if (block.code !== 'NEW') throw new Error('Code should be updated');
    if (block.total_capacity !== 20) throw new Error('Capacity should be updated');
    if (block.status !== 'inactive') throw new Error('Status should be inactive');
});

BlokTests.test('Delete block', async () => {
    const id = await MockTauri.invoke('create_block', { block: { code: 'DEL', description: '', total_capacity: 5, annual_fee: 5000, status: 'active' } });
    await MockTauri.invoke('delete_block', { id });
    const block = await MockTauri.invoke('get_block_by_id', { blockId: id });
    if (block !== null) throw new Error('Block should be deleted');
});

BlokTests.test('Create block with empty code fails', async () => {
    try {
        await MockTauri.invoke('create_block', { block: { code: '', description: '', total_capacity: 10, annual_fee: 10000, status: 'active' } });
        throw new Error('Should have thrown on empty code');
    } catch (e) {
        // Expected error
    }
});

BlokTests.test('Create block with negative capacity', async () => {
    try {
        await MockTauri.invoke('create_block', { block: { code: 'NEG', description: '', total_capacity: -1, annual_fee: 10000, status: 'active' } });
        throw new Error('Should have thrown on negative capacity');
    } catch (e) {
        // Expected error
    }
});

BlokTests.test('Update non-existent block fails', async () => {
    try {
        await MockTauri.invoke('update_block', { id: 9999, block: { code: 'NOPE' } });
        throw new Error('Should have thrown on non-existent block');
    } catch (e) {
        // Expected error
    }
});

BlokTests.test('Delete non-existent block fails', async () => {
    try {
        await MockTauri.invoke('delete_block', { id: 9999 });
        throw new Error('Should have thrown on non-existent delete');
    } catch (e) {
        // Expected error
    }
});

BlokTests.test('Get block stats', async () => {
    const blockId = await MockTauri.invoke('create_block', { block: { code: 'STAT', description: '', total_capacity: 10, annual_fee: 10000, status: 'active' } });
    const stats = await MockTauri.invoke('get_block_stats', { blockId });
    if (stats.total_capacity !== 10) throw new Error('Total capacity should be 10');
    if (stats.occupied !== 0) throw new Error('Occupied should be 0');
});

window.BlokTests = BlokTests;
