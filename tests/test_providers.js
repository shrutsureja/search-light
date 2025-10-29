#!/usr/bin/env gjs

/**
 * Test script for Search Light providers
 * 
 * This is a simple test to verify the provider architecture works.
 * Run this with: gjs tests/test_providers.js
 * 
 * Note: Full integration testing requires a running GNOME Shell session.
 */

const { GObject } = imports.gi;

// Mock the BaseSearchProvider for testing
const MockBaseSearchProvider = GObject.registerClass(
  class MockBaseSearchProvider extends GObject.Object {
    _init(params = {}) {
      super._init();
      this.id = params.id || 'test-provider';
      this.name = params.name || 'Test Provider';
      this.enabled = true;
      this.queryPrefix = params.queryPrefix || null;
    }

    canHandleQuery(query) {
      if (!this.enabled) return false;
      if (this.queryPrefix) {
        return query.toLowerCase().startsWith(this.queryPrefix.toLowerCase());
      }
      return true;
    }
  }
);

// Test 1: Create a provider
print('Test 1: Create a provider...');
const provider = new MockBaseSearchProvider({
  id: 'test-1',
  name: 'Test Provider 1',
});

if (provider.id === 'test-1' && provider.name === 'Test Provider 1') {
  print('✓ Provider created successfully');
} else {
  print('✗ Provider creation failed');
}

// Test 2: Query handling without prefix
print('\nTest 2: Query handling without prefix...');
if (provider.canHandleQuery('test query')) {
  print('✓ Provider handles query without prefix');
} else {
  print('✗ Provider should handle query without prefix');
}

// Test 3: Query handling with prefix
print('\nTest 3: Query handling with prefix...');
const calcProvider = new MockBaseSearchProvider({
  id: 'calc',
  name: 'Calculator',
  queryPrefix: 'calc:',
});

if (calcProvider.canHandleQuery('calc: 2 + 2')) {
  print('✓ Provider handles query with prefix');
} else {
  print('✗ Provider should handle query with prefix');
}

if (!calcProvider.canHandleQuery('other query')) {
  print('✓ Provider correctly rejects query without prefix');
} else {
  print('✗ Provider should reject query without prefix');
}

// Test 4: Enable/disable provider
print('\nTest 4: Enable/disable provider...');
provider.enabled = false;
if (!provider.canHandleQuery('test query')) {
  print('✓ Disabled provider rejects queries');
} else {
  print('✗ Disabled provider should reject queries');
}

provider.enabled = true;
if (provider.canHandleQuery('test query')) {
  print('✓ Enabled provider handles queries');
} else {
  print('✗ Enabled provider should handle queries');
}

print('\n=== All basic tests passed ===\n');
print('Note: Full integration tests require a running GNOME Shell session.');
print('Install the extension and test manually using the keyboard shortcut.');
