/* providerManager.js
 *
 * Manager for search providers in Search Light
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { SystemCommandsProvider } from './systemCommandsProvider.js';
import { CalculatorProvider } from './calculatorProvider.js';
import { RecentFilesProvider } from './recentFilesProvider.js';
import { WebSearchProvider } from './webSearchProvider.js';

export class ProviderManager {
  constructor(settings) {
    this._settings = settings;
    this._providers = new Map();
    this._registeredProviders = [];
    this._initializeBuiltInProviders();
  }

  _initializeBuiltInProviders() {
    // Register built-in providers
    this._builtInProviders = [
      {
        id: 'system-commands',
        class: SystemCommandsProvider,
        settingKey: 'enable-system-commands',
      },
      {
        id: 'calculator',
        class: CalculatorProvider,
        settingKey: 'enable-calculator',
      },
      {
        id: 'recent-files',
        class: RecentFilesProvider,
        settingKey: 'enable-recent-files',
      },
      {
        id: 'web-search',
        class: WebSearchProvider,
        settingKey: 'enable-web-search',
      },
    ];
  }

  /**
   * Initialize all providers
   */
  initialize() {
    this._builtInProviders.forEach(providerInfo => {
      try {
        const enabled = this._isProviderEnabled(providerInfo.settingKey);
        if (enabled) {
          const provider = new providerInfo.class();
          this._providers.set(providerInfo.id, provider);
        }
      } catch (e) {
        console.error(`Failed to initialize provider ${providerInfo.id}:`, e);
      }
    });
  }

  /**
   * Register a custom provider
   * @param {BaseSearchProvider} provider - Provider instance
   * @returns {boolean} Success
   */
  registerProvider(provider) {
    if (!provider || !provider.id) {
      console.error('Invalid provider');
      return false;
    }

    if (this._providers.has(provider.id)) {
      console.warn(`Provider ${provider.id} already registered`);
      return false;
    }

    this._providers.set(provider.id, provider);
    this._registeredProviders.push(provider);
    return true;
  }

  /**
   * Unregister a provider
   * @param {string} providerId - Provider ID
   * @returns {boolean} Success
   */
  unregisterProvider(providerId) {
    const provider = this._providers.get(providerId);
    if (!provider) {
      return false;
    }

    if (provider.destroy) {
      provider.destroy();
    }

    this._providers.delete(providerId);
    this._registeredProviders = this._registeredProviders.filter(
      p => p.id !== providerId
    );
    
    return true;
  }

  /**
   * Get a provider by ID
   * @param {string} providerId - Provider ID
   * @returns {BaseSearchProvider|null} Provider or null
   */
  getProvider(providerId) {
    return this._providers.get(providerId) || null;
  }

  /**
   * Get all registered providers
   * @returns {BaseSearchProvider[]} Array of providers
   */
  getAllProviders() {
    return Array.from(this._providers.values());
  }

  /**
   * Get enabled providers
   * @returns {BaseSearchProvider[]} Array of enabled providers
   */
  getEnabledProviders() {
    return this.getAllProviders().filter(p => p.enabled);
  }

  /**
   * Get providers that can handle a query
   * @param {string} query - Search query
   * @returns {BaseSearchProvider[]} Array of matching providers
   */
  getProvidersForQuery(query) {
    return this.getEnabledProviders().filter(p => p.canHandleQuery(query));
  }

  /**
   * Enable/disable a provider
   * @param {string} providerId - Provider ID
   * @param {boolean} enabled - Enable state
   */
  setProviderEnabled(providerId, enabled) {
    const provider = this._providers.get(providerId);
    if (provider) {
      provider.enabled = enabled;
    }
  }

  /**
   * Check if provider is enabled via settings
   * @param {string} settingKey - Settings key
   * @returns {boolean} Enabled state
   */
  _isProviderEnabled(settingKey) {
    if (!this._settings || !settingKey) {
      return true; // Default to enabled if no settings
    }

    try {
      return this._settings.get_boolean(settingKey);
    } catch (e) {
      // Setting doesn't exist yet, default to enabled
      return true;
    }
  }

  /**
   * Destroy all providers
   */
  destroy() {
    this._providers.forEach(provider => {
      if (provider.destroy) {
        provider.destroy();
      }
    });
    
    this._providers.clear();
    this._registeredProviders = [];
  }
}
