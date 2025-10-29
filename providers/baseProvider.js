/* baseProvider.js
 *
 * Base class for all search providers in Search Light
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';

/**
 * Base search provider interface
 * All custom search providers should extend this class
 */
export const BaseSearchProvider = GObject.registerClass(
  {
    GTypeName: 'SearchLightBaseProvider',
    Properties: {
      'enabled': GObject.ParamSpec.boolean(
        'enabled',
        'Enabled',
        'Whether this provider is enabled',
        GObject.ParamFlags.READWRITE,
        true
      ),
    },
  },
  class BaseSearchProvider extends GObject.Object {
    _init(params = {}) {
      super._init();
      
      this.id = params.id || 'base-provider';
      this.name = params.name || 'Base Provider';
      this.enabled = params.enabled !== undefined ? params.enabled : true;
      this.canLaunchSearch = params.canLaunchSearch || false;
      this.isRemoteProvider = params.isRemoteProvider || false;
      this.appInfo = params.appInfo || null;
      
      // Query prefix for scoped searches (e.g., "calc:", "file:")
      this.queryPrefix = params.queryPrefix || null;
      
      // Icon name for results
      this.iconName = params.iconName || 'edit-find-symbolic';
    }

    /**
     * Get initial result set for a query
     * @param {string[]} terms - Search terms
     * @param {function} callback - Callback with results array
     * @param {object} cancellable - GCancellable
     */
    getInitialResultSet(terms, callback, cancellable) {
      callback([]);
    }

    /**
     * Get subsearch result set
     * @param {string[]} previousResults - Previous results
     * @param {string[]} terms - New search terms
     * @param {function} callback - Callback with results array
     * @param {object} cancellable - GCancellable
     */
    getSubsearchResultSet(previousResults, terms, callback, cancellable) {
      this.getInitialResultSet(terms, callback, cancellable);
    }

    /**
     * Get result metas (display information)
     * @param {string[]} ids - Result IDs
     * @param {function} callback - Callback with metas array
     * @param {object} cancellable - GCancellable
     */
    getResultMetas(ids, callback, cancellable) {
      callback([]);
    }

    /**
     * Filter results
     * @param {string[]} results - Results to filter
     * @param {number} maxNumber - Maximum results to return
     * @returns {string[]} Filtered results
     */
    filterResults(results, maxNumber) {
      return results.slice(0, maxNumber);
    }

    /**
     * Activate a result
     * @param {string} id - Result ID to activate
     * @param {string[]} terms - Search terms
     */
    activateResult(id, terms) {
      // To be implemented by subclasses
    }

    /**
     * Launch search in the provider's native application
     * @param {string[]} terms - Search terms
     */
    launchSearch(terms) {
      // To be implemented by subclasses
    }

    /**
     * Get available actions for a result
     * @param {string} id - Result ID
     * @returns {object[]} Array of action objects
     */
    getResultActions(id) {
      return [];
    }

    /**
     * Execute a specific action on a result
     * @param {string} id - Result ID
     * @param {string} actionId - Action ID to execute
     */
    executeAction(id, actionId) {
      // To be implemented by subclasses
    }

    /**
     * Get preview information for a result
     * @param {string} id - Result ID
     * @returns {object|null} Preview object or null
     */
    getPreviewInfo(id) {
      return null;
    }

    /**
     * Create result meta object
     * @param {string} id - Result ID
     * @param {string} name - Display name
     * @param {string} description - Description text
     * @param {object} params - Additional parameters
     * @returns {object} Result meta object
     */
    createResultMeta(id, name, description, params = {}) {
      return {
        id,
        name,
        description,
        clipboardText: params.clipboardText || null,
        createIcon: params.createIcon || null,
        ...params,
      };
    }

    /**
     * Check if provider can handle a query
     * @param {string} query - Search query
     * @returns {boolean} True if provider can handle the query
     */
    canHandleQuery(query) {
      if (!this.enabled) {
        return false;
      }
      
      if (this.queryPrefix) {
        return query.toLowerCase().startsWith(this.queryPrefix.toLowerCase());
      }
      
      return true;
    }

    /**
     * Clean up resources
     */
    destroy() {
      // To be implemented by subclasses if needed
    }
  }
);
