// Command Parameter Validation Tests
// Tests to ensure all commands that require 'token' parameter receive it

const CommandParameterTests = {
    // List of commands that require 'token' parameter
    // This should be kept in sync with lib.rs
    commandsRequiringToken: [
        'create_block',
        'update_block', 
        'delete_block',
        'create_grave_with_heirs',
        'update_grave',
        'delete_grave',
        'create_payment',
        'delete_payment',
        'update_settings',
        'backup_database_with_dialog',
        'generate_pdf_report',
        'export_graves',
        'create_user',
        'update_user',
        'delete_user',
        'reset_user_password',
        'get_audit_logs',
        'count_audit_logs'
    ],
    
    // List of commands that do NOT require token
    commandsWithoutToken: [
        'login',
        'check_first_run',
        'init_superadmin_0',
        'get_initial_password',
        'get_blocks',
        'get_block_by_id',
        'get_graves',
        'get_grave_by_id',
        'get_grave_detail',
        'get_payments_by_grave',
        'get_settings',
        'get_database_path',
        'get_database_stats',
        'get_dashboard_stats',
        'get_recent_payments',
        'get_recent_graves',
        'get_financial_summary',
        'get_days_since_backup',
        'get_yearly_report',
        'get_available_years',
        'get_app_version',
        'get_logo_data',
        'update_grave_heirs',
        'get_heirs_by_grave',
        'create_heir',
        'update_heir',
        'delete_heir',
        'count_graves',
        'count_graves_with_payment_status',
        'get_block_stats',
        'save_excel_file',
        'upload_logo',
        'update_last_backup',
        'restore_database_with_dialog',
        'open_database_folder',
        'check_database_status',
        'import_database',
        'update_payment' // This command doesn't have audit logging yet
    ],
    
    /**
     * Scan JavaScript files for invoke calls and validate token parameter
     * This is a runtime check that should be run during development
     */
    validateAllInvocations() {
        const errors = [];
        
        // Get all JavaScript files content (in browser context)
        const scripts = document.querySelectorAll('script[src*=".js"]');
        
        scripts.forEach(script => {
            // Note: In actual implementation, we'd need to fetch and parse the JS files
            // For now, this is a placeholder for the validation logic
            console.log(`Checking ${script.src}...`);
        });
        
        return errors;
    },
    
    /**
     * Mock invoke function that validates token parameter
     * Use this in tests instead of the real invoke
     */
    createMockInvoke() {
        return async (command, args = {}) => {
            // Check if this command requires token
            if (this.commandsRequiringToken.includes(command)) {
                if (!args.token) {
                    throw new Error(
                        `Command '${command}' requires 'token' parameter but it was not provided. ` +
                        `Make sure to call window.astanaApp.getSessionToken() and pass it as 'token' parameter.`
                    );
                }
                
                // Validate token format (should be a non-empty string)
                if (typeof args.token !== 'string' || args.token.length === 0) {
                    throw new Error(
                        `Command '${command}' received invalid token: ${args.token}. ` +
                        `Token must be a non-empty string.`
                    );
                }
            }
            
            // If we get here, validation passed
            console.log(`✓ Command '${command}' parameter validation passed`);
            return { success: true };
        };
    },
    
    /**
     * Test suite for token parameter validation
     */
    async runTests() {
        console.log('Running Command Parameter Tests...\n');
        
        const mockInvoke = this.createMockInvoke();
        let passed = 0;
        let failed = 0;
        
        // Test 1: Commands requiring token should fail without it
        console.log('Test 1: Commands requiring token should fail without token');
        for (const command of this.commandsRequiringToken) {
            try {
                await mockInvoke(command, {});
                console.error(`✗ FAIL: ${command} should have thrown error for missing token`);
                failed++;
            } catch (error) {
                if (error.message.includes("requires 'token' parameter")) {
                    console.log(`✓ PASS: ${command} correctly rejects missing token`);
                    passed++;
                } else {
                    console.error(`✗ FAIL: ${command} threw unexpected error:`, error.message);
                    failed++;
                }
            }
        }
        
        // Test 2: Commands requiring token should succeed with valid token
        console.log('\nTest 2: Commands requiring token should succeed with valid token');
        for (const command of this.commandsRequiringToken) {
            try {
                await mockInvoke(command, { token: 'valid-test-token' });
                console.log(`✓ PASS: ${command} accepts valid token`);
                passed++;
            } catch (error) {
                console.error(`✗ FAIL: ${command} should accept valid token:`, error.message);
                failed++;
            }
        }
        
        // Test 3: Commands without token should work without it
        console.log('\nTest 3: Commands without token should work without token');
        for (const command of this.commandsWithoutToken) {
            try {
                await mockInvoke(command, {});
                console.log(`✓ PASS: ${command} works without token`);
                passed++;
            } catch (error) {
                if (error.message.includes("requires 'token' parameter")) {
                    console.error(`✗ FAIL: ${command} should not require token but does`);
                    failed++;
                } else {
                    // Other errors are fine
                    console.log(`✓ PASS: ${command} works without token (other error: ${error.message})`);
                    passed++;
                }
            }
        }
        
        // Test 4: Invalid token formats should be rejected
        console.log('\nTest 4: Invalid token formats should be rejected');
        const invalidTokens = [null, undefined, '', 123, {}, []];
        for (const invalidToken of invalidTokens) {
            try {
                await mockInvoke('create_block', { token: invalidToken });
                console.error(`✗ FAIL: create_block should reject token: ${invalidToken}`);
                failed++;
            } catch (error) {
                if (error.message.includes('invalid token')) {
                    console.log(`✓ PASS: create_block rejects invalid token: ${invalidToken}`);
                    passed++;
                } else {
                    console.error(`✗ FAIL: Unexpected error for token ${invalidToken}:`, error.message);
                    failed++;
                }
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log(`Test Results: ${passed} passed, ${failed} failed`);
        console.log('='.repeat(50));
        
        return { passed, failed };
    },
    
    /**
     * Helper function to check if a frontend file is passing token correctly
     * This can be used in CI/CD to validate frontend code
     */
    checkFrontendFile(fileContent, filename) {
        const errors = [];
        
        // Find all invoke calls
        const invokeRegex = /invoke\(['"](\w+)['"]\s*,\s*\{([^}]*)\}/g;
        let match;
        
        while ((match = invokeRegex.exec(fileContent)) !== null) {
            const command = match[1];
            const args = match[2];
            
            if (this.commandsRequiringToken.includes(command)) {
                // Check if token is passed
                if (!args.includes('token')) {
                    // Find line number
                    const lines = fileContent.substring(0, match.index).split('\n');
                    const lineNumber = lines.length;
                    
                    errors.push({
                        file: filename,
                        line: lineNumber,
                        command: command,
                        message: `Missing 'token' parameter in call to '${command}'`
                    });
                }
            }
        }
        
        return errors;
    }
};

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandParameterTests;
}

// Run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location.href.includes('test')) {
    CommandParameterTests.runTests();
}