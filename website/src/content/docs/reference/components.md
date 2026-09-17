# Noether UI Components

Noether provides a suite of native UI primitives and setting builders directly via the Noether Extension SDK (`src/sdk/index.ts` and `src/components/ui/`). All components use Noether's design tokens and are designed to feel like native desktop controls: clean, tactile, and responding instantly to clicks and keyboard navigation without cosmetic animation delays.

Extension authors should use these components to build custom settings tabs, modal dialogs, status bar widgets, and workspace panels that seamlessly blend with the host application.


## 1. Importing UI Primitives

---

All UI components and their TypeScript prop types are exported from the Noether SDK:

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
  PageView,
  SidebarActionHeader,
  SidebarActionButton,
  CollapseAllButton,
  SortDropdown,
} from 'noether';
```


## 2. Button Component

---

The `Button` component provides standard desktop button behaviors with unified sizing, variant styling, and keyboard accessibility.

:::preview button

```typescript
import React from 'react';
import { Button } from 'noether';

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
import { TextInput } from 'noether';

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

The `Toggle` component provides clean, accessible boolean switches. Like other native desktop controls in Noether, toggles flip state immediately on click.

:::preview toggle

```typescript
import React, { useState } from 'react';
import { Toggle } from 'noether';

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

A native desktop dropdown selector matching Noether's theme popovers and keyboard navigation.

:::preview select

```typescript
import React, { useState } from 'react';
import { Select, SelectOption } from 'noether';

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
import { Slider } from 'noether';

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

Settings pages in Noether follow an organized card-and-row structure. `SettingCard` acts as a group container, while `SettingItem` pairs a title and description with an interactive control slot.

:::preview settingbuilder

```typescript
import React, { useState } from 'react';
import { SettingCard, SettingItem, Toggle, TextInput } from 'noether';

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
            placeholder="noether_..."
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

For extensions that prefer a procedural, Obsidian-style settings tab configuration without writing raw JSX, Noether provides the `SettingBuilder`:

```typescript
import { Extension, ExtensionSettingTab, SettingBuilder, NoetherApp } from 'noether';

export class MySettingsTab implements ExtensionSettingTab {
  id = 'my-extension-settings';
  name = 'Word Counter Settings';

  display(containerEl: HTMLElement, app: NoetherApp): void {
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

Noether provides built-in dialog helpers on `app.workspace` for user confirmations and prompts:

- `app.workspace.showConfirmDialog({ title, message, confirmText, onConfirm })`: Displays an alert modal with confirm and cancel buttons.
- `app.workspace.showInputDialog({ title, message, placeholder, onConfirm })`: Requests user text input.
- `app.workspace.showToast(message, 'info' | 'success' | 'warning' | 'error')`: Displays non-intrusive toast alerts in the bottom-right corner.


## 10. PageView Component

---

The `PageView` component provides the canonical full-page shell for custom workspace views, tabs, and documents. It coordinates the top active-tab cutout mask passthrough, sticky floating `PageSubHeader`, dynamic scroll dissolve effects, custom scrollbar tracks, and responsive padding.

```typescript
import React from 'react';
import { PageView } from 'noether';

export const CustomAnalyticsView: React.FC = () => {
  return (
    <PageView
      title="Vault Analytics"
      icon={<span className="text-base">📊</span>}
      options={[
        {
          id: 'export-csv',
          label: 'Export to CSV',
          onClick: () => console.log('Exporting...'),
        },
      ]}
      actions={
        <button className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700">
          Sync
        </button>
      }
    >
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-neutral-100">Overview</h2>
        <p className="text-sm text-neutral-400">
          Analytics for your vault notes, links, and tags.
        </p>
      </div>
    </PageView>
  );
};
```

### Architectural Features

- **Active Tab Cutout Passthrough**: In Noether's tabbed workspace, tabs feature curved wing cutouts. `PageView` renders with `data-main="true"` and `bg-[var(--noether-bg-tab-active,var(--noether-bg-main))]` so the active tab visually merges into the page content without visual breaks.
- **Floating Sticky Subheader**: Positions the subheader floating at `top: var(--noether-header-offset, 0px)` with navigation history buttons (back/forward), icon, title, options dropdown, and custom action slots.
- **Dynamic Scroll Transparency**: When the user scrolls down, the subheader transitions its background to transparent and adds subtle text and icon drop-shadows, maintaining contrast above scrolling text while maximizing visible workspace area.
- **Scrollbar Offset**: Applies `.scrollbar-track-offset-subheader` so the native scrollbar track begins neatly below the floating subheader rather than clashing against subheader buttons.
- **Spatial / Non-Scrollable Modes**: Passing `scrollable={false}` disables internal scrolling for canvas, graph, or infinite-pan interfaces.

### Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `undefined` | View title rendered in the subheader. |
| `icon` | `React.ReactNode` | `undefined` | Icon element rendered beside the title. |
| `options` | `PageSubHeaderOption[]` | `[]` | Dropdown menu options rendered in the subheader three-dot menu. |
| `actions` | `React.ReactNode` | `undefined` | Custom React controls rendered on the right side of the subheader. |
| `showNavigationHistory` | `boolean` | `true` | Whether to display the back and forward navigation history arrows. |
| `hideSubHeader` | `boolean` | `false` | When true, omits the subheader entirely. |
| `scrollable` | `boolean` | `true` | When true, renders a scroll container. When false, content fills the shell for canvas or spatial layouts. |
| `readableLineLength` | `boolean` | `false` | When true, constrains content to readable line length matching document view settings. |
| `dataMain` | `boolean` | `true` | Sets `data-main="true"` attribute for workspace layout matching. |
| `className` | `string` | `''` | Additional CSS classes applied to the root container. |
| `children` | `React.ReactNode` | `undefined` | View body content rendered in the viewport. |


## 11. SidebarActionHeader & SidebarActionButton Components

---

When I built Noether's sidebars and dock views, I wanted the top toolbar row across every panel (Files, Outlines, Backlinks, Tags, Properties, History, and extension sidebars) to feel completely unified with the window frame.

The `SidebarActionHeader` and `SidebarActionButton` suite provides the canonical container and button controls for custom sidebar views and dock panels. Using these components guarantees optical baseline Y-alignment with the vertical Action Rail (`y = 49px`), uniform 28×28px button footprints with 16px icons, tight 2px gaps (`gap-0.5`), and instantaneous click response with zero artificial animation delay.

```typescript
import React, { useState } from 'react';
import {
  SidebarActionHeader,
  SidebarActionButton,
  CollapseAllButton,
  SortDropdown,
} from 'noether';
import { PlusSignIcon, Search01Icon } from '@/components/common/Icons';

export const CustomSidebarView: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortOrder, setSortOrder] = useState('alpha-asc');

  const sortOptions = [
    { id: 'alpha-asc', label: 'Alphabetical: A-Z' },
    { id: 'alpha-desc', label: 'Alphabetical: Z-A' },
  ];

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Standardized Optical Toolbar */}
      <SidebarActionHeader borderBottom={false}>
        <SidebarActionButton
          onClick={() => console.log('Create item')}
          title="Create item (Ctrl+N)"
          icon={<PlusSignIcon size={16} />}
        />

        <SortDropdown
          value={sortOrder}
          onChange={setSortOrder}
          options={sortOptions}
        />

        <CollapseAllButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          collapsedTitle="Expand all items"
          expandedTitle="Collapse all items"
        />

        <SidebarActionButton
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          isActive={isSearchOpen}
          title={isSearchOpen ? 'Close search' : 'Search items'}
          icon={<Search01Icon size={16} />}
        />
      </SidebarActionHeader>

      {/* View Body */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* View content */}
      </div>
    </div>
  );
};
```

### Architectural Alignment Invariant

- **Baseline Y-Coordinate Synchronization**: The top icon in the Action Rail / Ribbon aligns at `y = 49px` (`pt-[41px]` header padding + `pt-2` inner container padding). `SidebarActionHeader` applies `h-9 mt-1` (36px height + 4px top margin + 4px inner button offset = `y = 49px`). This prevents awkward vertical staggering when glancing across the top of the sidebar and ribbon.
- **Button Sizing & Density**: `SidebarActionButton` and `CollapseAllButton` render at `w-7 h-7 rounded-md` (28×28px) with `16px` icon size and `gap-0.5` (2px) horizontal spacing, matching the dock control cluster and window header tools.
- **Instant Responsiveness**: Micro-interaction hover states and active toggles engage immediately without artificial transition delays, preserving the snappy feel of a native desktop utility.

### Props Reference

#### `SidebarActionHeaderProps`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `children` | `React.ReactNode` | `undefined` | Action buttons, dropdowns, and controls rendered in the header. |
| `borderBottom` | `boolean` | `false` | When true, renders a subtle bottom border separator (`border-[var(--noether-border-base)]`). |
| `className` | `string` | `''` | Additional CSS classes applied to the container. |

#### `SidebarActionButtonProps`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `icon` | `React.ReactNode` | `undefined` | Primary icon element (rendered at 16px by convention). |
| `isActive` | `boolean` | `false` | When true, highlights the button with active card background styling. |
| `disabled` | `boolean` | `false` | Disables pointer events and dims opacity to 35%. |
| `title` | `string` | `undefined` | Tooltip title shown on hover and used for accessibility labels. |
| `onClick` | `(e: React.MouseEvent) => void` | `undefined` | Click event handler callback. |
| `className` | `string` | `''` | Additional CSS classes. |

#### `CollapseAllButtonProps`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `isCollapsed` | `boolean` | - | Whether the target items are currently all collapsed. |
| `onToggle` | `() => void` | - | Toggle handler callback. |
| `disabled` | `boolean` | `false` | Dims button when no collapsible items exist. |
| `collapsedTitle` | `string` | `'Expand all'` | Tooltip when items are collapsed (clicking will expand). |
| `expandedTitle` | `string` | `'Collapse all'` | Tooltip when items are expanded (clicking will collapse). |
| `size` | `number` | `16` | Icon glyph size in pixels. |

#### `SortDropdownProps<T>`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `value` | `T` | - | Currently selected sort option ID. |
| `onChange` | `(value: T) => void` | - | Sort change callback. |
| `options` | `SortOption<T>[]` | - | Array of sort option descriptors (`{ id, label, section? }`). |
| `disabled` | `boolean` | `false` | Dims button when items list is empty. |
| `title` | `string` | `'Change sort order'` | Tooltip label. |


## 12. Related Reading & References

---

- [[Extension Points Reference]]: Register custom views with `this.registerView()`.
- [[CSS Variables & Design Tokens]]: Style custom controls using Noether's theme variables.
- [[Noether SDK API Reference]]: Complete method signatures and hook definitions.
- [[Events & Relational Storage]]: Coordinate UI actions with database events.
- [[Model Context Protocol (MCP) Tools]]: Expose extension capabilities to AI agent copilots.
