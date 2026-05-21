// Centralized Mock Tauri API for Astana Testing
// Covers all 53 commands used across all screens

const MockDB = {
    users: [],
    sessions: {},
    blocks: [],
    graves: [],
    heirs: [],
    payments: [],
    settings: {
        id: 1,
        foundation_name: "Yayasan Wakaf Makam Al-Ikhlas",
        address: "Jl. Raya No. 123",
        phone: "(022) 1234567",
        email: "info@wakafmakam.id",
        logo_path: null,
        active_year: 2026,
        last_backup: null,
        auto_backup: true,
    },
    audit_logs: [],
    autoIncrement: {
        users: 0,
        blocks: 0,
        graves: 0,
        heirs: 0,
        payments: 0,
        audit_logs: 0,
    },
    appVersion: "1.8.2",
};

const MockTauri = {
    db: MockDB,

    reset() {
        this.db = {
            users: [],
            sessions: {},
            blocks: [],
            graves: [],
            heirs: [],
            payments: [],
            settings: {
                id: 1,
                foundation_name: "Yayasan Wakaf Makam Al-Ikhlas",
                address: "Jl. Raya No. 123",
                phone: "(022) 1234567",
                email: "info@wakafmakam.id",
                logo_path: null,
                active_year: 2026,
                last_backup: null,
                auto_backup: true,
            },
            audit_logs: [],
            autoIncrement: {
                users: 0, blocks: 0, graves: 0, heirs: 0, payments: 0, audit_logs: 0,
            },
            appVersion: "1.8.2",
        };
        this.addDefaultSuperadmin();
    },

    addDefaultSuperadmin() {
        this.db.users.push({
            id: ++this.db.autoIncrement.users,
            username: "superadmin",
            password: "test123",
            full_name: "Superadmin Utama",
            role: "superadmin_0",
            is_active: true,
            is_password_changed: false,
            created_by: null,
        });
    },

    async invoke(command, args) {
        switch (command) {
            case 'login': return this._login(args);
            case 'logout': return this._logout(args);
            case 'validate_session': return this._validateSession(args);
            case 'change_password': return this._changePassword(args);
            case 'check_database_status': return this._checkDatabaseStatus(args);
            case 'check_first_run': return { is_first_run: this.db.users.length === 0 };
            case 'init_superadmin_0': return this._initSuperadmin0(args);
            case 'get_initial_password': return { password: "init_password_123" };

            case 'get_current_user': return this._getCurrentUser(args);
            case 'get_users': return this._getUsers(args);
            case 'create_user': return this._createUser(args);
            case 'update_user': return this._updateUser(args);
            case 'delete_user': return this._deleteUser(args);
            case 'reset_user_password': return this._resetUserPassword(args);

            case 'get_blocks': return this._getBlocks(args);
            case 'get_block_by_id': return this._getBlockById(args);
            case 'create_block': return this._createBlock(args);
            case 'update_block': return this._updateBlock(args);
            case 'delete_block': return this._deleteBlock(args);
            case 'get_block_stats': return this._getBlockStats(args);

            case 'get_graves': return this._getGraves(args);
            case 'count_graves': return this._countGraves(args);
            case 'get_grave_by_id': return this._getGraveById(args);
            case 'create_grave_with_heirs': return this._createGraveWithHeirs(args);
            case 'update_grave': return this._updateGrave(args);
            case 'delete_grave': return this._deleteGrave(args);
            case 'get_grave_detail': return this._getGraveDetail(args);
            case 'get_all_graves_with_heirs': return this._getAllGravesWithHeirs(args);
            case 'export_graves': return this._exportGraves(args);
            case 'save_excel_file': return { success: true };

            case 'get_heirs_by_grave': return this._getHeirsByGrave(args);
            case 'create_heir': return this._createHeir(args);
            case 'update_heir': return this._updateHeir(args);
            case 'delete_heir': return this._deleteHeir(args);
            case 'delete_heirs_by_grave': return this._deleteHeirsByGrave(args);
            case 'update_grave_heirs': return this._updateGraveHeirs(args);

            case 'get_payments_by_grave': return this._getPaymentsByGrave(args);
            case 'get_payment_by_grave_and_year': return this._getPaymentByGraveAndYear(args);
            case 'create_payment': return this._createPayment(args);
            case 'create_multi_year_payments': return this._createMultiYearPayments(args);
            case 'delete_payment': return this._deletePayment(args);
            case 'get_grave_payment_detail': return this._getGravePaymentDetail(args);
            case 'count_graves_with_payment_status': return this._countGravesWithPaymentStatus(args);
            case 'get_graves_with_payment_summary': return this._getGravesWithPaymentSummary(args);
            case 'get_payment_proof_data': return { data: null };

            case 'generate_single_receipt': return { pdf_bytes: [37, 80, 68, 70] };
            case 'generate_combined_receipt': return { pdf_bytes: [37, 80, 68, 70] };
            case 'generate_pdf_report': return { pdf_bytes: [37, 80, 68, 70] };

            case 'get_settings': return { ...this.db.settings };
            case 'update_settings': return this._updateSettings(args);
            case 'get_logo_data': return { data: null };
            case 'upload_logo': return { success: true, path: "/mock/logo.png" };
            case 'upload_payment_proof': return { success: true, path: "/mock/proof.png" };
            case 'get_database_stats': return { size_bytes: 102400, graves_count: this.db.graves.length, heirs_count: this.db.heirs.length, payments_count: this.db.payments.length };
            case 'get_database_path': return { path: "/mock/astana.db" };
            case 'update_last_backup': this.db.settings.last_backup = new Date().toISOString(); return {};
            case 'backup_database_with_dialog': return { success: true };
            case 'restore_database_with_dialog': return { success: true };
            case 'open_database_folder': return {};
            case 'import_database': return { success: true };
            case 'clear_cache_and_reload': return {};
            case 'get_app_version': return { version: this.db.appVersion };

            case 'get_dashboard_stats': return this._getDashboardStats(args);
            case 'get_recent_payments': return this._getRecentPayments(args);
            case 'get_recent_graves': return this._getRecentGraves(args);
            case 'get_financial_summary': return this._getFinancialSummary(args);
            case 'get_days_since_backup': return this.db.settings.last_backup ? 5 : 999;
            case 'get_total_capacity': return this._getTotalCapacity(args);
            case 'get_yearly_report': return this._getYearlyReport(args);
            case 'get_available_years': return this._getAvailableYears(args);
            case 'get_graves_payment_detail': return this._getGravesPaymentDetail(args);

            case 'get_audit_logs': return this._getAuditLogs(args);
            case 'count_audit_logs': return this._countAuditLogs(args);

            default:
                console.warn(`[MockTauri] Unknown command: ${command}`);
                return null;
        }
    },

    _requireSession(args) {
        if (!args || !args.token || !this.db.sessions[args.token]) {
            throw new Error('Sesi tidak valid');
        }
        return this.db.sessions[args.token];
    },

    _autoAudit(action, detail, userId) {
        this.db.audit_logs.push({
            id: ++this.db.autoIncrement.audit_logs,
            user_id: userId || null,
            username: userId ? (this.db.users.find(u => u.id === userId)?.username || 'unknown') : null,
            action: action,
            details: detail,
            entity_id: null,
            entity_type: null,
            old_value: null,
            new_value: null,
            created_at: new Date().toISOString(),
        });
    },

    // ==================== AUTH ====================

    _login({ username, password }) {
        const user = this.db.users.find(u => u.username === username && u.password === password);
        if (!user) return { success: false, message: 'Username atau password salah', user: null, must_change_password: false };
        if (!user.is_active) return { success: false, message: 'Akun tidak aktif', user: null, must_change_password: false };
        const token = 'mock_token_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        this.db.sessions[token] = { user_id: user.id, username: user.username };
        return {
            success: true, token, must_change_password: !user.is_password_changed,
            user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, is_active: user.is_active, is_password_changed: user.is_password_changed },
            message: 'Login berhasil',
        };
    },

    _logout({ token }) {
        delete this.db.sessions[token];
        return {};
    },

    _validateSession({ token }) {
        return !!this.db.sessions[token];
    },

    _changePassword({ token, new_password, old_password }) {
        const session = this._requireSession({ token });
        const user = this.db.users.find(u => u.id === session.user_id);
        if (!user) throw new Error('User not found');
        if (old_password && user.password !== old_password) {
            return { success: false, message: 'Password lama salah' };
        }
        user.password = new_password;
        user.is_password_changed = true;
        return { success: true };
    },

    _checkDatabaseStatus() {
        return { exists: true, is_first_run: this.db.users.length === 0 };
    },

    _initSuperadmin0({ password }) {
        if (this.db.users.length > 0) return { success: false, message: 'Sudah ada user' };
        this.addDefaultSuperadmin();
        this.db.users[0].password = password;
        return { success: true };
    },

    // ==================== USERS ====================

    _getCurrentUser({ token }) {
        const session = this._requireSession({ token });
        return this.db.users.find(u => u.id === session.user_id) || null;
    },

    _getUsers({ token }) {
        this._requireSession({ token });
        return { success: true, data: this.db.users.map(u => ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role, is_active: u.is_active, is_password_changed: u.is_password_changed })) };
    },

    _createUser({ token, user }) {
        this._requireSession({ token });
        if (!user.username || user.username.trim() === '') return { success: false, message: 'Username tidak boleh kosong' };
        if (user.username.length < 3) return { success: false, message: 'Username minimal 3 karakter' };
        if (this.db.users.find(u => u.username.toLowerCase() === user.username.toLowerCase())) {
            return { success: false, message: 'Username sudah ada' };
        }
        if (user.password.length < 6) return { success: false, message: 'Password minimal 6 karakter' };
        const validRoles = ['admin', 'superadmin', 'superadmin_0'];
        if (!validRoles.includes(user.role)) return { success: false, message: 'Role tidak valid' };
        const newUser = {
            id: ++this.db.autoIncrement.users,
            username: user.username,
            password: user.password,
            full_name: user.full_name || null,
            role: user.role,
            is_active: true,
            is_password_changed: false,
            created_by: this.db.sessions[token].user_id,
        };
        this.db.users.push(newUser);
        this._autoAudit('CREATE_USER', `User ${user.username} created`, this.db.sessions[token].user_id);
        return { success: true, data: newUser.id };
    },

    _updateUser({ token, user_id, user }) {
        this._requireSession({ token });
        const existing = this.db.users.find(u => u.id === user_id);
        if (!existing) return { success: false, message: 'User tidak ditemukan' };
        if (user.role && !['admin', 'superadmin', 'superadmin_0'].includes(user.role)) {
            return { success: false, message: 'Role tidak valid' };
        }
        if (user.role) existing.role = user.role;
        if (user.is_active !== undefined) existing.is_active = user.is_active;
        if (user.full_name !== undefined) existing.full_name = user.full_name;
        return { success: true };
    },

    _deleteUser({ token, user_id }) {
        this._requireSession({ token });
        const user = this.db.users.find(u => u.id === user_id);
        if (!user) return { success: false, message: 'User tidak ditemukan' };
        if (user.role === 'superadmin_0') return { success: false, message: 'Superadmin_0 tidak dapat dihapus' };
        const idx = this.db.users.indexOf(user);
        this.db.users.splice(idx, 1);
        this._autoAudit('DELETE_USER', `User ${user.username} deleted`, this.db.sessions[token].user_id);
        return { success: true };
    },

    _resetUserPassword({ token, user_id, new_password }) {
        this._requireSession({ token });
        const user = this.db.users.find(u => u.id === user_id);
        if (!user) return { success: false, message: 'User tidak ditemukan' };
        user.password = new_password || 'default_new_password';
        user.is_password_changed = false;
        this._autoAudit('RESET_PASSWORD', `Password reset for user ${user.username}`, this.db.sessions[token].user_id);
        return { success: true, data: user.password };
    },

    // ==================== BLOCKS ====================

    _getBlocks() {
        return [...this.db.blocks].sort((a, b) => a.code.localeCompare(b.code));
    },

    _getBlockById({ blockId }) {
        return this.db.blocks.find(b => b.id === blockId) || null;
    },

    _createBlock({ block }) {
        if (!block || !block.code || block.code.trim() === '') {
            throw new Error('Kode blok tidak boleh kosong');
        }
        if (typeof block.total_capacity === 'number' && block.total_capacity < 0) {
            throw new Error('Kapasitas tidak boleh negatif');
        }
        if (this.db.blocks.find(b => b.code === block.code)) {
            throw new Error('Kode blok sudah ada');
        }
        const now = new Date().toISOString();
        const newBlock = {
            id: ++this.db.autoIncrement.blocks,
            code: block.code,
            description: block.description || '',
            total_capacity: block.total_capacity || 0,
            annual_fee: block.annual_fee || 0,
            status: block.status || 'active',
            created_at: now,
            updated_at: now,
        };
        this.db.blocks.push(newBlock);
        return newBlock.id;
    },

    _updateBlock({ id, block }) {
        const existing = this.db.blocks.find(b => b.id === id);
        if (!existing) throw new Error('Block not found');
        if (block.code !== undefined) existing.code = block.code;
        if (block.description !== undefined) existing.description = block.description;
        if (block.total_capacity !== undefined) existing.total_capacity = block.total_capacity;
        if (block.annual_fee !== undefined) existing.annual_fee = block.annual_fee;
        if (block.status !== undefined) existing.status = block.status;
        existing.updated_at = new Date().toISOString();
        return {};
    },

    _deleteBlock({ id }) {
        const idx = this.db.blocks.findIndex(b => b.id === id);
        if (idx === -1) throw new Error('Block not found');
        if (this.db.graves.some(g => g.block_id === id)) {
            throw new Error('Cannot delete block with graves');
        }
        this.db.blocks.splice(idx, 1);
        return {};
    },

    _getBlockStats({ blockId }) {
        const block = this.db.blocks.find(b => b.id === blockId);
        if (!block) return { total_capacity: 0, occupied: 0, available: 0 };
        const occupied = this.db.graves.filter(g => g.block_id === blockId).length;
        return { total_capacity: block.total_capacity, occupied, available: block.total_capacity - occupied };
    },

    // ==================== GRAVES ====================

    _getGraves({ search, block_id, limit, offset, sort_field, sort_order }) {
        let results = [...this.db.graves];
        if (search) {
            const s = search.toLowerCase();
            results = results.filter(g => g.deceased_name.toLowerCase().includes(s) || g.number.toLowerCase().includes(s));
        }
        if (block_id) results = results.filter(g => g.block_id === block_id);
        // Sort
        results.sort((a, b) => a.id - b.id);
        // Pagination
        const total = results.length;
        const page = results.slice(offset || 0, (offset || 0) + (limit || 30));
        return {
            data: page.map(g => {
                const block = this.db.blocks.find(b => b.id === g.block_id);
                const heirs = this.db.heirs.filter(h => h.grave_id === g.id);
                return {
                    ...g,
                    code: block ? block.code : '',
                    annual_fee: block ? block.annual_fee : 0,
                    heirs,
                };
            }),
            total,
        };
    },

    _countGraves({ search, block_id }) {
        let results = [...this.db.graves];
        if (search) results = results.filter(g => g.deceased_name.toLowerCase().includes(search.toLowerCase()));
        if (block_id) results = results.filter(g => g.block_id === block_id);
        return results.length;
    },

    _getGraveById({ id }) {
        const grave = this.db.graves.find(g => g.id === id);
        if (!grave) return null;
        const block = this.db.blocks.find(b => b.id === grave.block_id);
        const heirs = this.db.heirs.filter(h => h.grave_id === id);
        return { ...grave, code: block ? block.code : '', annual_fee: block ? block.annual_fee : 0, heirs };
    },

    _createGraveWithHeirs({ grave }) {
        if (!grave || !grave.deceased_name || grave.deceased_name.trim() === '') {
            throw new Error('Nama almarhum tidak boleh kosong');
        }
        if (grave.deceased_name.trim().length < 2) {
            throw new Error('Nama almarhum minimal 2 karakter');
        }
        if (grave.block_id && !this.db.blocks.some(b => b.id === grave.block_id)) {
            throw new Error('Blok tidak ditemukan');
        }
        const now = new Date().toISOString();
        const newGrave = {
            id: ++this.db.autoIncrement.graves,
            deceased_name: grave.deceased_name,
            block_id: grave.block_id,
            number: grave.number,
            date_of_death: grave.date_of_death || null,
            burial_date: grave.burial_date || null,
            birth_place: grave.birth_place || null,
            birth_date: grave.birth_date || null,
            notes: grave.notes || null,
            grave_type: grave.grave_type || 'new',
            initial_fee_amount: grave.initial_fee_amount || 0,
            initial_fee_payment_date: grave.initial_fee_payment_date || null,
            initial_fee_payment_method: grave.initial_fee_payment_method || null,
            initial_fee_payment_proof: grave.initial_fee_payment_proof || null,
            created_at: now,
            updated_at: now,
        };
        this.db.graves.push(newGrave);
        if (grave.heirs && Array.isArray(grave.heirs)) {
            grave.heirs.forEach((h, i) => {
                this._createHeir({ heir: { ...h, grave_id: newGrave.id, order_number: i + 1 } });
            });
        }
        return newGrave.id;
    },

    _updateGrave({ id, grave }) {
        const existing = this.db.graves.find(g => g.id === id);
        if (!existing) throw new Error('Grave not found');
        Object.keys(grave).forEach(key => {
            if (grave[key] !== undefined) existing[key] = grave[key];
        });
        existing.updated_at = new Date().toISOString();
        return {};
    },

    _deleteGrave({ id }) {
        const idx = this.db.graves.findIndex(g => g.id === id);
        if (idx === -1) throw new Error('Grave not found');
        this.db.graves.splice(idx, 1);
        this.db.heirs = this.db.heirs.filter(h => h.grave_id !== id);
        this.db.payments = this.db.payments.filter(p => p.grave_id !== id);
        return {};
    },

    _getGraveDetail({ id }) {
        const grave = this.db.graves.find(g => g.id === id);
        if (!grave) return null;
        const block = this.db.blocks.find(b => b.id === grave.block_id);
        const heirs = this.db.heirs.filter(h => h.grave_id === id);
        const payments = this.db.payments.filter(p => p.grave_id === id);
        return { ...grave, code: block ? block.code : '', annual_fee: block ? block.annual_fee : 0, heirs, payments };
    },

    _getAllGravesWithHeirs({ search, block_id }) {
        let results = [...this.db.graves];
        if (search) results = results.filter(g => g.deceased_name.toLowerCase().includes(search.toLowerCase()));
        if (block_id) results = results.filter(g => g.block_id === block_id);
        return results.map(g => {
            const heirs = this.db.heirs.filter(h => h.grave_id === g.id);
            const block = this.db.blocks.find(b => b.id === g.block_id);
            return { ...g, heirs, code: block ? block.code : '' };
        });
    },

    _exportGraves({ search, block_id }) {
        return this._getAllGravesWithHeirs({ search, block_id });
    },

    // ==================== HEIRS ====================

    _getHeirsByGrave({ grave_id }) {
        return this.db.heirs.filter(h => h.grave_id === grave_id).sort((a, b) => a.order_number - b.order_number);
    },

    _createHeir({ heir }) {
        const now = new Date().toISOString();
        const newHeir = {
            id: ++this.db.autoIncrement.heirs,
            grave_id: heir.grave_id,
            order_number: heir.order_number || 1,
            full_name: heir.full_name,
            phone_number: heir.phone_number || null,
            relationship: heir.relationship || null,
            address: heir.address || null,
            is_primary: heir.is_primary || false,
            created_at: now,
            updated_at: now,
        };
        this.db.heirs.push(newHeir);
        return newHeir.id;
    },

    _updateHeir({ id, heir }) {
        const existing = this.db.heirs.find(h => h.id === id);
        if (!existing) throw new Error('Heir not found');
        if (heir.full_name !== undefined) existing.full_name = heir.full_name;
        if (heir.phone_number !== undefined) existing.phone_number = heir.phone_number;
        if (heir.relationship !== undefined) existing.relationship = heir.relationship;
        if (heir.address !== undefined) existing.address = heir.address;
        if (heir.is_primary !== undefined) existing.is_primary = heir.is_primary;
        existing.updated_at = new Date().toISOString();
        return {};
    },

    _deleteHeir({ id }) {
        const idx = this.db.heirs.findIndex(h => h.id === id);
        if (idx === -1) throw new Error('Heir not found');
        this.db.heirs.splice(idx, 1);
        return {};
    },

    _deleteHeirsByGrave({ grave_id }) {
        this.db.heirs = this.db.heirs.filter(h => h.grave_id !== grave_id);
        return {};
    },

    _updateGraveHeirs({ grave_id, heirs }) {
        this.db.heirs = this.db.heirs.filter(h => h.grave_id !== grave_id);
        heirs.forEach((h, i) => {
            this._createHeir({ heir: { ...h, grave_id, order_number: i + 1 } });
        });
        return {};
    },

    // ==================== PAYMENTS ====================

    _getPaymentsByGrave({ grave_id }) {
        return this.db.payments.filter(p => p.grave_id === grave_id).sort((a, b) => b.year - a.year);
    },

    _getPaymentByGraveAndYear({ grave_id, year }) {
        return this.db.payments.find(p => p.grave_id === grave_id && p.year === year) || null;
    },

    _createPayment({ payment }) {
        if (!payment || payment.amount < 0) {
            throw new Error('Jumlah pembayaran tidak valid');
        }
        if (payment.year < 1900 || payment.year > 2100) {
            throw new Error('Tahun pembayaran tidak valid');
        }
        if (!this.db.graves.some(g => g.id === payment.grave_id)) {
            throw new Error('Makam tidak ditemukan');
        }
        const existing = this.db.payments.find(p => p.grave_id === payment.grave_id && p.year === payment.year);
        if (existing) throw new Error('Pembayaran untuk tahun ini sudah ada');
        const block = this.db.blocks.find(b => this.db.graves.some(g => g.id === payment.grave_id && g.block_id === b.id));
        const expected_fee = payment.expected_fee > 0 ? payment.expected_fee : (block ? block.annual_fee : 0);
        const now = new Date().toISOString();
        const newPayment = {
            id: ++this.db.autoIncrement.payments,
            grave_id: payment.grave_id,
            year: payment.year,
            payment_date: payment.payment_date || now,
            amount: payment.amount || 0,
            expected_fee,
            payment_method: payment.payment_method || 'cash',
            payment_proof: payment.payment_proof || null,
            paid_by: payment.paid_by || null,
            notes: payment.notes || null,
            inputted_by: payment.inputted_by || null,
            received_by: payment.received_by || null,
            created_at: now,
            updated_at: now,
        };
        this.db.payments.push(newPayment);
        return newPayment.id;
    },

    _createMultiYearPayments({ grave_id, years, payment_date, amount, expected_fee, payment_method, paid_by }) {
        const ids = [];
        years.sort().forEach(year => {
            const id = this._createPayment({ payment: { grave_id, year, payment_date, amount, expected_fee, payment_method, paid_by } });
            ids.push(id);
        });
        return ids;
    },

    _deletePayment({ id }) {
        const idx = this.db.payments.findIndex(p => p.id === id);
        if (idx === -1) throw new Error('Payment not found');
        this.db.payments.splice(idx, 1);
        return {};
    },

    _getGravePaymentDetail({ grave_id }) {
        const grave = this.db.graves.find(g => g.id === grave_id);
        if (!grave) return null;
        const block = this.db.blocks.find(b => b.id === grave.block_id);
        const primaryHeir = this.db.heirs.find(h => h.grave_id === grave_id && h.is_primary);
        return {
            grave_id: grave.id,
            deceased_name: grave.deceased_name,
            grave_type: grave.grave_type,
            grave_number: grave.number,
            block_code: block ? block.code : '',
            annual_fee: block ? block.annual_fee : 0,
            heir_name: primaryHeir ? primaryHeir.full_name : null,
            heir_address: primaryHeir ? primaryHeir.address : null,
            notes: grave.notes,
        };
    },

    _countGravesWithPaymentStatus({ year }) {
        const total = this.db.graves.length;
        const paid = this.db.payments.filter(p => p.year === year).length;
        const unpaid = total - paid;
        return { total, paid, unpaid };
    },

    _getGravesWithPaymentSummary({ year }) {
        return this.db.graves.map(g => {
            const block = this.db.blocks.find(b => b.id === g.block_id);
            const payment = this.db.payments.find(p => p.grave_id === g.id && p.year === year);
            const primaryHeir = this.db.heirs.find(h => h.grave_id === g.id && h.is_primary);
            return {
                grave_id: g.id,
                deceased_name: g.deceased_name,
                block_code: block ? block.code : '',
                grave_number: g.number,
                annual_fee: block ? block.annual_fee : 0,
                heir_name: primaryHeir ? primaryHeir.full_name : null,
                status: payment ? 'paid' : 'unpaid',
                amount: payment ? payment.amount : 0,
                payment_date: payment ? payment.payment_date : null,
            };
        });
    },

    // ==================== SETTINGS ====================

    _updateSettings({ settings }) {
        if (settings.foundation_name !== undefined) this.db.settings.foundation_name = settings.foundation_name;
        if (settings.address !== undefined) this.db.settings.address = settings.address;
        if (settings.phone !== undefined) this.db.settings.phone = settings.phone;
        if (settings.email !== undefined) this.db.settings.email = settings.email;
        if (settings.logo_path !== undefined) this.db.settings.logo_path = settings.logo_path;
        if (settings.active_year !== undefined) this.db.settings.active_year = settings.active_year;
        if (settings.auto_backup !== undefined) this.db.settings.auto_backup = settings.auto_backup;
        return {};
    },

    // ==================== DASHBOARD ====================

    _getDashboardStats() {
        const total_graves = this.db.graves.length;
        const total_blocks = this.db.blocks.length;
        const total_heirs = this.db.heirs.length;
        const active_year = this.db.settings.active_year;
        const financial = this._getFinancialSummary({ year: active_year });
        return { active_year, total_graves, total_blocks, total_heirs, ...financial };
    },

    _getRecentPayments({ limit }) {
        return [...this.db.payments]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, limit || 5)
            .map(p => {
                const grave = this.db.graves.find(g => g.id === p.grave_id);
                const block = grave ? this.db.blocks.find(b => b.id === grave.block_id) : null;
                return {
                    id: p.id, grave_id: p.grave_id, year: p.year, payment_date: p.payment_date,
                    amount: p.amount, deceased_name: grave ? grave.deceased_name : '',
                    block_code: block ? block.code : '', grave_number: grave ? grave.number : '',
                };
            });
    },

    _getRecentGraves({ limit }) {
        return [...this.db.graves]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, limit || 5)
            .map(g => {
                const block = this.db.blocks.find(b => b.id === g.block_id);
                const has_paid_current_year = this.db.payments.some(p => p.grave_id === g.id && p.year === this.db.settings.active_year);
                return {
                    id: g.id, deceased_name: g.deceased_name, date_of_death: g.date_of_death,
                    created_at: g.created_at, block_code: block ? block.code : '',
                    grave_number: g.number, has_paid_current_year,
                };
            });
    },

    _getFinancialSummary({ year }) {
        const paymentsInYear = this.db.payments.filter(p => p.year === year);
        const total_revenue = paymentsInYear.reduce((sum, p) => sum + p.amount, 0);
        const paidIds = new Set(paymentsInYear.map(p => p.grave_id));
        const unpaid_count = this.db.graves.filter(g => !paidIds.has(g.id)).length;
        const total_arrears = unpaid_count * 100000;
        const now = new Date();
        const thisMonth = now.toISOString().slice(0, 7);
        const thisYear = now.getFullYear();
        const new_graves_this_month = this.db.graves.filter(g => g.created_at && g.created_at.startsWith(thisMonth)).length;
        const new_graves_this_year = this.db.graves.filter(g => g.created_at && g.created_at.startsWith(String(thisYear))).length;
        return { year, total_revenue, unpaid_count, total_arrears, new_graves_this_month, new_graves_this_year };
    },

    // ==================== REPORTS ====================

    _getTotalCapacity() {
        return this.db.blocks.reduce((sum, b) => sum + b.total_capacity, 0);
    },

    _getYearlyReport({ year }) {
        const active_year = this.db.settings.active_year;
        let block_reports = this.db.blocks.map(b => {
            const gravesInBlock = this.db.graves.filter(g => g.block_id === b.id);
            const total_graves = gravesInBlock.length;
            const paid = gravesInBlock.filter(g => this.db.payments.some(p => p.grave_id === g.id && p.year === year));
            const paid_count = paid.length;
            const unpaid_count = total_graves - paid_count;
            const total_revenue = paid.reduce((sum, g) => {
                const p = this.db.payments.find(pay => pay.grave_id === g.id && pay.year === year);
                return sum + (p ? p.amount : 0);
            }, 0);
            return {
                block_id: b.id, block_code: b.code, total_capacity: b.total_capacity,
                total_graves, paid_count, unpaid_count, annual_fee: b.annual_fee,
                total_revenue, expected_revenue: total_graves * b.annual_fee,
                collection_rate: total_graves > 0 ? (paid_count / total_graves) * 100 : 0,
            };
        });
        const totals = block_reports.reduce((acc, r) => ({
            total_graves: acc.total_graves + r.total_graves,
            total_paid: acc.total_paid + r.paid_count,
            total_unpaid: acc.total_unpaid + r.unpaid_count,
            total_revenue: acc.total_revenue + r.total_revenue,
        }), { total_graves: 0, total_paid: 0, total_unpaid: 0, total_revenue: 0 });
        return {
            year, active_year,
            total_graves: totals.total_graves,
            total_paid: totals.total_paid,
            total_unpaid: totals.total_unpaid,
            total_revenue: totals.total_revenue,
            total_expected_revenue: block_reports.reduce((s, r) => s + r.expected_revenue, 0),
            overall_collection_rate: totals.total_graves > 0 ? (totals.total_paid / totals.total_graves) * 100 : 0,
            new_graves_count: this.db.graves.length,
            block_reports,
            new_graves_per_block: {},
        };
    },

    _getAvailableYears() {
        const years = new Set();
        this.db.payments.forEach(p => years.add(p.year));
        years.add(this.db.settings.active_year);
        years.add(new Date().getFullYear());
        return [...years].sort((a, b) => b - a);
    },

    _getGravesPaymentDetail({ year }) {
        return this.db.graves.map(g => {
            const block = this.db.blocks.find(b => b.id === g.block_id);
            const payment = this.db.payments.find(p => p.grave_id === g.id && p.year === year);
            return {
                id: g.id, deceased_name: g.deceased_name, block_code: block ? block.code : '',
                grave_number: g.number, annual_fee: block ? block.annual_fee : 0,
                status: payment ? 'Paid' : 'Unpaid',
                amount: payment ? payment.amount : null,
                payment_date: payment ? payment.payment_date : null,
            };
        });
    },

    // ==================== AUDIT LOGS ====================

    _getAuditLogs({ limit, offset, filter_user_id, filter_action }) {
        let logs = [...this.db.audit_logs];
        if (filter_user_id) logs = logs.filter(l => l.user_id === filter_user_id);
        if (filter_action) logs = logs.filter(l => l.action === filter_action);
        const total = logs.length;
        const page = logs.sort((a, b) => b.id - a.id).slice(offset || 0, (offset || 0) + (limit || 10));
        return { data: page, total };
    },

    _countAuditLogs() {
        return this.db.audit_logs.length;
    },
};

// Setup mock to replace window.__TAURI__
function setupMockTauri() {
    MockTauri.reset();
    window.__TAURI__ = {
        core: {
            invoke: (command, args) => MockTauri.invoke(command, args),
        },
    };
}

// Export for test use
window.MockTauri = MockTauri;
window.setupMockTauri = setupMockTauri;

console.log('✅ MockTauri loaded. Run setupMockTauri() to initialize.');
