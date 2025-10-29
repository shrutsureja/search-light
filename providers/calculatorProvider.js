/* calculatorProvider.js
 *
 * Search provider for inline calculations
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

export const CalculatorProvider = class CalculatorProvider extends BaseSearchProvider {
  constructor() {
    super({
      id: 'calculator',
      name: 'Calculator',
      queryPrefix: 'calc:',
      iconName: 'accessories-calculator-symbolic',
      enabled: true,
    });

    this._lastResult = null;
  }

  getInitialResultSet(terms, callback) {
    const query = terms.join(' ');
    
    // Remove prefix if present
    const expression = query.replace(/^calc:\s*/i, '').trim();
    
    if (!expression || expression.length === 0) {
      callback([]);
      return;
    }

    // Try to evaluate the expression
    const result = this._evaluateExpression(expression);
    
    if (result !== null) {
      this._lastResult = {
        expression,
        result,
      };
      callback(['calc-result']);
    } else {
      callback([]);
    }
  }

  getResultMetas(ids, callback) {
    if (!this._lastResult) {
      callback([]);
      return;
    }

    const metas = [{
      id: 'calc-result',
      name: String(this._lastResult.result),
      description: `= ${this._lastResult.expression}`,
      clipboardText: String(this._lastResult.result),
      createIcon: (size) => {
        return new St.Icon({
          icon_name: 'accessories-calculator-symbolic',
          icon_size: size,
        });
      },
    }];

    callback(metas);
  }

  activateResult(id) {
    if (this._lastResult) {
      // Copy result to clipboard
      const clipboard = St.Clipboard.get_default();
      clipboard.set_text(
        St.ClipboardType.CLIPBOARD,
        String(this._lastResult.result)
      );
    }
  }

  _evaluateExpression(expr) {
    try {
      // Remove any non-math characters for safety
      const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, '');
      
      if (sanitized !== expr && !/^calc:/i.test(expr)) {
        // If expression contains invalid characters and doesn't have calc: prefix, reject it
        return null;
      }

      // Basic validation
      if (!/[\d)]$/.test(sanitized)) {
        return null;
      }

      // Evaluate using Function constructor (safer than eval)
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        // Round to reasonable precision
        return Math.round(result * 1000000) / 1000000;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  canHandleQuery(query) {
    if (!this.enabled) {
      return false;
    }

    // Handle queries with calc: prefix
    if (query.toLowerCase().startsWith('calc:')) {
      return true;
    }

    // Auto-detect math expressions (simple patterns)
    const mathPattern = /^[\d+\-*/.() ]+$/;
    if (mathPattern.test(query) && /[+\-*/]/.test(query)) {
      return true;
    }

    return false;
  }
};
