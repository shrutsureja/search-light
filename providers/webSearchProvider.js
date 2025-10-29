/* webSearchProvider.js
 *
 * Search provider for web search and browser integration
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import { BaseSearchProvider } from './baseProvider.js';
import { trySpawnCommandLine } from 'resource:///org/gnome/shell/misc/util.js';

export const WebSearchProvider = class WebSearchProvider extends BaseSearchProvider {
  constructor() {
    super({
      id: 'web-search',
      name: 'Web Search',
      queryPrefix: 'web:',
      iconName: 'web-browser-symbolic',
      enabled: true,
    });

    this._browserHistory = [];
    this._loadBrowserHistory();
  }

  getInitialResultSet(terms, callback) {
    const query = terms.join(' ');
    const cleanQuery = query.replace(/^web:\s*/i, '').trim();
    
    // Store query for use in getResultMetas
    this._lastQuery = cleanQuery;
    
    if (!cleanQuery || cleanQuery.length === 0) {
      callback([]);
      return;
    }

    const results = [];

    // Check if it's a URL
    if (this._isURL(cleanQuery)) {
      results.push('url-open');
    }

    // Check browser history for matches
    const historyMatches = this._searchHistory(cleanQuery);
    historyMatches.forEach((url, idx) => {
      if (idx < 5) { // Limit to 5 history results
        results.push(`history-${idx}`);
      }
    });

    // Add web search option
    results.push('web-search');

    callback(results);
  }

  getResultMetas(ids, callback) {
    const query = this._lastQuery || '';
    const metas = [];

    ids.forEach(id => {
      if (id === 'url-open') {
        metas.push(this.createResultMeta(
          id,
          `Open: ${query}`,
          'Open this URL in your browser',
          {
            createIcon: (size) => {
              return new St.Icon({
                icon_name: 'web-browser-symbolic',
                icon_size: size,
              });
            },
          }
        ));
      } else if (id.startsWith('history-')) {
        const idx = parseInt(id.split('-')[1]);
        const historyItem = this._historyMatches[idx];
        if (historyItem) {
          metas.push(this.createResultMeta(
            id,
            historyItem.title || historyItem.url,
            historyItem.url,
            {
              createIcon: (size) => {
                return new St.Icon({
                  icon_name: 'document-open-recent-symbolic',
                  icon_size: size,
                });
              },
            }
          ));
        }
      } else if (id === 'web-search') {
        metas.push(this.createResultMeta(
          id,
          `Search the web for: ${query}`,
          'Open default search engine',
          {
            createIcon: (size) => {
              return new St.Icon({
                icon_name: 'system-search-symbolic',
                icon_size: size,
              });
            },
          }
        ));
      }
    });

    callback(metas);
  }

  activateResult(id, terms) {
    const query = terms.join(' ').replace(/^web:\s*/i, '').trim();
    
    if (id === 'url-open') {
      this._openURL(query);
    } else if (id.startsWith('history-')) {
      const idx = parseInt(id.split('-')[1]);
      const historyItem = this._historyMatches[idx];
      if (historyItem) {
        this._openURL(historyItem.url);
      }
    } else if (id === 'web-search') {
      this._searchWeb(query);
    }
  }

  getResultActions(id) {
    if (id.startsWith('history-')) {
      return [
        {
          id: 'open',
          name: 'Open',
          icon: 'web-browser-symbolic',
        },
        {
          id: 'copy',
          name: 'Copy URL',
          icon: 'edit-copy-symbolic',
        },
      ];
    }
    return [];
  }

  executeAction(id, actionId) {
    if (actionId === 'copy' && id.startsWith('history-')) {
      const idx = parseInt(id.split('-')[1]);
      const historyItem = this._historyMatches[idx];
      if (historyItem) {
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, historyItem.url);
      }
    } else if (actionId === 'open') {
      this.activateResult(id, []);
    }
  }

  _isURL(text) {
    // Check if text is a URL
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    const ipPattern = /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/;
    
    return urlPattern.test(text) || ipPattern.test(text) || text.startsWith('http://') || text.startsWith('https://');
  }

  _openURL(url) {
    let finalUrl = url;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    try {
      Gio.AppInfo.launch_default_for_uri(finalUrl, null);
    } catch (e) {
      console.error('Failed to open URL:', e);
      trySpawnCommandLine(`xdg-open "${finalUrl}"`);
    }
  }

  _searchWeb(query) {
    // Use default search engine (DuckDuckGo for privacy)
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    this._openURL(searchUrl);
  }

  _loadBrowserHistory() {
    // Load browser history from common browser locations
    this._browserHistory = [];
    
    try {
      // Try to load Firefox history
      const firefoxHistory = this._loadFirefoxHistory();
      this._browserHistory.push(...firefoxHistory);
    } catch (e) {
      // Ignore errors, browser might not be installed
    }

    try {
      // Try to load Chrome history
      const chromeHistory = this._loadChromeHistory();
      this._browserHistory.push(...chromeHistory);
    } catch (e) {
      // Ignore errors, browser might not be installed
    }

    // Sort by most recent and limit to 100
    this._browserHistory.sort((a, b) => b.timestamp - a.timestamp);
    this._browserHistory = this._browserHistory.slice(0, 100);
  }

  _loadFirefoxHistory() {
    const history = [];
    const homeDir = GLib.get_home_dir();
    const firefoxDir = `${homeDir}/.mozilla/firefox`;

    try {
      const dir = Gio.File.new_for_path(firefoxDir);
      if (!dir.query_exists(null)) {
        return history;
      }

      // Find the default profile
      const enumerator = dir.enumerate_children(
        'standard::name,standard::type',
        Gio.FileQueryInfoFlags.NONE,
        null
      );

      let info;
      while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        if (name.endsWith('.default') || name.endsWith('.default-release')) {
          // Found a profile, try to read places.sqlite
          const placesPath = `${firefoxDir}/${name}/places.sqlite`;
          // Note: Reading SQLite requires additional libraries
          // For now, we'll skip actual database reading
          break;
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return history;
  }

  _loadChromeHistory() {
    const history = [];
    const homeDir = GLib.get_home_dir();
    const chromeDirs = [
      `${homeDir}/.config/google-chrome/Default`,
      `${homeDir}/.config/chromium/Default`,
    ];

    // Note: Reading Chrome's History database requires SQLite
    // For now, we'll return empty to avoid complexity
    // This can be enhanced later with SQLite bindings

    return history;
  }

  _searchHistory(query) {
    const lowerQuery = query.toLowerCase();
    this._historyMatches = this._browserHistory
      .filter(item => {
        const url = (item.url || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        return url.includes(lowerQuery) || title.includes(lowerQuery);
      })
      .slice(0, 5);

    return this._historyMatches;
  }

  canHandleQuery(query) {
    if (!this.enabled) {
      return false;
    }

    const cleanQuery = query.replace(/^web:\s*/i, '').trim();

    // Handle queries with web: prefix
    if (query.toLowerCase().startsWith('web:')) {
      return true;
    }

    // Handle URLs
    if (this._isURL(cleanQuery)) {
      return true;
    }

    // Handle if it looks like a search query with www or http
    if (cleanQuery.includes('www.') || cleanQuery.startsWith('http')) {
      return true;
    }

    return false;
  }

  destroy() {
    this._browserHistory = [];
    this._historyMatches = [];
  }
};
