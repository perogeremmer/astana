// Settings Tests

const PengaturanTests = {
    tests: [], passed: 0, failed: 0,
    test(name, fn) { this.tests.push({ name, fn }); },
    async run() {
        this.passed = 0; this.failed = 0;
        console.log('⚙️ Running Pengaturan Tests...\n');
        for (const test of this.tests) {
            try { setupMockTauri(); await test.fn(); console.log(`✅ ${test.name}`); this.passed++; }
            catch (error) { console.error(`❌ ${test.name}: ${error.message}`); this.failed++; }
        }
        console.log(`\n📊 Pengaturan Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },
};

PengaturanTests.test('Load default settings', async () => {
    const settings = await MockTauri.invoke('get_settings');
    if (!settings.foundation_name) throw new Error('Foundation name should exist');
    if (settings.foundation_name !== 'Yayasan Wakaf Makam Al-Ikhlas') throw new Error('Default name mismatch');
});

PengaturanTests.test('Update settings', async () => {
    await MockTauri.invoke('update_settings', { settings: { foundation_name: 'Yayasan Baru', address: 'Alamat Baru', phone: '021123456', email: 'email@baru.com', active_year: 2030, auto_backup: false } });
    const settings = await MockTauri.invoke('get_settings');
    if (settings.foundation_name !== 'Yayasan Baru') throw new Error('Name should be updated');
    if (settings.address !== 'Alamat Baru') throw new Error('Address should be updated');
    if (settings.active_year !== 2030) throw new Error('Year should be 2030');
    if (settings.auto_backup !== false) throw new Error('Auto backup should be false');
});

PengaturanTests.test('Get database stats', async () => {
    const stats = await MockTauri.invoke('get_database_stats');
    if (stats.size_bytes === undefined) throw new Error('Should return size_bytes');
    if (stats.graves_count === undefined) throw new Error('Should return graves_count');
});

PengaturanTests.test('Get database path', async () => {
    const result = await MockTauri.invoke('get_database_path');
    if (!result.path) throw new Error('Should return path');
});

PengaturanTests.test('Get logo data returns null when not set', async () => {
    const result = await MockTauri.invoke('get_logo_data');
    if (result.data !== null) throw new Error('Logo data should be null when not set');
});

PengaturanTests.test('Update last backup', async () => {
    await MockTauri.invoke('update_last_backup');
    const days = await MockTauri.invoke('get_days_since_backup');
    if (days === 999) throw new Error('Days since backup should not be 999 after update');
});

window.PengaturanTests = PengaturanTests;
