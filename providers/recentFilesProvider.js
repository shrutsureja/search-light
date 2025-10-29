/* recentFilesProvider.js
 *
 * Search provider for recent files
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import St from 'gi://St';
import Gtk from 'gi://Gtk';
import { BaseSearchProvider } from './baseProvider.js';

export const RecentFilesProvider = class RecentFilesProvider extends BaseSearchProvider {
  constructor() {
    super({
      id: 'recent-files',
      name: 'Recent Files',
      iconName: 'document-open-recent-symbolic',
      enabled: true,
    });

    this._recentManager = Gtk.RecentManager.get_default();
    this._cachedResults = new Map();
  }

  getInitialResultSet(terms, callback) {
    const query = terms.join(' ').toLowerCase();
    
    if (!query || query.length < 2) {
      callback([]);
      return;
    }

    try {
      const recentItems = this._recentManager.get_items();
      const results = [];

      for (let i = 0; i < Math.min(recentItems.length, 50); i++) {
        const item = recentItems[i];
        
        if (!item.exists()) {
          continue;
        }

        const uri = item.get_uri();
        const displayName = item.get_display_name() || '';
        const mimeType = item.get_mime_type() || '';
        
        if (this._matchesQuery(displayName, query)) {
          const id = `recent-${i}`;
          this._cachedResults.set(id, {
            uri,
            displayName,
            mimeType,
            modified: item.get_modified(),
          });
          results.push(id);
        }
      }

      callback(results);
    } catch (e) {
      console.error('Error getting recent files:', e);
      callback([]);
    }
  }

  getResultMetas(ids, callback) {
    const metas = ids.map(id => {
      const item = this._cachedResults.get(id);
      if (!item) return null;

      return this.createResultMeta(
        id,
        item.displayName,
        this._getDescription(item),
        {
          createIcon: (size) => {
            try {
              const file = Gio.File.new_for_uri(item.uri);
              const fileInfo = file.query_info(
                'standard::icon',
                Gio.FileQueryInfoFlags.NONE,
                null
              );
              const icon = fileInfo.get_icon();
              
              return new St.Icon({
                gicon: icon,
                icon_size: size,
              });
            } catch (e) {
              return new St.Icon({
                icon_name: 'text-x-generic-symbolic',
                icon_size: size,
              });
            }
          },
        }
      );
    }).filter(m => m !== null);

    callback(metas);
  }

  activateResult(id) {
    const item = this._cachedResults.get(id);
    if (!item) return;

    try {
      const context = global.create_app_launch_context(0, -1);
      Gio.AppInfo.launch_default_for_uri(item.uri, context);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }

  getResultActions(id) {
    const item = this._cachedResults.get(id);
    if (!item) return [];

    return [
      {
        id: 'open',
        name: 'Open',
        icon: 'document-open-symbolic',
      },
      {
        id: 'reveal',
        name: 'Show in Files',
        icon: 'folder-symbolic',
      },
    ];
  }

  executeAction(id, actionId) {
    const item = this._cachedResults.get(id);
    if (!item) return;

    if (actionId === 'reveal') {
      try {
        const file = Gio.File.new_for_uri(item.uri);
        const parent = file.get_parent();
        if (parent) {
          const context = global.create_app_launch_context(0, -1);
          Gio.AppInfo.launch_default_for_uri(parent.get_uri(), context);
        }
      } catch (e) {
        console.error('Failed to reveal file:', e);
      }
    } else if (actionId === 'open') {
      this.activateResult(id);
    }
  }

  _matchesQuery(text, query) {
    return text.toLowerCase().includes(query);
  }

  _getDescription(item) {
    try {
      const file = Gio.File.new_for_uri(item.uri);
      const path = file.get_path();
      
      if (path) {
        const parent = file.get_parent();
        return parent ? parent.get_path() : path;
      }
      
      return item.uri;
    } catch (e) {
      return item.uri;
    }
  }

  destroy() {
    this._cachedResults.clear();
  }
};
