import React, { useContext } from 'react';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  DefaultTabMode,
  DefaultEditingMode,
  DocPropertiesMode,
} from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
  highlightMatch,
  SettingsSearchContext,
} from '../shared/SettingRow';

export const EditorTab: React.FC = React.memo(() => {
  const { searchQuery } = useContext(SettingsSearchContext);
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const setDefaultTabMode = useSettingsStore((s) => s.setDefaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const setDefaultEditingMode = useSettingsStore((s) => s.setDefaultEditingMode);
  const showModeInStatusBar = useSettingsStore((s) => s.showModeInStatusBar);
  const setShowModeInStatusBar = useSettingsStore((s) => s.setShowModeInStatusBar);
  const showWordCountInStatusBar = useSettingsStore((s) => s.showWordCountInStatusBar);
  const setShowWordCountInStatusBar = useSettingsStore((s) => s.setShowWordCountInStatusBar);
  const showCharCountInStatusBar = useSettingsStore((s) => s.showCharCountInStatusBar);
  const setShowCharCountInStatusBar = useSettingsStore((s) => s.setShowCharCountInStatusBar);
  const showReadingTimeInStatusBar = useSettingsStore((s) => s.showReadingTimeInStatusBar);
  const setShowReadingTimeInStatusBar = useSettingsStore((s) => s.setShowReadingTimeInStatusBar);
  const inlineTitle = useSettingsStore((s) => s.inlineTitle);
  const setInlineTitle = useSettingsStore((s) => s.setInlineTitle);
  const readableLineLength = useSettingsStore((s) => s.readableLineLength);
  const setReadableLineLength = useSettingsStore((s) => s.setReadableLineLength);
  const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
  const setStrictLineBreaks = useSettingsStore((s) => s.setStrictLineBreaks);
  const propertiesInDoc = useSettingsStore((s) => s.propertiesInDoc);
  const setPropertiesInDoc = useSettingsStore((s) => s.setPropertiesInDoc);
  const foldHeading = useSettingsStore((s) => s.foldHeading);
  const setFoldHeading = useSettingsStore((s) => s.setFoldHeading);
  const foldIndent = useSettingsStore((s) => s.foldIndent);
  const setFoldIndent = useSettingsStore((s) => s.setFoldIndent);
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const setLineNumbers = useSettingsStore((s) => s.setLineNumbers);
  const indentationGuides = useSettingsStore((s) => s.indentationGuides);
  const setIndentationGuides = useSettingsStore((s) => s.setIndentationGuides);
  const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
  const setAccentListPrefixes = useSettingsStore((s) => s.setAccentListPrefixes);
  const autoPairing = useSettingsStore((s) => s.autoPairing);
  const setAutoPairing = useSettingsStore((s) => s.setAutoPairing);
  const autoPairMath = useSettingsStore((s) => s.autoPairMath);
  const setAutoPairMath = useSettingsStore((s) => s.setAutoPairMath);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const setTabSize = useSettingsStore((s) => s.setTabSize);
  const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);
  const setShowExternalLinkIcon = useSettingsStore((s) => s.setShowExternalLinkIcon);
  const spellcheck = useSettingsStore((s) => s.spellcheck);
  const setSpellcheck = useSettingsStore((s) => s.setSpellcheck);
  const colorLinksWithAccent = useSettingsStore((s) => s.colorLinksWithAccent);
  const setColorLinksWithAccent = useSettingsStore((s) => s.setColorLinksWithAccent);
  const blueLinks = useSettingsStore((s) => s.blueLinks);
  const setBlueLinks = useSettingsStore((s) => s.setBlueLinks);
  const underlineLinks = useSettingsStore((s) => s.underlineLinks);
  const setUnderlineLinks = useSettingsStore((s) => s.setUnderlineLinks);
  const matchLinkUnderlineColor = useSettingsStore((s) => s.matchLinkUnderlineColor);
  const setMatchLinkUnderlineColor = useSettingsStore((s) => s.setMatchLinkUnderlineColor);
  const tableDefaultRows = useSettingsStore((s) => s.tableDefaultRows);
  const setTableDefaultRows = useSettingsStore((s) => s.setTableDefaultRows);
  const tableDefaultCols = useSettingsStore((s) => s.tableDefaultCols);
  const setTableDefaultCols = useSettingsStore((s) => s.setTableDefaultCols);
  const tableEnableColumnResizing = useSettingsStore((s) => s.tableEnableColumnResizing);
  const setTableEnableColumnResizing = useSettingsStore((s) => s.setTableEnableColumnResizing);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isTablesModified =
    tableDefaultRows !== DEFAULT_SETTINGS.tableDefaultRows ||
    tableDefaultCols !== DEFAULT_SETTINGS.tableDefaultCols ||
    tableEnableColumnResizing !== DEFAULT_SETTINGS.tableEnableColumnResizing;

  const isEditorModified =
    defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode ||
    defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode ||
    showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar ||
    showWordCountInStatusBar !== DEFAULT_SETTINGS.showWordCountInStatusBar ||
    showCharCountInStatusBar !== DEFAULT_SETTINGS.showCharCountInStatusBar ||
    showReadingTimeInStatusBar !== DEFAULT_SETTINGS.showReadingTimeInStatusBar ||
    inlineTitle !== DEFAULT_SETTINGS.inlineTitle ||
    readableLineLength !== DEFAULT_SETTINGS.readableLineLength ||
    strictLineBreaks !== DEFAULT_SETTINGS.strictLineBreaks ||
    propertiesInDoc !== DEFAULT_SETTINGS.propertiesInDoc ||
    foldHeading !== DEFAULT_SETTINGS.foldHeading ||
    foldIndent !== DEFAULT_SETTINGS.foldIndent ||
    lineNumbers !== DEFAULT_SETTINGS.lineNumbers ||
    indentationGuides !== DEFAULT_SETTINGS.indentationGuides ||
    accentListPrefixes !== DEFAULT_SETTINGS.accentListPrefixes ||
    autoPairing !== DEFAULT_SETTINGS.autoPairing ||
    autoPairMath !== DEFAULT_SETTINGS.autoPairMath ||
    tabSize !== DEFAULT_SETTINGS.tabSize ||
    showExternalLinkIcon !== DEFAULT_SETTINGS.showExternalLinkIcon ||
    spellcheck !== DEFAULT_SETTINGS.spellcheck ||
    colorLinksWithAccent !== DEFAULT_SETTINGS.colorLinksWithAccent ||
    blueLinks !== DEFAULT_SETTINGS.blueLinks ||
    underlineLinks !== DEFAULT_SETTINGS.underlineLinks ||
    matchLinkUnderlineColor !== DEFAULT_SETTINGS.matchLinkUnderlineColor ||
    isTablesModified;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. General & View Modes */}
      <SettingSection
        title="General & View Modes"
        description="Default view modes, editing views, and status bar counters."
        isModified={isEditorModified}
        onReset={() => {
          restoreTabDefaults('editor');
          showToast('Restored Editor settings to default', 'info');
        }}
        resetTitle="Restore default editor settings"
      >
        {/* Default view for new tabs */}
        <SettingRow
          title="Default view for new tabs"
          description="The default view that a new Markdown tab gets opened in."
          keywords={['view', 'reading', 'editing', 'new tab', 'markdown']}
          resetButton={
            <FieldResetButton
              isModified={defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode}
              onReset={() => setDefaultTabMode(DEFAULT_SETTINGS.defaultTabMode)}
              title="Restore default (Editing view)"
            />
          }
        >
          <CustomSelect
            value={defaultTabMode}
            onChange={(val) => setDefaultTabMode(val as DefaultTabMode)}
            options={[
              { value: 'Editing view', label: 'Editing view' },
              { value: 'Reading view', label: 'Reading view' },
            ]}
          />
        </SettingRow>

        {/* Default editing mode */}
        <SettingRow
          title="Default editing mode"
          description="The default editing mode a new tab will start with."
          keywords={['live preview', 'source mode', 'editing', 'mode']}
          resetButton={
            <FieldResetButton
              isModified={defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode}
              onReset={() => setDefaultEditingMode(DEFAULT_SETTINGS.defaultEditingMode)}
              title="Restore default (Live Preview)"
            />
          }
        >
          <CustomSelect
            value={defaultEditingMode}
            onChange={(val) => setDefaultEditingMode(val as DefaultEditingMode)}
            options={[
              { value: 'Live Preview', label: 'Live Preview' },
              { value: 'Source mode', label: 'Source mode' },
            ]}
          />
        </SettingRow>

        {/* Show editing mode in status bar */}
        <SettingRow
          title="Show editing mode in status bar"
          description="Show the editing mode toggle in the status bar."
          keywords={['status bar', 'mode', 'editing']}
          resetButton={
            <FieldResetButton
              isModified={showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar}
              onReset={() => setShowModeInStatusBar(DEFAULT_SETTINGS.showModeInStatusBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showModeInStatusBar} onChange={setShowModeInStatusBar} />
        </SettingRow>

        {/* Show word count in status bar */}
        <SettingRow
          title="Show word count in status bar"
          description="Show the word count of the current note in the status bar."
          keywords={['word count', 'status bar', 'words']}
          resetButton={
            <FieldResetButton
              isModified={showWordCountInStatusBar !== DEFAULT_SETTINGS.showWordCountInStatusBar}
              onReset={() => setShowWordCountInStatusBar(DEFAULT_SETTINGS.showWordCountInStatusBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showWordCountInStatusBar} onChange={setShowWordCountInStatusBar} />
        </SettingRow>

        {/* Show character count in status bar */}
        <SettingRow
          title="Show character count in status bar"
          description="Show the character count of the current note in the status bar."
          keywords={['character count', 'status bar', 'chars']}
          resetButton={
            <FieldResetButton
              isModified={showCharCountInStatusBar !== DEFAULT_SETTINGS.showCharCountInStatusBar}
              onReset={() => setShowCharCountInStatusBar(DEFAULT_SETTINGS.showCharCountInStatusBar)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showCharCountInStatusBar} onChange={setShowCharCountInStatusBar} />
        </SettingRow>

        {/* Show reading time in status bar */}
        <SettingRow
          title="Show reading time in status bar"
          description="Show estimated reading time of the current note in the status bar."
          keywords={['reading time', 'status bar', 'minutes']}
          resetButton={
            <FieldResetButton
              isModified={showReadingTimeInStatusBar !== DEFAULT_SETTINGS.showReadingTimeInStatusBar}
              onReset={() => setShowReadingTimeInStatusBar(DEFAULT_SETTINGS.showReadingTimeInStatusBar)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showReadingTimeInStatusBar} onChange={setShowReadingTimeInStatusBar} />
        </SettingRow>
      </SettingSection>

      {/* 2. Display */}
      <SettingSection
        title="Display"
        description="Inline document titles, line length boundaries, properties, and heading folding."
      >
        {/* Inline title */}
        <SettingRow
          title="Inline title"
          description="Display the filename as an editable title inline with the file contents."
          keywords={['inline title', 'title', 'filename', 'header']}
          resetButton={
            <FieldResetButton
              isModified={inlineTitle !== DEFAULT_SETTINGS.inlineTitle}
              onReset={() => setInlineTitle(DEFAULT_SETTINGS.inlineTitle)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={inlineTitle} onChange={setInlineTitle} />
        </SettingRow>

        {/* Readable line length */}
        <SettingRow
          title="Readable line length"
          description="Limit maximum line length. Less content fits onscreen, but long blocks of text are more readable."
          keywords={['readable line length', 'line width', 'margin', 'editor width']}
          resetButton={
            <FieldResetButton
              isModified={readableLineLength !== DEFAULT_SETTINGS.readableLineLength}
              onReset={() => setReadableLineLength(DEFAULT_SETTINGS.readableLineLength)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={readableLineLength} onChange={setReadableLineLength} />
        </SettingRow>

        {/* Strict line breaks */}
        <SettingRow
          title="Strict line breaks"
          description="Render single line breaks in markdown with a blank line between them, matching standard CommonMark."
          keywords={['line breaks', 'strict', 'paragraphs', 'commonmark']}
          resetButton={
            <FieldResetButton
              isModified={strictLineBreaks !== DEFAULT_SETTINGS.strictLineBreaks}
              onReset={() => setStrictLineBreaks(DEFAULT_SETTINGS.strictLineBreaks)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={strictLineBreaks} onChange={setStrictLineBreaks} />
        </SettingRow>

        {/* Properties in document */}
        <SettingRow
          title="Properties in document"
          description="Determines how YAML frontmatter properties are displayed at the top of notes."
          keywords={['properties', 'frontmatter', 'yaml', 'metadata']}
          resetButton={
            <FieldResetButton
              isModified={propertiesInDoc !== DEFAULT_SETTINGS.propertiesInDoc}
              onReset={() => setPropertiesInDoc(DEFAULT_SETTINGS.propertiesInDoc)}
              title="Restore default (Visible)"
            />
          }
        >
          <CustomSelect
            value={propertiesInDoc}
            onChange={(val) => setPropertiesInDoc(val as DocPropertiesMode)}
            options={[
              { value: 'Visible', label: 'Visible' },
              { value: 'Hidden', label: 'Hidden' },
              { value: 'Source', label: 'Source' },
            ]}
          />
        </SettingRow>

        {/* Fold heading */}
        <SettingRow
          title="Fold heading"
          description="Lets you fold all content under a heading."
          keywords={['fold', 'heading', 'collapse', 'outline']}
          resetButton={
            <FieldResetButton
              isModified={foldHeading !== DEFAULT_SETTINGS.foldHeading}
              onReset={() => setFoldHeading(DEFAULT_SETTINGS.foldHeading)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={foldHeading} onChange={setFoldHeading} />
        </SettingRow>

        {/* Fold indent */}
        <SettingRow
          title="Fold indent"
          description="Lets you fold part of an indentation, such as lists."
          keywords={['fold', 'indent', 'list', 'collapse']}
          resetButton={
            <FieldResetButton
              isModified={foldIndent !== DEFAULT_SETTINGS.foldIndent}
              onReset={() => setFoldIndent(DEFAULT_SETTINGS.foldIndent)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={foldIndent} onChange={setFoldIndent} />
        </SettingRow>
      </SettingSection>

      {/* 3. Behavior & Input */}
      <SettingSection
        title="Behavior & Input"
        description="Line numbers, indentation guides, auto-pairing, and tab widths."
      >
        {/* Line numbers */}
        <SettingRow
          title="Line numbers"
          description="Show line numbers in the gutter."
          keywords={['line numbers', 'gutter', 'numbers']}
          resetButton={
            <FieldResetButton
              isModified={lineNumbers !== DEFAULT_SETTINGS.lineNumbers}
              onReset={() => setLineNumbers(DEFAULT_SETTINGS.lineNumbers)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={lineNumbers} onChange={setLineNumbers} />
        </SettingRow>

        {/* Indentation guides */}
        <SettingRow
          title="Indentation guides"
          description="Show vertical relationship lines between list items."
          keywords={['indentation', 'guides', 'lines', 'vertical']}
          resetButton={
            <FieldResetButton
              isModified={indentationGuides !== DEFAULT_SETTINGS.indentationGuides}
              onReset={() => setIndentationGuides(DEFAULT_SETTINGS.indentationGuides)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={indentationGuides} onChange={setIndentationGuides} />
        </SettingRow>

        {/* Accent number & list markers */}
        <SettingRow
          title="Accent number & list markers"
          description="Recolor list numbers and bullets with your theme's dimmed accent color."
          keywords={['accent', 'list', 'bullet', 'markers', 'numbers']}
          resetButton={
            <FieldResetButton
              isModified={accentListPrefixes !== DEFAULT_SETTINGS.accentListPrefixes}
              onReset={() => setAccentListPrefixes(DEFAULT_SETTINGS.accentListPrefixes)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={accentListPrefixes} onChange={setAccentListPrefixes} />
        </SettingRow>

        {/* Auto pairing */}
        <SettingRow
          title="Auto-pair brackets and quotes"
          description="Automatically pair [[wikilinks]], ((blocks)), and markdown syntax."
          keywords={['auto-pair', 'brackets', 'quotes', 'wikilinks']}
          resetButton={
            <FieldResetButton
              isModified={autoPairing !== DEFAULT_SETTINGS.autoPairing}
              onReset={() => setAutoPairing(DEFAULT_SETTINGS.autoPairing)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoPairing} onChange={setAutoPairing} />
        </SettingRow>

        {/* Auto-pair math formulas */}
        <SettingRow
          title="Auto-pair math formulas"
          description="Automatically wrap selections in math or open the math editor when typing $. When disabled, typing $ inserts a literal dollar sign, but typing double dollars ($$) will still open a math formula."
          keywords={['math', 'formulas', 'latex', 'dollar', 'auto-pair']}
          resetButton={
            <FieldResetButton
              isModified={autoPairMath !== DEFAULT_SETTINGS.autoPairMath}
              onReset={() => setAutoPairMath(DEFAULT_SETTINGS.autoPairMath)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoPairMath} onChange={setAutoPairMath} />
        </SettingRow>

        {/* Spellcheck */}
        <SettingRow
          title="Spellcheck"
          description="Highlight spelling mistakes and typos with red wavy underlines in the editor."
          keywords={['spellcheck', 'spelling', 'typo', 'grammar']}
          resetButton={
            <FieldResetButton
              isModified={spellcheck !== DEFAULT_SETTINGS.spellcheck}
              onReset={() => setSpellcheck(DEFAULT_SETTINGS.spellcheck)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={spellcheck} onChange={setSpellcheck} />
        </SettingRow>

        {/* Tab indent size */}
        <SettingRow
          title="Tab indent size"
          description="Number of spaces when pressing Tab key."
          keywords={['tab', 'indent', 'spaces', 'size']}
          resetButton={
            <FieldResetButton
              isModified={tabSize !== DEFAULT_SETTINGS.tabSize}
              onReset={() => setTabSize(DEFAULT_SETTINGS.tabSize)}
              title="Restore default (5 spaces)"
            />
          }
        >
          <CustomSelect
            value={tabSize}
            onChange={(val) => setTabSize(val as any)}
            options={[
              { value: '2', label: '2 spaces' },
              { value: '3', label: '3 spaces' },
              { value: '4', label: '4 spaces' },
              { value: '5', label: '5 spaces' },
              { value: '6', label: '6 spaces' },
              { value: '7', label: '7 spaces' },
              { value: '8', label: '8 spaces' },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* 4. Link Appearance */}
      <SettingSection
        title="Link Appearance"
        description="Custom link accent coloring, styling, and external link icons."
      >
        {/* Show external link icon */}
        <SettingRow
          title="Show external link icon"
          description="Display an external link icon next to links in rendered markdown notes."
          keywords={['external link', 'icon', 'url', 'http']}
          resetButton={
            <FieldResetButton
              isModified={showExternalLinkIcon !== DEFAULT_SETTINGS.showExternalLinkIcon}
              onReset={() => setShowExternalLinkIcon(DEFAULT_SETTINGS.showExternalLinkIcon)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showExternalLinkIcon} onChange={setShowExternalLinkIcon} />
        </SettingRow>

        {/* Color all links with accent color */}
        <SettingRow
          title="Color all links with accent color"
          description="Display markdown links, wikilinks, and document links using your active accent color."
          keywords={['links', 'accent', 'color', 'wikilink']}
          resetButton={
            <FieldResetButton
              isModified={colorLinksWithAccent !== DEFAULT_SETTINGS.colorLinksWithAccent}
              onReset={() => setColorLinksWithAccent(DEFAULT_SETTINGS.colorLinksWithAccent)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={colorLinksWithAccent} onChange={setColorLinksWithAccent} />
        </SettingRow>

        {/* Classic blue links */}
        <SettingRow
          title="Classic blue links"
          className={colorLinksWithAccent ? 'opacity-40' : ''}
          description={
            <>
              {highlightMatch(
                'Display links in standard browser blue with purple visited links instead of neutral text color.',
                searchQuery
              )}
              {colorLinksWithAccent && ' (Disabled while accent color is active)'}
            </>
          }
          descriptionText="Display links in standard browser blue with purple visited links instead of neutral text color."
          keywords={['blue links', 'classic', 'browser', 'color']}
          resetButton={
            <FieldResetButton
              isModified={!colorLinksWithAccent && blueLinks !== DEFAULT_SETTINGS.blueLinks}
              onReset={() => setBlueLinks(DEFAULT_SETTINGS.blueLinks)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={blueLinks}
            onChange={setBlueLinks}
            disabled={colorLinksWithAccent}
            title={colorLinksWithAccent ? 'Disabled while accent-colored links are enabled' : undefined}
          />
        </SettingRow>

        {/* Underline links */}
        <SettingRow
          title="Underline links"
          description="Display underlines under links. When turned off, underlines only appear on hover."
          keywords={['underline', 'links', 'hover']}
          resetButton={
            <FieldResetButton
              isModified={underlineLinks !== DEFAULT_SETTINGS.underlineLinks}
              onReset={() => setUnderlineLinks(DEFAULT_SETTINGS.underlineLinks)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={underlineLinks} onChange={setUnderlineLinks} />
        </SettingRow>

        {/* Match underline color to link */}
        <SettingRow
          title="Match underline color to link"
          className={!underlineLinks ? 'opacity-40' : ''}
          description={
            <>
              {highlightMatch(
                'Color the underline to match the link text color instead of the subtle border color.',
                searchQuery
              )}
              {!underlineLinks && ' (Disabled while link underlines are turned off)'}
            </>
          }
          descriptionText="Color the underline to match the link text color instead of the subtle border color."
          keywords={['match', 'underline', 'color']}
          resetButton={
            <FieldResetButton
              isModified={underlineLinks && matchLinkUnderlineColor !== DEFAULT_SETTINGS.matchLinkUnderlineColor}
              onReset={() => setMatchLinkUnderlineColor(DEFAULT_SETTINGS.matchLinkUnderlineColor)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={matchLinkUnderlineColor}
            onChange={setMatchLinkUnderlineColor}
            disabled={!underlineLinks}
            title={!underlineLinks ? 'Disabled while link underlines are turned off' : undefined}
          />
        </SettingRow>
      </SettingSection>

      {/* 5. Tables */}
      <SettingSection
        title="Tables"
        description="Configure interactive tables, default quick grid dimensions, and column resizing."
        isModified={isTablesModified}
        onReset={() => {
          setTableDefaultRows(DEFAULT_SETTINGS.tableDefaultRows);
          setTableDefaultCols(DEFAULT_SETTINGS.tableDefaultCols);
          setTableEnableColumnResizing(DEFAULT_SETTINGS.tableEnableColumnResizing);
          showToast('Restored Table settings to default', 'info');
        }}
        resetTitle="Restore default table settings"
      >
        {/* Interactive column resizing */}
        <SettingRow
          title="Interactive column resizing"
          description="Allow dragging table borders horizontally to customize individual column widths."
          keywords={['table', 'column', 'resize', 'width', 'drag', 'borders', 'grid']}
          resetButton={
            <FieldResetButton
              isModified={tableEnableColumnResizing !== DEFAULT_SETTINGS.tableEnableColumnResizing}
              onReset={() => setTableEnableColumnResizing(DEFAULT_SETTINGS.tableEnableColumnResizing)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={tableEnableColumnResizing} onChange={setTableEnableColumnResizing} />
        </SettingRow>

        {/* Default table columns */}
        <SettingRow
          title="Default quick table columns"
          description="Number of columns when inserting via command palette or default action."
          keywords={['table', 'columns', 'cols', 'grid', 'dimension']}
          resetButton={
            <FieldResetButton
              isModified={tableDefaultCols !== DEFAULT_SETTINGS.tableDefaultCols}
              onReset={() => setTableDefaultCols(DEFAULT_SETTINGS.tableDefaultCols)}
              title="Restore default (3)"
            />
          }
        >
          <input
            type="number"
            min={1}
            max={20}
            value={tableDefaultCols}
            onChange={(e) => setTableDefaultCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-16 bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg px-2.5 py-1 text-xs text-white text-center outline-none"
          />
        </SettingRow>

        {/* Default table rows */}
        <SettingRow
          title="Default quick table rows"
          description="Number of rows when inserting via command palette or default action."
          keywords={['table', 'rows', 'grid', 'dimension']}
          resetButton={
            <FieldResetButton
              isModified={tableDefaultRows !== DEFAULT_SETTINGS.tableDefaultRows}
              onReset={() => setTableDefaultRows(DEFAULT_SETTINGS.tableDefaultRows)}
              title="Restore default (3)"
            />
          }
        >
          <input
            type="number"
            min={1}
            max={50}
            value={tableDefaultRows}
            onChange={(e) => setTableDefaultRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="w-16 bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg px-2.5 py-1 text-xs text-white text-center outline-none"
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
});
