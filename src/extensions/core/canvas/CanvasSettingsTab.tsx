import React from 'react';
import {
  useCanvasSettings,
  DEFAULT_CANVAS_SETTINGS,
  CanvasWheelBehavior,
  CanvasDoubleClickAction,
  CanvasZoomSensitivity,
  CanvasShiftVerticalDirection,
  CanvasShiftHorizontalDirection,
  CanvasShiftResizeMode,
  CanvasGridStyle,
} from './canvasSettings';
import type { CanvasEdgeStyle, CanvasEdgeDirection } from './types';
import { useToast } from 'noether';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ColorPicker } from '@/components/common/ColorPicker';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
} from '@/components/settings/shared/SettingRow';

export const CanvasSettingsTab: React.FC = () => {
  const {
    // Grid & Snapping
    canvasSnapGrid,
    setCanvasSnapGrid,
    canvasSnapObjects,
    setCanvasSnapObjects,
    gridSize,
    setGridSize,
    gridStyle,
    setGridStyle,

    // Navigation & Camera
    wheelBehavior,
    setWheelBehavior,
    doubleClickAction,
    setDoubleClickAction,
    zoomSensitivity,
    setZoomSensitivity,

    // Gestures & Resizing
    shiftVerticalResizeDirection,
    setShiftVerticalResizeDirection,
    shiftHorizontalResizeDirection,
    setShiftHorizontalResizeDirection,
    shiftResizeMode,
    setShiftResizeMode,

    // Connection Lines & Edges
    defaultEdgeStyle,
    setDefaultEdgeStyle,
    defaultArrowDirection,
    setDefaultArrowDirection,
    defaultEdgeColor,
    setDefaultEdgeColor,

    // Card Defaults & Layout
    defaultNodeColor,
    setDefaultNodeColor,
    showBottomDock,
    setShowBottomDock,

    restoreDefaults,
  } = useCanvasSettings();

  const showToast = useToast();

  const isModified =
    canvasSnapGrid !== DEFAULT_CANVAS_SETTINGS.canvasSnapGrid ||
    canvasSnapObjects !== DEFAULT_CANVAS_SETTINGS.canvasSnapObjects ||
    gridSize !== DEFAULT_CANVAS_SETTINGS.gridSize ||
    gridStyle !== DEFAULT_CANVAS_SETTINGS.gridStyle ||
    wheelBehavior !== DEFAULT_CANVAS_SETTINGS.wheelBehavior ||
    doubleClickAction !== DEFAULT_CANVAS_SETTINGS.doubleClickAction ||
    zoomSensitivity !== DEFAULT_CANVAS_SETTINGS.zoomSensitivity ||
    shiftVerticalResizeDirection !== DEFAULT_CANVAS_SETTINGS.shiftVerticalResizeDirection ||
    shiftHorizontalResizeDirection !== DEFAULT_CANVAS_SETTINGS.shiftHorizontalResizeDirection ||
    shiftResizeMode !== DEFAULT_CANVAS_SETTINGS.shiftResizeMode ||
    defaultEdgeStyle !== DEFAULT_CANVAS_SETTINGS.defaultEdgeStyle ||
    defaultArrowDirection !== DEFAULT_CANVAS_SETTINGS.defaultArrowDirection ||
    defaultEdgeColor !== DEFAULT_CANVAS_SETTINGS.defaultEdgeColor ||
    defaultNodeColor !== DEFAULT_CANVAS_SETTINGS.defaultNodeColor ||
    showBottomDock !== DEFAULT_CANVAS_SETTINGS.showBottomDock;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Gestures & Card Resizing */}
      <SettingSection
        title="Gestures & Resizing"
        description="Configure modifier dragging, axis locking, and card sizing polarity."
      >
        {/* Shift Vertical Sizing Direction */}
        <SettingRow
          title="Shift vertical resize direction"
          description="Polarity when holding Shift and dragging vertically on a card body."
          keywords={['shift', 'resize', 'direction', 'vertical', 'height']}
          resetButton={
            <FieldResetButton
              isModified={shiftVerticalResizeDirection !== DEFAULT_CANVAS_SETTINGS.shiftVerticalResizeDirection}
              onReset={() => setShiftVerticalResizeDirection(DEFAULT_CANVAS_SETTINGS.shiftVerticalResizeDirection)}
              title="Restore default (Drag up expands)"
            />
          }
        >
          <CustomSelect<CanvasShiftVerticalDirection>
            value={shiftVerticalResizeDirection}
            onChange={setShiftVerticalResizeDirection}
            options={[
              { value: 'up-expand', label: 'Drag up expands' },
              { value: 'down-expand', label: 'Drag down expands' },
            ]}
          />
        </SettingRow>

        {/* Shift Horizontal Sizing Direction */}
        <SettingRow
          title="Shift horizontal resize direction"
          description="Polarity when holding Shift and dragging horizontally on a card body."
          keywords={['shift', 'resize', 'direction', 'horizontal', 'width']}
          resetButton={
            <FieldResetButton
              isModified={shiftHorizontalResizeDirection !== DEFAULT_CANVAS_SETTINGS.shiftHorizontalResizeDirection}
              onReset={() => setShiftHorizontalResizeDirection(DEFAULT_CANVAS_SETTINGS.shiftHorizontalResizeDirection)}
              title="Restore default (Drag right expands)"
            />
          }
        >
          <CustomSelect<CanvasShiftHorizontalDirection>
            value={shiftHorizontalResizeDirection}
            onChange={setShiftHorizontalResizeDirection}
            options={[
              { value: 'right-expand', label: 'Drag right expands' },
              { value: 'left-expand', label: 'Drag left expands' },
            ]}
          />
        </SettingRow>

        {/* Shift Resize Mode */}
        <SettingRow
          title="Shift drag resize mode"
          description="Controls whether card body dragging locks to one axis or scales width and height together."
          keywords={['shift', 'resize', 'mode', 'lock', 'axis', 'dual-axis']}
          resetButton={
            <FieldResetButton
              isModified={shiftResizeMode !== DEFAULT_CANVAS_SETTINGS.shiftResizeMode}
              onReset={() => setShiftResizeMode(DEFAULT_CANVAS_SETTINGS.shiftResizeMode)}
              title="Restore default (Single-axis locked)"
            />
          }
        >
          <CustomSelect<CanvasShiftResizeMode>
            value={shiftResizeMode}
            onChange={setShiftResizeMode}
            options={[
              { value: 'axis-locked', label: 'Single-axis locked' },
              { value: 'dual-axis', label: 'Dual-axis (Width & height)' },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* 2. Navigation & Camera */}
      <SettingSection
        title="Navigation & Camera"
        description="Configure mouse wheel behavior, double-click actions, and zoom sensitivity."
      >
        {/* Scroll Wheel Behavior */}
        <SettingRow
          title="Scroll wheel behavior"
          description="Primary action when scrolling the mouse wheel over the canvas background."
          keywords={['wheel', 'scroll', 'pan', 'zoom', 'camera', 'navigation']}
          resetButton={
            <FieldResetButton
              isModified={wheelBehavior !== DEFAULT_CANVAS_SETTINGS.wheelBehavior}
              onReset={() => setWheelBehavior(DEFAULT_CANVAS_SETTINGS.wheelBehavior)}
              title="Restore default (Pan canvas)"
            />
          }
        >
          <CustomSelect<CanvasWheelBehavior>
            value={wheelBehavior}
            onChange={setWheelBehavior}
            options={[
              { value: 'pan', label: 'Pan canvas (Hold Ctrl to zoom)' },
              { value: 'zoom', label: 'Zoom in / out (Hold Ctrl to pan)' },
            ]}
          />
        </SettingRow>

        {/* Double-Click Background Action */}
        <SettingRow
          title="Double-click canvas background"
          description="Action performed when double-clicking on empty canvas plane."
          keywords={['double click', 'background', 'action', 'card', 'fit', 'reset zoom']}
          resetButton={
            <FieldResetButton
              isModified={doubleClickAction !== DEFAULT_CANVAS_SETTINGS.doubleClickAction}
              onReset={() => setDoubleClickAction(DEFAULT_CANVAS_SETTINGS.doubleClickAction)}
              title="Restore default (Create text card)"
            />
          }
        >
          <CustomSelect<CanvasDoubleClickAction>
            value={doubleClickAction}
            onChange={setDoubleClickAction}
            options={[
              { value: 'card', label: 'Create text card' },
              { value: 'reset-zoom', label: 'Reset zoom (100%)' },
              { value: 'fit-center', label: 'Fit all to center' },
              { value: 'none', label: 'Do nothing' },
            ]}
          />
        </SettingRow>

        {/* Zoom Sensitivity */}
        <SettingRow
          title="Zoom sensitivity"
          description="Step scaling multiplier when zooming via wheel or shortcuts."
          keywords={['zoom', 'sensitivity', 'scale', 'multiplier', 'smooth', 'fast']}
          resetButton={
            <FieldResetButton
              isModified={zoomSensitivity !== DEFAULT_CANVAS_SETTINGS.zoomSensitivity}
              onReset={() => setZoomSensitivity(DEFAULT_CANVAS_SETTINGS.zoomSensitivity)}
              title="Restore default (Standard)"
            />
          }
        >
          <CustomSelect<CanvasZoomSensitivity>
            value={zoomSensitivity}
            onChange={setZoomSensitivity}
            options={[
              { value: 'smooth', label: 'Smooth (1.10x)' },
              { value: 'standard', label: 'Standard (1.25x)' },
              { value: 'fast', label: 'Fast (1.50x)' },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* 3. Grid & Snapping */}
      <SettingSection
        title="Grid & Snapping"
        description="Adjust snap intervals, object alignment, and visual background patterns."
      >
        {/* Snap to Grid */}
        <SettingRow
          title="Snap to grid"
          description="Align cards and shapes to the spatial grid intervals when moving and resizing."
          keywords={['grid', 'snap', 'align', 'magnetic']}
          resetButton={
            <FieldResetButton
              isModified={canvasSnapGrid !== DEFAULT_CANVAS_SETTINGS.canvasSnapGrid}
              onReset={() => setCanvasSnapGrid(DEFAULT_CANVAS_SETTINGS.canvasSnapGrid)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={canvasSnapGrid} onChange={setCanvasSnapGrid} />
        </SettingRow>

        {/* Grid Snap Cell Size */}
        <SettingRow
          title="Grid snap cell size"
          description="Pixel dimension for spatial snap intervals."
          keywords={['grid size', 'cell', 'pixels', 'snap step']}
          resetButton={
            <FieldResetButton
              isModified={gridSize !== DEFAULT_CANVAS_SETTINGS.gridSize}
              onReset={() => setGridSize(DEFAULT_CANVAS_SETTINGS.gridSize)}
              title="Restore default (20px)"
            />
          }
        >
          <CustomSelect<number>
            value={gridSize}
            onChange={setGridSize}
            options={[
              { value: 16, label: '16px' },
              { value: 20, label: '20px' },
              { value: 24, label: '24px' },
              { value: 32, label: '32px' },
            ]}
          />
        </SettingRow>

        {/* Grid Pattern Style */}
        <SettingRow
          title="Grid pattern style"
          description="Visual background pattern rendered across the canvas plane."
          keywords={['grid style', 'pattern', 'dots', 'lines', 'crosshairs', 'blank']}
          resetButton={
            <FieldResetButton
              isModified={gridStyle !== DEFAULT_CANVAS_SETTINGS.gridStyle}
              onReset={() => setGridStyle(DEFAULT_CANVAS_SETTINGS.gridStyle)}
              title="Restore default (Dot grid)"
            />
          }
        >
          <CustomSelect<CanvasGridStyle>
            value={gridStyle}
            onChange={setGridStyle}
            options={[
              { value: 'dots', label: 'Dot grid' },
              { value: 'lines', label: 'Grid lines' },
              { value: 'crosshairs', label: 'Crosshairs' },
              { value: 'blank', label: 'Blank canvas' },
            ]}
          />
        </SettingRow>

        {/* Snap to Objects */}
        <SettingRow
          title="Snap to nearby objects"
          description="Magnetically align moving cards to edges and centers of adjacent cards."
          keywords={['snap objects', 'magnetic', 'alignment guides', 'edges']}
          resetButton={
            <FieldResetButton
              isModified={canvasSnapObjects !== DEFAULT_CANVAS_SETTINGS.canvasSnapObjects}
              onReset={() => setCanvasSnapObjects(DEFAULT_CANVAS_SETTINGS.canvasSnapObjects)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={canvasSnapObjects} onChange={setCanvasSnapObjects} />
        </SettingRow>
      </SettingSection>

      {/* 4. Connection Lines & Arrows */}
      <SettingSection
        title="Connection Lines & Arrows"
        description="Default routing curves, directionality, and initial connector colors."
      >
        {/* Default Edge Routing */}
        <SettingRow
          title="Default edge routing"
          description="Default path geometry for connecting lines between cards."
          keywords={['edge routing', 'bezier', 'curved', 'step', 'straight', 'lines']}
          resetButton={
            <FieldResetButton
              isModified={defaultEdgeStyle !== DEFAULT_CANVAS_SETTINGS.defaultEdgeStyle}
              onReset={() => setDefaultEdgeStyle(DEFAULT_CANVAS_SETTINGS.defaultEdgeStyle)}
              title="Restore default (Curved)"
            />
          }
        >
          <CustomSelect<CanvasEdgeStyle>
            value={defaultEdgeStyle}
            onChange={setDefaultEdgeStyle}
            options={[
              { value: 'bezier', label: 'Curved' },
              { value: 'step', label: 'Step' },
              { value: 'straight', label: 'Straight' },
            ]}
          />
        </SettingRow>

        {/* Default Arrow Direction */}
        <SettingRow
          title="Default arrow direction"
          description="Default directionality applied when creating relationship connections."
          keywords={['arrow direction', 'unidirectional', 'bidirectional', 'nondirectional', 'edges']}
          resetButton={
            <FieldResetButton
              isModified={defaultArrowDirection !== DEFAULT_CANVAS_SETTINGS.defaultArrowDirection}
              onReset={() => setDefaultArrowDirection(DEFAULT_CANVAS_SETTINGS.defaultArrowDirection)}
              title="Restore default (Unidirectional)"
            />
          }
        >
          <CustomSelect<CanvasEdgeDirection>
            value={defaultArrowDirection}
            onChange={setDefaultArrowDirection}
            options={[
              { value: 'unidirectional', label: 'Unidirectional (A → B)' },
              { value: 'bidirectional', label: 'Bidirectional (A ↔ B)' },
              { value: 'nondirectional', label: 'Nondirectional (A — B)' },
            ]}
          />
        </SettingRow>

        {/* Default Edge Color */}
        <SettingRow
          title="Default line color"
          description="Initial stroke color for new relationship connections."
          keywords={['line color', 'edge color', 'stroke', 'connections']}
          resetButton={
            <FieldResetButton
              isModified={defaultEdgeColor !== DEFAULT_CANVAS_SETTINGS.defaultEdgeColor}
              onReset={() => setDefaultEdgeColor(DEFAULT_CANVAS_SETTINGS.defaultEdgeColor)}
              title="Restore default color"
            />
          }
        >
          <ColorPicker value={defaultEdgeColor} onChange={setDefaultEdgeColor} />
        </SettingRow>
      </SettingSection>

      {/* 5. Card Defaults & Layout */}
      <SettingSection
        title="Card Defaults & Layout"
        description="Default background styling and quick dock visibility."
      >
        {/* Default Card Color */}
        <SettingRow
          title="Default card color"
          description="Initial background color for new canvas cards."
          keywords={['card color', 'node color', 'background', 'cards']}
          resetButton={
            <FieldResetButton
              isModified={defaultNodeColor !== DEFAULT_CANVAS_SETTINGS.defaultNodeColor}
              onReset={() => setDefaultNodeColor(DEFAULT_CANVAS_SETTINGS.defaultNodeColor)}
              title="Restore default card color"
            />
          }
        >
          <ColorPicker value={defaultNodeColor} onChange={setDefaultNodeColor} />
        </SettingRow>

        {/* Show Bottom Quick Dock */}
        <SettingRow
          title="Bottom quick dock"
          description="Show floating bottom dock for quick card, note, and media creation."
          keywords={['dock', 'bottom dock', 'toolbar', 'quick actions']}
          resetButton={
            <FieldResetButton
              isModified={showBottomDock !== DEFAULT_CANVAS_SETTINGS.showBottomDock}
              onReset={() => setShowBottomDock(DEFAULT_CANVAS_SETTINGS.showBottomDock)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showBottomDock} onChange={setShowBottomDock} />
        </SettingRow>
      </SettingSection>
    </div>
  );
};

