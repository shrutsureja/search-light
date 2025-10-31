// browserTabs.js - Utility to read browser tabs from cache

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const CACHE_FILE = GLib.build_filenamev([
    GLib.get_home_dir(),
    '.cache',
    'search-light',
    'browser-tabs.json'
]);

const CACHE_MAX_AGE = 60; // seconds

export class BrowserTabCache {
    constructor() {
        this._tabs = [];
        this._lastUpdate = 0;
        this._decoder = new TextDecoder();
    }

    /**
     * Load browser tabs from cache file
     * @returns {Array} Array of tab objects
     */
    loadTabs() {
        try {
            const file = Gio.File.new_for_path(CACHE_FILE);
            
            if (!file.query_exists(null)) {
                // Cache file doesn't exist yet
                return [];
            }

            const [success, contents] = file.load_contents(null);
            
            if (!success) {
                console.error('[BrowserTabs] Failed to read cache file');
                return [];
            }

            const data = JSON.parse(this._decoder.decode(contents));
            
            // Check if cache is stale
            const now = Date.now() / 1000;
            const cacheAge = now - (data.timestamp || 0);
            
            if (cacheAge > CACHE_MAX_AGE) {
                console.warn(`[BrowserTabs] Cache is stale (${cacheAge.toFixed(0)}s old)`);
                // Still return the tabs, but they might be outdated
            }

            this._tabs = data.tabs || [];
            this._lastUpdate = data.timestamp || 0;
            
            console.log(`[BrowserTabs] Loaded ${this._tabs.length} tabs from cache`);
            
            return this._tabs;
            
        } catch (error) {
            console.error('[BrowserTabs] Error loading tabs:', error);
            return [];
        }
    }

    /**
     * Get tabs from cache (without reloading)
     * @returns {Array} Array of tab objects
     */
    getTabs() {
        return this._tabs;
    }

    /**
     * Search tabs by query string
     * @param {string} query - Search query
     * @returns {Array} Matching tabs
     */
    searchTabs(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const lowerQuery = query.toLowerCase();
        
        return this._tabs.filter(tab => {
            const title = (tab.title || '').toLowerCase();
            const url = (tab.url || '').toLowerCase();
            
            return title.includes(lowerQuery) || url.includes(lowerQuery);
        });
    }

    /**
     * Get cache file path
     * @returns {string} Cache file path
     */
    getCacheFilePath() {
        return CACHE_FILE;
    }

    /**
     * Get cache age in seconds
     * @returns {number} Age in seconds
     */
    getCacheAge() {
        const now = Date.now() / 1000;
        return now - this._lastUpdate;
    }

    /**
     * Check if cache exists
     * @returns {boolean} True if cache file exists
     */
    cacheExists() {
        const file = Gio.File.new_for_path(CACHE_FILE);
        return file.query_exists(null);
    }
}
