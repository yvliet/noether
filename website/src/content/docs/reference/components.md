# Flint UI Components

Flint provides a suite of native UI primitives and setting builders directly via the Flint Extension SDK (`src/sdk/index.ts` and `src/components/ui/`). All components are styled with Flint's design tokens and follow the native desktop responsiveness standard. They render, hover, and toggle instantly with zero artificial transition delays.

Extension authors should use these components to build custom settings tabs, modal dialogs, status bar widgets, and workspace panels that seamlessly blend with the host application.


## 1. Importing UI Primitives

---

All UI components and their TypeScript prop types are exported from the Flint SDK:

```typescript
import {
  Button,
  TextInput,
  Toggle,
  Select,
  Slider,
  SettingCard,
  SettingItem,
  SettingBuilder,
} from 'flint';
```


## 2. Button Component

---

The `Button` component provides standard desktop button behaviors with unified sizing, variant styling, and keyboard accessibility.

:::preview button

```typescript
import React from 'react';
import { Button } from 'flint';

export const MyActionToolbar: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="primary"
        size="md"
        onClick={() => console.log('Saved')}
      >
        Save Note
      </Button>

      <Button
        variant="secondary"
        size="md"
        onClick={() => console.log('Exported')}
      >
        Export
      </Button>

      <Button
        variant="danger"
        size="sm"
        onClick={() => console.log('Deleted')}
      >
        Delete
      </Button>
    </div>
  );
};
```

### Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'link'` | `'secondary'` | Visual style variant. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding and font sizing. `sm`: 26px height, `md`: 32px height, `lg`: 38px height. |
| `disabled` | `boolean` | `false` | Disables pointer interactions and dims opacity. |
| `icon` | `React.ReactNode` | `undefined` | Optional icon rendered to the left of the button label. |
| `onClick` | `(e: React.MouseEvent) => void` | `undefined` | Click handler callback. |


## 3. TextInput Component

---

`TextInput` is a clean, focused single-line text input field supporting clear buttons, shortcut badges, and validation states.

:::preview textinput

```typescript
import React, { useState } from 'react';
import { TextInput } from 'flint';

export const SearchField: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <TextInput
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Filter tasks..."
      clearable
      onClear={() => setQuery('')}
      shortcutBadge="Ctrl+F"
    />
  );
};
```

### Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | Required | Current string value of the input. |
| `onChange` | `(e: React.ChangeEvent<HTMLInputElement>) => void` | Required | Change event handler. |
| `placeholder` | `string` | `''` | Input placeholder text. |
| `clearable` | `boolean` | `false` | Displays a quick clear (`x`) button when value is non-empty. |
| `onClear` | `() => void` | `undefined` | Triggered when the user clicks the clear button. |
| `shortcutBadge` | `string` | `undefined` | Displays an inline keyboard shortcut badge (e.g., `'Esc'`). |
| `error` | `string` | `undefined` | Highlights input border in danger red and displays error caption. |


## 4. Toggle / ToggleSwitch Component

---

The `Toggle` component provides instant, accessible boolean switches. In accordance with Flint's desktop feel, toggles transition state immediately without sluggish frame animations.

:::preview toggle

```typescript
import React, { useState } from 'react';
import { Toggle } from 'flint';

export const AutoSaveSetting: React.FC = () => {
  const [enabled, setEnabled] = useState(true);

  return (
    <Toggle
      checked={enabled}
      onChange={(val) => setEnabled(val)}
      label="Enable Auto-Save"
      description="Save document changes to disk after 300ms idle"
    />
  );
};
```

### Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `checked` | `boolean` | Required | Active toggle state. |
| `onChange` | `(checked: boolean) => void` | Required | State change callback. |
| `label` | `string` | `undefined` | Main setting title. |
| `description` | `string` | `undefined` | Optional subtext displayed below the title. |
| `disabled` | `boolean` | `false` | Disables interaction. |


## 5. Select / CustomSelect Component

---

A native desktop dropdown selector matching Flint's theme popovers and keyboard navigation.

:::preview select

```typescript
import React, { useState } from 'react';
import { Select, SelectOption } from 'flint';

const VIEW_OPTIONS: SelectOption[] = [
  { value: 'source', label: 'Raw Markdown' },
  { value: 'live', label: 'Live Preview' },
  { value: 'reading', label: 'Reading View' },
];

export const ViewModeSelector: React.FC = () => {
  const [mode, setMode] = useState('live');

  return (
    <Select
      value={mode}
      options={VIEW_OPTIONS}
      onChange={(newVal) => setMode(newVal)}
    />
  );
};
```


## 6. Slider Component

---

A continuous or stepped numerical range input with a real-time value display badge.

:::preview slider

```typescript
import React, { useState } from 'react';
import { Slider } from 'flint';

export const SpacingSetting: React.FC = () => {
  const [fontSize, setFontSize] = useState(16);

  return (
    <Slider
      value={fontSize}
      min={12}
      max={24}
      step={1}
      unit="px"
      onChange={(val) => setFontSize(val)}
    />
  );
};
```


## 7. SettingCard & SettingItem

---

Settings pages in Flint follow an organized card-and-row structure. `SettingCard` acts as a group container, while `SettingItem` pairs a title and description with an interactive control slot.

:::preview settingbuilder

```typescript
import React, { useState } from 'react';
import { SettingCard, SettingItem, Toggle, TextInput } from 'flint';

export const ExtensionSettingsTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <SettingCard title="General Configuration" description="Configure core parameters for this extension.">
        <SettingItem
          name="API Key"
          description="Your personal API access token."
        >
          <TextInput
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="flint_..."
          />
        </SettingItem>

        <SettingItem
          name="Debug Logging"
          description="Print detailed event traces to the developer console."
        >
          <Toggle
            checked={debugMode}
            onChange={(val) => setDebugMode(val)}
          />
        </SettingItem>
      </SettingCard>
    </div>
  );
};
```


## 8. Fluent SettingBuilder API

---

For extensions that prefer a procedural, Obsidian-style settings tab configuration without writing raw JSX, Flint provides the `SettingBuilder`:

```typescript
import { Extension, ExtensionSettingTab, SettingBuilder, FlintApp } from 'flint';

export class MySettingsTab implements ExtensionSettingTab {
  id = 'my-extension-settings';
  name = 'Word Counter Settings';

  display(containerEl: HTMLElement, app: FlintApp): void {
    containerEl.innerHTML = ''; // Clear container

    new SettingBuilder(containerEl)
      .setName('Status Bar Visibility')
      .setDesc('Show live word count indicator in the bottom status bar.')
      .addToggle((toggle) => {
        toggle
          .setValue(true)
          .onChange((val) => {
            console.log('Status bar visibility toggled:', val);
          });
      });

    new SettingBuilder(containerEl)
      .setName('Target Word Count')
      .setDesc('Daily writing goal in words.')
      .addText((text) => {
        text
          .setPlaceholder('500')
          .setValue('1000')
          .onChange((val) => {
            console.log('New target:', val);
          });
      });

    new SettingBuilder(containerEl)
      .setName('Reading Speed')
      .setDesc('Words per minute used for reading time calculations.')
      .addSlider((slider) => {
        slider
          .setLimits(100, 400, 25)
          .setValue(200)
          .onChange((val) => {
            console.log('Reading speed:', val);
          });
      });
  }
}
```


## 9. Application Modal Dialogs

---

Flint provides built-in dialog helpers on `app.workspace` for user confirmations and prompts:

- `app.workspace.showConfirmDialog({ title, message, confirmText, onConfirm })`: Displays an alert modal with confirm and cancel buttons.
- `app.workspace.showInputDialog({ title, message, placeholder, onConfirm })`: Requests user text input.
- `app.workspace.showToast(message, 'info' | 'success' | 'warning' | 'error')`: Displays non-intrusive toast alerts in the bottom-right corner.

To learn how to register custom settings tabs, see [[Extension Points Reference]]. To view the underlying design tokens, explore [[CSS Variables & Design Tokens]].
