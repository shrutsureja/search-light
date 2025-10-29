# Search Light Provider Extensibility Guide

## Overview

Search Light now supports a plugin-based architecture for extending search functionality. This allows developers to create custom search providers that integrate seamlessly with the extension.

## Architecture

### Base Provider

All search providers extend the `BaseSearchProvider` class located in `providers/baseProvider.js`. This class provides a standardized interface for:

- Searching and filtering results
- Displaying result metadata (name, description, icon)
- Executing actions on results
- Preview information
- Query handling with optional prefixes

### Provider Manager

The `ProviderManager` class (in `providers/providerManager.js`) handles:

- Registration and unregistration of providers
- Provider lifecycle management
- Settings integration
- Query routing to appropriate providers

## Built-in Providers

Search Light includes three built-in providers:

### 1. System Commands Provider
- **ID**: `system-commands`
- **Purpose**: Execute system actions
- **Commands**:
  - Lock Screen
  - Log Out
  - Suspend
  - Restart
  - Shut Down
  - Open Settings

### 2. Calculator Provider
- **ID**: `calculator`
- **Prefix**: `calc:`
- **Purpose**: Inline calculations
- **Usage**: Type `calc: 2 + 2` or just `2 + 2`
- **Features**: 
  - Automatic math expression detection
  - Copy results to clipboard
  - Support for basic arithmetic operations

### 3. Recent Files Provider
- **ID**: `recent-files`
- **Purpose**: Search recently opened files
- **Features**:
  - Fuzzy search by filename
  - File icons
  - Quick actions: Open, Show in Files

## Creating a Custom Provider

### Basic Structure

```javascript
import { BaseSearchProvider } from './baseProvider.js';
import St from 'gi://St';

export const MyCustomProvider = class MyCustomProvider extends BaseSearchProvider {
  constructor() {
    super({
      id: 'my-provider',
      name: 'My Custom Provider',
      queryPrefix: 'my:', // Optional
      iconName: 'my-icon-symbolic',
      enabled: true,
    });
  }

  getInitialResultSet(terms, callback) {
    const query = terms.join(' ');
    const results = this._searchYourData(query);
    callback(results.map(r => r.id));
  }

  getResultMetas(ids, callback) {
    const metas = ids.map(id => {
      const item = this._getItemById(id);
      return this.createResultMeta(
        item.id,
        item.name,
        item.description,
        {
          createIcon: (size) => {
            return new St.Icon({
              icon_name: 'my-icon',
              icon_size: size,
            });
          },
        }
      );
    });
    callback(metas);
  }

  activateResult(id) {
    // Handle result activation
    const item = this._getItemById(id);
    this._performAction(item);
  }
};
```

### Registering a Provider

To register your custom provider in the extension:

```javascript
import { MyCustomProvider } from './providers/myCustomProvider.js';

// In your extension's enable() method
const myProvider = new MyCustomProvider();
this._providerManager.registerProvider(myProvider);
```

### Provider Methods

#### Required Methods

- **getInitialResultSet(terms, callback)**: Return initial search results
- **getResultMetas(ids, callback)**: Return display metadata for results
- **activateResult(id, terms)**: Handle when user selects a result

#### Optional Methods

- **getSubsearchResultSet(previousResults, terms, callback)**: Refine search results
- **filterResults(results, maxNumber)**: Limit number of results
- **launchSearch(terms)**: Open results in native application
- **getResultActions(id)**: Return available actions for a result
- **executeAction(id, actionId)**: Execute a specific action
- **getPreviewInfo(id)**: Return preview information
- **canHandleQuery(query)**: Determine if provider should handle query
- **destroy()**: Clean up resources

## Settings Integration

### Adding Provider Settings

1. Add settings to `schemas/org.gnome.shell.extensions.search-light.gschema.xml`:

```xml
<key type="b" name="enable-my-provider">
    <default>true</default>
    <summary>Enable My Provider</summary>
    <description>Enable my custom provider</description>
</key>
```

2. Add to `preferences/keys.js`:

```javascript
'enable-my-provider': {
  default_value: true,
  widget_type: 'switch',
},
```

3. Rebuild schemas:

```bash
make build
```

### Using Settings in Provider

```javascript
const enabled = settings.get_boolean('enable-my-provider');
```

## Query Prefixes

Providers can use query prefixes for scoped searches:

```javascript
constructor() {
  super({
    queryPrefix: 'calc:', // Only match queries starting with "calc:"
  });
}

canHandleQuery(query) {
  // Custom logic to determine if provider should handle query
  return query.toLowerCase().startsWith(this.queryPrefix);
}
```

## Result Actions

Provide context actions for results:

```javascript
getResultActions(id) {
  return [
    {
      id: 'open',
      name: 'Open',
      icon: 'document-open-symbolic',
    },
    {
      id: 'delete',
      name: 'Delete',
      icon: 'edit-delete-symbolic',
    },
  ];
}

executeAction(id, actionId) {
  if (actionId === 'open') {
    this._openItem(id);
  } else if (actionId === 'delete') {
    this._deleteItem(id);
  }
}
```

## Preview Pane (Future)

Providers can return preview information:

```javascript
getPreviewInfo(id) {
  return {
    title: 'Item Title',
    description: 'Detailed description',
    thumbnail: 'path/to/image',
    metadata: {
      'Size': '1.2 MB',
      'Modified': '2024-01-01',
    },
  };
}
```

## Best Practices

1. **Performance**: Keep searches fast (< 100ms for most queries)
2. **Debouncing**: Provider Manager handles debouncing, but be efficient
3. **Error Handling**: Always handle errors gracefully
4. **Resource Cleanup**: Implement `destroy()` to clean up resources
5. **Icons**: Use standard icon names from the theme when possible
6. **Accessibility**: Provide clear names and descriptions for results

## Example Providers

See the built-in providers in the `providers/` directory:
- `systemCommandsProvider.js` - System actions
- `calculatorProvider.js` - Inline calculations
- `recentFilesProvider.js` - Recent files search

## Future Enhancements

Planned features for the provider architecture:

- Visual preview pane
- Custom result rendering
- Async/streaming results
- Provider-specific settings UI
- Network/remote providers
- Plugin marketplace
