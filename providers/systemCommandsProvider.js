/* systemCommandsProvider.js
 *
 * Search provider for system commands (lock, logout, restart, etc.)
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
import { BaseSearchProvider } from './baseProvider.js';
import { trySpawnCommandLine } from 'resource:///org/gnome/shell/misc/util.js';

export const SystemCommandsProvider = class SystemCommandsProvider extends BaseSearchProvider {
  constructor() {
    super({
      id: 'system-commands',
      name: 'System Commands',
      iconName: 'system-run-symbolic',
      enabled: true,
    });

    this._systemCommands = [
      {
        id: 'lock-screen',
        name: 'Lock Screen',
        description: 'Lock your screen',
        keywords: ['lock', 'screen', 'secure'],
        icon: 'system-lock-screen-symbolic',
        action: () => this._lockScreen(),
      },
      {
        id: 'logout',
        name: 'Log Out',
        description: 'Log out of your session',
        keywords: ['logout', 'log', 'out', 'exit', 'signout'],
        icon: 'system-log-out-symbolic',
        action: () => this._logout(),
      },
      {
        id: 'suspend',
        name: 'Suspend',
        description: 'Suspend your computer',
        keywords: ['suspend', 'sleep', 'hibernate'],
        icon: 'system-suspend-symbolic',
        action: () => this._suspend(),
      },
      {
        id: 'restart',
        name: 'Restart',
        description: 'Restart your computer',
        keywords: ['restart', 'reboot'],
        icon: 'system-restart-symbolic',
        action: () => this._restart(),
      },
      {
        id: 'shutdown',
        name: 'Shut Down',
        description: 'Shut down your computer',
        keywords: ['shutdown', 'shut', 'down', 'power', 'off'],
        icon: 'system-shutdown-symbolic',
        action: () => this._shutdown(),
      },
      {
        id: 'settings',
        name: 'Open Settings',
        description: 'Open system settings',
        keywords: ['settings', 'preferences', 'configure', 'control'],
        icon: 'preferences-system-symbolic',
        action: () => this._openSettings(),
      },
    ];
  }

  getInitialResultSet(terms, callback) {
    const query = terms.join(' ').toLowerCase();
    const results = this._systemCommands
      .filter(cmd => this._matchesQuery(cmd, query))
      .map(cmd => cmd.id);
    
    callback(results);
  }

  getResultMetas(ids, callback) {
    const metas = ids.map(id => {
      const cmd = this._systemCommands.find(c => c.id === id);
      if (!cmd) return null;

      return this.createResultMeta(
        cmd.id,
        cmd.name,
        cmd.description,
        {
          createIcon: (size) => {
            return new St.Icon({
              icon_name: cmd.icon,
              icon_size: size,
            });
          },
        }
      );
    }).filter(m => m !== null);

    callback(metas);
  }

  activateResult(id) {
    const cmd = this._systemCommands.find(c => c.id === id);
    if (cmd && cmd.action) {
      cmd.action();
    }
  }

  _matchesQuery(cmd, query) {
    if (!query) return false;
    
    // Check name
    if (cmd.name.toLowerCase().includes(query)) return true;
    
    // Check keywords
    return cmd.keywords.some(keyword => keyword.includes(query));
  }

  _lockScreen() {
    const loginManager = Gio.DBus.system.proxy_new_sync(
      'org.freedesktop.login1',
      '/org/freedesktop/login1',
      'org.freedesktop.login1.Manager',
      null
    );
    
    try {
      const session = Gio.DBus.session;
      const screensaver = session.call_sync(
        'org.gnome.ScreenSaver',
        '/org/gnome/ScreenSaver',
        'org.gnome.ScreenSaver',
        'Lock',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );
    } catch (e) {
      console.error('Failed to lock screen:', e);
      trySpawnCommandLine('gnome-screensaver-command --lock');
    }
  }

  _logout() {
    try {
      const session = Gio.DBus.session;
      session.call(
        'org.gnome.SessionManager',
        '/org/gnome/SessionManager',
        'org.gnome.SessionManager',
        'Logout',
        new GLib.Variant('(u)', [0]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null
      );
    } catch (e) {
      console.error('Failed to logout:', e);
      trySpawnCommandLine('gnome-session-quit --logout');
    }
  }

  _suspend() {
    try {
      const loginManager = Gio.DBus.system.call_sync(
        'org.freedesktop.login1',
        '/org/freedesktop/login1',
        'org.freedesktop.login1.Manager',
        'Suspend',
        new GLib.Variant('(b)', [true]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );
    } catch (e) {
      console.error('Failed to suspend:', e);
      trySpawnCommandLine('systemctl suspend');
    }
  }

  _restart() {
    try {
      const session = Gio.DBus.session;
      session.call(
        'org.gnome.SessionManager',
        '/org/gnome/SessionManager',
        'org.gnome.SessionManager',
        'Reboot',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null
      );
    } catch (e) {
      console.error('Failed to restart:', e);
      trySpawnCommandLine('systemctl reboot');
    }
  }

  _shutdown() {
    try {
      const session = Gio.DBus.session;
      session.call(
        'org.gnome.SessionManager',
        '/org/gnome/SessionManager',
        'org.gnome.SessionManager',
        'Shutdown',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null
      );
    } catch (e) {
      console.error('Failed to shutdown:', e);
      trySpawnCommandLine('systemctl poweroff');
    }
  }

  _openSettings() {
    trySpawnCommandLine('gnome-control-center');
  }
};
