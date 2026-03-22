#!/usr/bin/env node
/**
 * Pre-commit validation script
 * Checks that all Tauri invoke calls pass required token parameter
 * 
 * Usage: node validate-commands.js
 */

const fs = require('fs');
const path = require('path');

// List of commands that require 'token' parameter
// This should be kept in sync with lib.rs
const commandsRequiringToken = [
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
];

const SRC_DIR = path.join(__dirname, '..');

function findJSFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && item !== 'tests' && !item.startsWith('.')) {
            files.push(...findJSFiles(fullPath));
        } else if (item.endsWith('.js') && !item.includes('.test.js') && !item.includes('auth-ui-tests.js')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const reportedPositions = new Set(); // Track reported positions to avoid duplicates
    
    // Find all invoke calls - handle multiline and various formats
    // This regex captures: invoke('command', { ... }) or invoke("command", { ... })
    const invokePattern = /invoke\(['"](\w+)['"]\s*,\s*\{/g;
    
    let match;
    while ((match = invokePattern.exec(content)) !== null) {
        const command = match[1];
        const startIdx = match.index;
        
        // Skip if we've already reported this position
        if (reportedPositions.has(startIdx)) {
            continue;
        }
        
        if (commandsRequiringToken.includes(command)) {
            // Find the end of the object by counting braces
            let braceCount = 1;
            let endIdx = startIdx + match[0].length;
            
            while (braceCount > 0 && endIdx < content.length) {
                if (content[endIdx] === '{') braceCount++;
                if (content[endIdx] === '}') braceCount--;
                endIdx++;
            }
            
            // Extract the arguments portion
            const argsContent = content.substring(startIdx + match[0].length - 1, endIdx);
            
            // Check if token is present in various forms:
            // - token: value
            // - token,
            // - token (at end of object before })
            const hasToken = /\btoken\b/.test(argsContent);
            
            if (!hasToken) {
                // Find line number
                const beforeMatch = content.substring(0, startIdx);
                const lineNumber = beforeMatch.split('\n').length;
                
                errors.push({
                    file: path.relative(process.cwd(), filePath),
                    line: lineNumber,
                    command: command,
                    snippet: match[0]
                });
                
                reportedPositions.add(startIdx);
            }
        }
    }
    
    return errors;
}

function main() {
    console.log('🔍 Validating Tauri command invocations...\n');
    
    const jsFiles = findJSFiles(SRC_DIR);
    const allErrors = [];
    
    for (const file of jsFiles) {
        const errors = checkFile(file);
        allErrors.push(...errors);
    }
    
    if (allErrors.length === 0) {
        console.log('✅ All command invocations are valid!\n');
        process.exit(0);
    } else {
        console.error(`❌ Found ${allErrors.length} error(s):\n`);
        
        for (const error of allErrors) {
            console.error(`  📄 ${error.file}:${error.line}`);
            console.error(`     Command: ${error.command}`);
            console.error(`     Missing: 'token' parameter`);
            console.error(`     Snippet: ${error.snippet}`);
            console.error('');
        }
        
        console.error('💡 Fix: Add "token: window.astanaApp.getSessionToken()" to the invoke call\n');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkFile, commandsRequiringToken };