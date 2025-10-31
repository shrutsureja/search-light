
import Gio from 'gi://Gio';
import St from 'gi://St';
import { getBrowserList } from './utils.js';
import { BrowserTabCache } from './browserTabs.js';


export class SearchProvider {
    constructor(extension) {
        this._extension = extension;
        this.searchEngineIcons = extension.searchEngineIcons;
        this._tabCache = new BrowserTabCache();
        this._enableBrowserTabs = true; // TODO: make this a setting
        this._currentSearchTerms = [];
    }
    /**
     * The application of the provider.
     *
     * Applications will return a `Gio.AppInfo` representing themselves.
     * Extensions will usually return `null`.
     *
     * @type {Gio.AppInfo}
     */
    get appInfo() {
        return null;
    }

    /**
     * Whether the provider offers detailed results.
     *
     * Applications will return `true` if they have a way to display more
     * detailed or complete results. Extensions will usually return `false`.
     *
     * @type {boolean}
     */
    get canLaunchSearch() {
        return true;
    }

    /**
     * The unique ID of the provider.
     *
     * Applications will return their application ID. Extensions will usually
     * return their UUID.
     *
     * @type {string}
     */
    get id() {
        return this._extension.uuid;
    }

 
    /**
     * Get the browser command based on user settings
     * @returns {string} Browser command to use
     */    
    _getBrowserCommand() {
        this.settings = this._extension.settings;
        const browserIndex = this.settings.get_int('selected-browser') || 0;
        const availableBrowsers = getBrowserList ();
        if (browserIndex < availableBrowsers.length) {
            return availableBrowsers[browserIndex].command;
        }
        return 'xdg-open';
    }

    /**
     * Get the browser name for display
     * @returns {string} Browser name
     */
    _getBrowserName() {
        this.settings = this._extension.settings;
        const browserIndex = this.settings.get_int('selected-browser') || 0;
        const availableBrowsers = getBrowserList();
        if (browserIndex < availableBrowsers.length) {
            return availableBrowsers[browserIndex].name || 'browser';
        }
        return 'browser';
    }

    /**
     * Launch the search result.
     *
     * This method is called when a search provider result is activated.
     *
     * @param {string} result - The result identifier
     * @param {string[]} terms - The search terms
     */
    activateResult(result, terms) {
        const context = new Gio.AppLaunchContext;
        this.settings = this._extension.settings;
        const searchEngine = this.settings.get_int('search-engine');
        const browserCommand = this._getBrowserCommand();

        // Check if this is a browser tab result
        if (result.startsWith('tab:')) {
            const tabId = parseInt(result.substring(4));
            const tabs = this._tabCache.getTabs();
            const tab = tabs.find(t => t.id === tabId);
            
            if (tab && tab.url) {
                console.log(`[SearchProvider] Activating existing tab: ${tab.title}`);
                
                // Try to activate the existing tab using wmctrl to focus browser window
                try {
                    // Use xdotool or wmctrl to bring browser window to focus
                    const cmd = `wmctrl -a "${browserCommand}" || ${browserCommand} "${tab.url}"`;
                    Gio.AppInfo.create_from_commandline(cmd, null, 2).launch([], context);
                } catch (error) {
                    console.error('[SearchProvider] Error activating tab, opening URL:', error);
                    // Fallback: just open the URL
                    try {
                        const fallbackCmd = `${browserCommand} "${tab.url}"`;
                        Gio.AppInfo.create_from_commandline(fallbackCmd, null, 2).launch([], context);
                    } catch (e) {
                        console.error('[SearchProvider] Fallback failed:', e);
                    }
                }
                return;
            }
        }

        var cmd = `${browserCommand} `;

        const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/;
        if (urlRegex.test(terms.join(" ")) && terms.join(" ").match(urlRegex)[0].length == terms.join(" ").length) {
            if (terms.join(" ").startsWith("http://") || terms.join(" ").startsWith("https://")) {
                cmd += terms.join(" ");
            } else {
                cmd += `https://${terms.join(" ")}`;
            }
        } else {
            const searchUrl = `${this._extension.searchEngineUrls[searchEngine]}${terms.join('+')}`;
            // For browsers other than xdg-open, we might need to quote the URL
            if (browserCommand === 'xdg-open') {
                cmd += `"${searchUrl}"`;
            } else {
                cmd += `"${searchUrl}"`;
            }
        }

        try {
            Gio.AppInfo.create_from_commandline(cmd, null, 2).launch([], context);
        } catch (error) {
            console.error('[SearchProvider] Error launching browser:', error);
            // Fallback to system default
            const fallbackCmd = `xdg-open "${this._extension.searchEngineUrls[searchEngine]}${terms.join('+')}"`
            Gio.AppInfo.create_from_commandline(fallbackCmd, null, 2).launch([], context);
        }
    }


    /**
     * Launch the search provider.
     *
     * This method is called when a search provider is activated. A provider can
     * only be activated if the `appInfo` property holds a valid `Gio.AppInfo`
     * and the `canLaunchSearch` property is `true`.
     *
     * Applications will typically open a window to display more detailed or
     * complete results.
     *
     * @param {string[]} terms - The search terms
     */
    launchSearch(terms) {
        return null;
    }

    /**
     * Create a result object.
     *
     * This method is called to create an actor to represent a search result.
     *
     * Implementations may return any `Clutter.Actor` to serve as the display
     * result, or `null` for the default implementation.
     *
     * @param {ResultMeta} meta - A result metadata object
     * @returns {Clutter.Actor} An actor for the result
     */
    createResultObject(meta) {
        return null;
    }

    /**
     * Get result metadata.
     *
     * This method is called to get a `ResultMeta` for each identifier.
     *
     * @param {string[]} results - The result identifiers
     * @param {Gio.Cancellable} [cancellable] - A cancellable for the operation
     * @returns {Promise<ResultMeta[]>} A list of result metadata objects
     */

    getResultMetas(results, cancellable = null) {
        try {
            this.settings = this._extension.settings;

            const searchEngine = this.settings.get_int('search-engine');
            const iconData = this._extension.searchEngineIcons[searchEngine];
            const giconPath = this._extension.path + '/' + iconData;
            const gicon = Gio.icon_new_for_string(giconPath);
            const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);

            return new Promise((resolve, reject) => {
                const resultMetas = [];
                const terms = this._currentSearchTerms;

                for (let identifier of results) {
                    // Check if this is a browser tab result
                    if (identifier.startsWith('tab:')) {
                        const tabId = parseInt(identifier.substring(4));
                        const tabs = this._tabCache.getTabs();
                        const tab = tabs.find(t => t.id === tabId);
                        
                        if (tab) {
                            let tabIcon = null;
                            
                            // Use web browser icon for all tabs for consistency
                            tabIcon = Gio.icon_new_for_string('web-browser');
                            
                            // Format URL to look like a file path
                            let urlPath = tab.url || '';
                            
                            // Clean up the URL for display
                            try {
                                const url = new URL(tab.url);
                                // Remove protocol and www
                                urlPath = url.hostname.replace(/^www\./, '') + url.pathname + url.search;
                                // Add leading slash if not present
                                if (!urlPath.startsWith('/')) {
                                    urlPath = '/' + urlPath;
                                }
                            } catch (e) {
                                // Invalid URL, use as is
                            }
                            
                            const meta = {
                                id: identifier,
                                name: tab.title || 'Untitled',
                                description: urlPath,
                                createIcon: (size) => {
                                    try {
                                        return new St.Icon({
                                            gicon: tabIcon,
                                            width: size * scaleFactor,
                                            height: size * scaleFactor,
                                            icon_size: size * scaleFactor
                                        });
                                    } catch (iconError) {
                                        return null;
                                    }
                                }
                            };
                            resultMetas.push(meta);
                        }
                    } else {
                        // Regular web search result
                        const searchQuery = terms.join(' ');
                        const meta = {
                            id: identifier,
                            name: `Search the web`,
                            description: searchQuery,
                            createIcon: (size) => {
                                try {
                                    return new St.Icon({
                                        gicon,
                                        width: size * scaleFactor,
                                        height: size * scaleFactor,
                                        icon_size: size * scaleFactor
                                    });
                                } catch (iconError) {
                                    return null;
                                }
                            }
                        };
                        resultMetas.push(meta);
                    }
                }

                resolve(resultMetas);
            });

        } catch (error) {
            return Promise.resolve([]);
        }
    }

    /**
     * Initiate a new search.
     *
     * This method is called to start a new search and should return a list of
     * unique identifiers for the results.
     *
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} [cancellable] - A cancellable for the operation
     * @returns {Promise<string[]>} A list of result identifiers
     */
    getInitialResultSet(terms, cancellable = null) {
        console.log('[SearchProvider] getInitialResultSet:', terms);
        
        // Store terms for use in getResultMetas
        this._currentSearchTerms = terms;
        
        return new Promise((resolve, reject) => {
            const identifiers = [];
            
            // Search browser tabs if enabled
            if (this._enableBrowserTabs && terms.length > 0) {
                try {
                    // Reload tabs from cache
                    this._tabCache.loadTabs();
                    
                    const query = terms.join(' ');
                    const matchingTabs = this._tabCache.searchTabs(query);
                    
                    console.log(`[SearchProvider] Found ${matchingTabs.length} matching tabs for "${query}"`);
                    
                    // Add tab results (limit to top 8 for better UX)
                    // Sort by relevance: active tabs first, then pinned, then others
                    const sortedTabs = matchingTabs.sort((a, b) => {
                        if (a.active !== b.active) return b.active ? 1 : -1;
                        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                        return 0;
                    });
                    
                    sortedTabs.slice(0, 8).forEach(tab => {
                        identifiers.push(`tab:${tab.id}`);
                    });
                } catch (error) {
                    console.error('[SearchProvider] Error searching tabs:', error);
                }
            }
            
            // Add the web search option at the end (only if there's a search query)
            if (terms.length > 0) {
                identifiers.push('Web Search');
            }

            resolve(identifiers);
        });
    }

    /**
     * Refine the current search.
     *
     * This method is called to refine the current search results with
     * expanded terms and should return a subset of the original result set.
     *
     * Implementations may use this method to refine the search results more
     * efficiently than running a new search, or simply pass the terms to the
     * implementation of `getInitialResultSet()`.
     *
     * @param {string[]} results - The original result set
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} [cancellable] - A cancellable for the operation
     * @returns {Promise<string[]>}
     */
    getSubsearchResultSet(results, terms, cancellable = null) {
        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Filter the current search.
     *
     * This method is called to truncate the number of search results.
     *
     * Implementations may use their own criteria for discarding results, or
     * simply return the first n-items.
     *
     * @param {string[]} results - The original result set
     * @param {number} maxResults - The maximum amount of results
     * @returns {string[]} The filtered results
     */
    filterResults(results, maxResults) {
        if (results.length <= maxResults)
            return results;

        return results.slice(0, maxResults);
    }
}