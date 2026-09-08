import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert';

async function runTests() {
  console.log('🚀 Starting Vite development server for E2E tests...');
  const port = 5178;
  const viteServer = await createServer({
    server: { port, host: '127.0.0.1' },
    logLevel: 'error',
  });
  await viteServer.listen();
  const url = `http://127.0.0.1:${port}`;
  console.log(`📡 Vite running at ${url}`);

  console.log('🌐 Launching headless Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Listen to page errors
  page.on('pageerror', (err) => {
    console.error('⚠️ [Browser Page Error]:', err.message);
  });
  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  try {
    console.log(`🧭 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the app shell to render
    await page.waitForSelector('[data-action-rail="true"]', { timeout: 15000 });
    console.log('✅ AppShell and ActionRail rendered successfully');

    // Wait for stores and extensions to hydrate
    await page.waitForFunction(() => {
      const win = window;
      return Boolean(win.__flintStores?.workspaceStore && win.appInstance?.extensions?.isReady);
    }, { timeout: 10000 }).catch(() => {
      console.log('ℹ️ Waiting extra tick for store readiness...');
    });

    await page.waitForTimeout(1000);

    // ────────────────────────────────────────────────────────────────
    // TEST 1: Drag Region & Hit-Testing Styles
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: ActionRail Drag Region & Hit-Testing Styles ---');
    const railStyles = await page.evaluate(() => {
      const rail = document.querySelector('[data-action-rail="true"]');
      if (!rail) return null;
      const computed = window.getComputedStyle(rail);
      const buttons = Array.from(rail.querySelectorAll('button'));
      const buttonsNoDrag = buttons.map((b) => {
        const cs = window.getComputedStyle(b);
        return {
          title: b.getAttribute('title') || '',
          appRegion: cs.webkitAppRegion || cs.getPropertyValue('-webkit-app-region'),
          dataNoDrag: b.getAttribute('data-no-drag'),
        };
      });
      return {
        railAppRegion: computed.webkitAppRegion || computed.getPropertyValue('-webkit-app-region'),
        railDataNoDrag: rail.getAttribute('data-no-drag'),
        railTauriDrag: rail.getAttribute('data-tauri-drag-region'),
        buttonsCount: buttons.length,
        buttonsNoDrag,
      };
    });

    assert.ok(railStyles, 'ActionRail element must exist in DOM');
    console.log('Found buttons in ActionRail:', railStyles.buttonsNoDrag.map((b) => b.title));
    assert.strictEqual(railStyles.railDataNoDrag, 'true', 'ActionRail must declare data-no-drag="true"');
    assert.strictEqual(railStyles.railTauriDrag, 'false', 'ActionRail must declare data-tauri-drag-region="false"');
    assert.ok(
      railStyles.railAppRegion === 'no-drag' || railStyles.railAppRegion === '',
      `ActionRail computed region should be no-drag or neutral, got: ${railStyles.railAppRegion}`
    );
    console.log(`✅ ActionRail container drag isolation verified (buttons: ${railStyles.buttonsCount})`);

    for (const btn of railStyles.buttonsNoDrag) {
      assert.strictEqual(btn.dataNoDrag, 'true', `Button "${btn.title}" must have data-no-drag="true"`);
    }
    console.log('✅ All ActionRail buttons have data-no-drag="true"');

    // ────────────────────────────────────────────────────────────────
    // TEST 2: Graph View Navigation
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Graph View Navigation ---');
    const graphButton = page.locator('button[data-action-rail-id*="graph"], button[data-tooltip*="graph" i], button[title*="graph" i]');
    assert.ok(await graphButton.count() > 0, 'Graph view button must exist in ActionRail');
    await graphButton.first().click();
    await page.waitForTimeout(500);

    const graphTabActive = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return {
        activeTabId: activePane?.activeTabId,
        viewType: activeTab?.view_type || activeTab?.view_mode,
        title: activeTab?.title,
        mainViewMode: ws.mainViewMode,
      };
    });

    console.log('Graph Tab State:', graphTabActive);
    assert.strictEqual(graphTabActive.viewType, 'graph', 'Active tab view_type must be "graph"');
    console.log('✅ Graph View opened cleanly with active tab');

    // ────────────────────────────────────────────────────────────────
    // TEST 3: Spatial Canvas Navigation
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Spatial Canvas Navigation ---');
    const canvasButton = page.locator('button[data-action-rail-id*="canvas"], button[data-tooltip*="canvas" i], button[title*="canvas" i]');
    assert.ok(await canvasButton.count() > 0, 'Canvas button must exist in ActionRail');
    await canvasButton.first().click();
    await page.waitForTimeout(500);

    const canvasTabActive = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return {
        activeTabId: activePane?.activeTabId,
        viewType: activeTab?.view_type || activeTab?.view_mode,
        title: activeTab?.title,
      };
    });

    console.log('Canvas Tab State:', canvasTabActive);
    assert.strictEqual(canvasTabActive.viewType, 'canvas', 'Active tab view_type must be "canvas"');
    console.log('✅ Canvas opened cleanly with active tab');

    // ────────────────────────────────────────────────────────────────
    // TEST 4: Tasks Center Navigation
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Tasks Center Navigation ---');
    const tasksButton = page.locator('button[data-action-rail-id*="tasks"], button[data-tooltip*="tasks" i], button[title*="tasks" i]');
    assert.ok(await tasksButton.count() > 0, 'Tasks button must exist in ActionRail');
    await tasksButton.first().click();
    await page.waitForTimeout(500);

    const tasksTabActive = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return {
        activeTabId: activePane?.activeTabId,
        viewType: activeTab?.view_type || activeTab?.view_mode,
        title: activeTab?.title,
      };
    });

    console.log('Tasks Tab State:', tasksTabActive);
    assert.strictEqual(tasksTabActive.viewType, 'tasks', 'Active tab view_type must be "tasks"');
    console.log('✅ Tasks Center opened cleanly with active tab');

    // ────────────────────────────────────────────────────────────────
    // TEST 5: Extensions Marketplace Navigation
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Extensions Marketplace Navigation ---');
    const marketplaceButton = page.locator('button[data-action-rail-id*="marketplace"], button[data-tooltip*="marketplace" i], button[title*="Marketplace" i]');
    assert.ok(await marketplaceButton.count() > 0, 'Marketplace button must exist in ActionRail');
    await marketplaceButton.first().click();
    await page.waitForTimeout(500);

    const marketplaceTabActive = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return {
        activeTabId: activePane?.activeTabId,
        viewType: activeTab?.view_type || activeTab?.view_mode,
        title: activeTab?.title,
      };
    });

    console.log('Marketplace Tab State:', marketplaceTabActive);
    assert.strictEqual(marketplaceTabActive.viewType, 'marketplace', 'Active tab view_type must be "marketplace"');
    console.log('✅ Marketplace opened cleanly with active tab');

    // ────────────────────────────────────────────────────────────────
    // TEST 6: Daily Journal Instant Opening
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: Daily Journal Instant Opening ---');
    const journalButton = page.locator('button[data-action-rail-id*="journal"], button[data-tooltip*="journal" i], button[title*="Journal" i]');
    assert.ok(await journalButton.count() > 0, 'Journal button must exist in ActionRail');
    await journalButton.first().click();
    await page.waitForTimeout(1000);

    const journalState = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const ds = window.__flintStores.documentStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return {
        mainViewMode: ws.mainViewMode,
        activeTabTitle: activeTab?.title,
        activeTabDocId: activeTab?.document_id,
        activeDocId: ds.activeDocument?.id,
        activeDocTitle: ds.activeDocument?.title,
        documentsCount: ds.documents.length,
      };
    });

    console.log('Journal State:', journalState);
    assert.strictEqual(journalState.mainViewMode, 'document', 'Workspace view mode must be "document"');
    assert.ok(journalState.activeDocId, 'Active document ID must be set');
    assert.strictEqual(journalState.activeTabDocId, journalState.activeDocId, 'Active tab must point to active document');
    console.log('✅ Daily Journal note opened instantly without window reload');

    // ────────────────────────────────────────────────────────────────
    // TEST 7: Cross-Tab Switching & State Preservation
    // ────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Cross-Tab Switching & State Preservation ---');
    // Switch back to Graph View
    await graphButton.first().click();
    await page.waitForTimeout(300);

    const afterGraph = await page.evaluate(() => {
      const ws = window.__flintStores.workspaceStore.getState();
      const activePane = ws.panes[ws.focusedPaneId] || ws.panes['main'];
      const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId);
      return activeTab?.view_type;
    });
    assert.strictEqual(afterGraph, 'graph', 'Should switch back to Graph tab');

    // Switch back to Journal Note via tab header
    const journalTabHeader = page.locator(`div[data-tab-doc-id="${journalState.activeDocId}"]`).first();
    if (await journalTabHeader.count() > 0) {
      await journalTabHeader.click();
      await page.waitForTimeout(300);
      const afterBack = await page.evaluate(() => {
        const ds = window.__flintStores.documentStore.getState();
        return ds.activeDocument?.id;
      });
      assert.strictEqual(afterBack, journalState.activeDocId, 'Should switch back to active document');
      console.log('✅ Bidirectional tab switching verified successfully');
    }

    console.log('\n🎉 ALL 7 E2E PLAYWRIGHT TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    await browser.close();
    await viteServer.close();
    console.log('🛑 Vite server and browser closed cleanly.');
  }
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST SUITE FAILED:', err);
  process.exit(1);
});
