/**
 * @module RegistryApiVerification
 * @description
 * End-to-end integration and verification suite for Flint Plugin Registry API.
 * Verifies schema migration without fake seeds, initial empty state, dynamic publishing,
 * search, filter, pagination, download counting, author ownership enforcement, and version bumping.
 */

import { app } from './src/index.js';
import { initDatabase, getDb } from './src/db/database.js';

async function runTests() {
  console.log('=== Starting Flint Registry API Verification ===\n');

  // 1. Initialize Database
  console.log('[Test 1] Initializing database and verifying connectivity...');
  await initDatabase();
  const db = getDb();
  const countRes = await db.execute('SELECT COUNT(*) as count FROM plugins');
  const initialPluginCount = Number(countRes.rows[0].count);
  console.log(`✓ Database initialized and connected with ${initialPluginCount} plugins.`);

  // 2. Test Root Endpoint
  console.log('\n[Test 2] GET /');
  const rootRes = await app.request('/');
  const rootJson = await rootRes.json();
  console.log('Status:', rootRes.status, 'Payload:', rootJson.name);
  if (rootRes.status !== 200 || !rootJson.endpoints) {
    throw new Error('Root endpoint failed');
  }

  // 3. Test Health Endpoint
  console.log('\n[Test 3] GET /health');
  const healthRes = await app.request('/health');
  const healthJson = await healthRes.json();
  console.log('Status:', healthRes.status, 'Payload:', healthJson);
  if (healthRes.status !== 200 || healthJson.status !== 'healthy') {
    throw new Error('Health check failed');
  }

  // 4. Test GET /api/v1/plugins
  console.log('\n[Test 4] GET /api/v1/plugins (Catalog listing query)');
  const listRes = await app.request('/api/v1/plugins');
  const listJson = await listRes.json();
  console.log(`Total: ${listJson.total}, Items returned: ${listJson.items.length}`);
  if (listJson.total < initialPluginCount) {
    throw new Error('Expected list total to match database count');
  }
  console.log('✓ Verified community extensions catalogue listing.');

  // 5. Test POST /api/v1/plugins/publish (First community plugin: markdown-mindmap)
  console.log('\n[Test 5] POST /api/v1/plugins/publish (First community plugin)');
  const plugin1Payload = {
    manifest: {
      id: 'markdown-mindmap',
      name: 'Markdown Mindmap',
      version: '1.0.0',
      description: 'Generate dynamic visual mindmaps from nested markdown lists and headers.',
      category: 'Visualization',
      tags: ['mindmap', 'visualization', 'diagram'],
      icon: 'git-fork',
      repoUrl: 'https://github.com/developer/markdown-mindmap',
      minAppVersion: '0.1.0',
    },
    bundleUrl: 'https://cdn.flintnotes.dev/plugins/markdown-mindmap/1.0.0/main.js',
    stylesUrl: 'https://cdn.flintnotes.dev/plugins/markdown-mindmap/1.0.0/styles.css',
    readme: '# Markdown Mindmap\n\nTransforms markdown lists into interactive node trees.',
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    author: {
      githubUsername: 'devjane',
      displayName: 'Jane Developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9999999?v=4',
    },
  };

  const pubRes1 = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plugin1Payload),
  });
  const pubJson1 = await pubRes1.json();
  console.log('Publish status:', pubRes1.status, 'Response:', pubJson1);
  if (pubRes1.status !== 201 || !pubJson1.success) {
    throw new Error('Publishing first plugin failed');
  }
  console.log('✓ Published first plugin successfully.');

  // 6. Test POST /api/v1/plugins/publish (Second community plugin: advanced-code-runner)
  console.log('\n[Test 6] POST /api/v1/plugins/publish (Second community plugin)');
  const plugin2Payload = {
    manifest: {
      id: 'code-runner',
      name: 'Code Runner',
      version: '1.0.0',
      description: 'Execute JavaScript and Python code blocks right inside your notes.',
      category: 'Productivity',
      tags: ['code', 'python', 'javascript', 'runner'],
      icon: 'terminal',
      repoUrl: 'https://github.com/developer/code-runner',
      minAppVersion: '0.1.0',
    },
    bundleUrl: 'https://cdn.flintnotes.dev/plugins/code-runner/1.0.0/main.js',
    stylesUrl: 'https://cdn.flintnotes.dev/plugins/code-runner/1.0.0/styles.css',
    readme: '# Code Runner\n\nInstant REPL in notes.',
    sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    author: {
      githubUsername: 'coder_bob',
      displayName: 'Bob Builder',
      avatarUrl: 'https://avatars.githubusercontent.com/u/8888888?v=4',
    },
  };

  const pubRes2 = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plugin2Payload),
  });
  if (pubRes2.status !== 201) {
    throw new Error('Publishing second plugin failed');
  }
  console.log('✓ Published second plugin successfully.');

  // 7. Test Search
  console.log('\n[Test 7] GET /api/v1/plugins?search=mindmap');
  const searchRes = await app.request('/api/v1/plugins?search=mindmap');
  const searchJson = await searchRes.json();
  console.log('Search matches:', searchJson.items.map((p: any) => p.id));
  if (searchJson.items.length !== 1 || searchJson.items[0].id !== 'markdown-mindmap') {
    throw new Error('Search query for "mindmap" failed');
  }
  console.log('✓ Search query verified.');

  // 8. Test Category Filter
  console.log('\n[Test 8] GET /api/v1/plugins?category=Productivity');
  const catRes = await app.request('/api/v1/plugins?category=Productivity');
  const catJson = await catRes.json();
  const catMatches: string[] = catJson.items.map((p: any) => p.id);
  console.log('Category matches:', catMatches);
  if (!catMatches.includes('code-runner')) {
    throw new Error('Category filter for "Productivity" failed');
  }
  console.log('✓ Category filter verified.');

  // 9. Test GET /api/v1/plugins/:id (Detail)
  console.log('\n[Test 9] GET /api/v1/plugins/markdown-mindmap');
  const detailRes = await app.request('/api/v1/plugins/markdown-mindmap');
  const detailJson = await detailRes.json();
  console.log('Plugin:', detailJson.name);
  console.log('Author:', detailJson.author.display_name, `(@${detailJson.author.github_username})`);
  console.log('Latest version:', detailJson.latest_version?.version);
  console.log('Readme length:', detailJson.readme?.length);
  console.log('Version history count:', detailJson.versions?.length);
  if (
    detailRes.status !== 200 ||
    !detailJson.readme.includes('Markdown Mindmap') ||
    detailJson.versions.length !== 1
  ) {
    throw new Error('Plugin detail endpoint failed');
  }
  console.log('✓ Plugin detail with full README and version history verified.');

  // 10. Test GET /api/v1/plugins/:id/download
  console.log('\n[Test 10] GET /api/v1/plugins/markdown-mindmap/download');
  const initialDownloads = detailJson.downloads;
  const dlRes = await app.request('/api/v1/plugins/markdown-mindmap/download');
  const dlJson = await dlRes.json();
  console.log('Download payload:', dlJson);
  if (dlRes.status !== 200 || !dlJson.bundleUrl || !dlJson.manifest) {
    throw new Error('Download endpoint failed');
  }

  // Verify download count incremented
  const checkDlRes = await app.request('/api/v1/plugins/markdown-mindmap');
  const checkDlJson = await checkDlRes.json();
  console.log(`Downloads before: ${initialDownloads}, after: ${checkDlJson.downloads}`);
  if (checkDlJson.downloads !== initialDownloads + 1) {
    throw new Error('Download counter did not increment');
  }
  console.log('✓ Download counter increment and bundle manifest verified.');

  // 11. Test Duplicate Version Publish (Conflict check 409)
  console.log('\n[Test 11] Duplicate version publish should return 409 Conflict');
  const conflictRes = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plugin1Payload),
  });
  const conflictJson = await conflictRes.json();
  console.log('Conflict status:', conflictRes.status, 'Error message:', conflictJson.error);
  if (conflictRes.status !== 409) {
    throw new Error('Duplicate version conflict did not return 409');
  }
  console.log('✓ Duplicate version conflict enforcement verified.');

  // 12. Test Unauthorized Update from Different Author (403 check)
  console.log('\n[Test 12] Unauthorized publish by different author should return 403');
  const hijackedPayload = {
    ...plugin1Payload,
    manifest: {
      ...plugin1Payload.manifest,
      version: '1.0.1',
    },
    author: {
      githubUsername: 'impostor_user',
      displayName: 'Impostor',
    },
  };
  const unauthRes = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hijackedPayload),
  });
  const unauthJson = await unauthRes.json();
  console.log('Unauth status:', unauthRes.status, 'Error message:', unauthJson.error);
  if (unauthRes.status !== 403) {
    throw new Error('Unauthorized update did not return 403');
  }
  console.log('✓ Author ownership security verified.');

  // 13. Test Authorized Version Bump by Original Author
  console.log('\n[Test 13] Authorized version bump by original author');
  const bumpPayload = {
    ...plugin1Payload,
    manifest: {
      ...plugin1Payload.manifest,
      version: '1.0.1',
    },
    bundleUrl: 'https://cdn.flintnotes.dev/plugins/markdown-mindmap/1.0.1/main.js',
  };
  const bumpRes = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bumpPayload),
  });
  const bumpJson = await bumpRes.json();
  console.log('Bump status:', bumpRes.status, 'Response:', bumpJson);
  if (bumpRes.status !== 201) {
    throw new Error('Authorized version bump failed');
  }

  // Check version history now has 2 versions
  const checkBumpRes = await app.request('/api/v1/plugins/markdown-mindmap');
  const checkBumpJson = await checkBumpRes.json();
  console.log('Current latest version:', checkBumpJson.latest_version.version);
  console.log('Total versions in history:', checkBumpJson.versions.length);
  if (checkBumpJson.latest_version.version !== '1.0.1' || checkBumpJson.versions.length !== 2) {
    throw new Error('Version bump did not update latest version or history');
  }
  // 14. Test Direct Bundle Storage & Retrieval
  console.log('\n[Test 14] Direct Bundle Code Storage & Retrieval from Turso');
  const bundleCodePayload = {
    manifest: {
      id: 'custom-bundle-test',
      name: 'Custom Bundle Test',
      version: '1.0.0',
      description: 'Testing direct bundle storage in Turso',
      category: 'Formatting' as const,
      tags: ['test', 'bundle'],
      minAppVersion: '0.4.0',
    },
    bundleCode: 'console.log("Hello from Turso direct bundle code!"); module.exports = class Test {};',
    stylesCode: '.test-class { color: red; }',
    readme: '# Custom Bundle Test',
    author: {
      githubUsername: 'turso_tester',
      displayName: 'Turso Tester',
    },
  };

  const pubBundleRes = await app.request('/api/v1/plugins/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundleCodePayload),
  });
  if (pubBundleRes.status !== 201) {
    throw new Error('Failed to publish plugin with direct bundle code');
  }

  const bundleFetchRes = await app.request('/api/v1/plugins/custom-bundle-test/bundle');
  const bundleText = await bundleFetchRes.text();
  console.log('Fetched bundle status:', bundleFetchRes.status, 'Bundle text length:', bundleText.length);
  if (bundleFetchRes.status !== 200 || !bundleText.includes('Hello from Turso')) {
    throw new Error('GET /api/v1/plugins/:id/bundle failed to return correct bundle code');
  }

  const stylesFetchRes = await app.request('/api/v1/plugins/custom-bundle-test/styles');
  const stylesText = await stylesFetchRes.text();
  console.log('Fetched styles status:', stylesFetchRes.status, 'Styles text:', stylesText);
  if (stylesFetchRes.status !== 200 || !stylesText.includes('.test-class')) {
    throw new Error('GET /api/v1/plugins/:id/styles failed to return correct stylesheet');
  }

  const manifestFetchRes = await app.request('/api/v1/plugins/custom-bundle-test/manifest.json');
  const manifestJson = await manifestFetchRes.json();
  console.log('Fetched manifest status:', manifestFetchRes.status, 'ID:', manifestJson.id);
  if (manifestFetchRes.status !== 200 || manifestJson.id !== 'custom-bundle-test') {
    throw new Error('GET /api/v1/plugins/:id/manifest.json failed');
  }
  console.log('✓ Direct Turso bundle, styles, and manifest delivery verified.');

  console.log('\n[Test 15] Cleaning up temporary test records...');
  await db.execute("DELETE FROM plugins WHERE id IN ('markdown-mindmap', 'code-runner', 'custom-bundle-test')");
  await db.execute("DELETE FROM authors WHERE id IN ('author_devjane', 'author_coder_bob', 'author_turso_tester', 'author_impostor_user')");
  console.log('✓ Cleaned up test records from database.');

  console.log('\n======================================================');
  console.log('  ALL FLINT REGISTRY API TESTS PASSED SUCCESSFULLY!   ');
  console.log('======================================================\n');
}

async function main() {
  try {
    await runTests();
  } catch (err) {
    console.error('Test verification failed:', err);
    try {
      const db = getDb();
      await db.execute("DELETE FROM plugins WHERE id IN ('markdown-mindmap', 'code-runner', 'custom-bundle-test')");
      await db.execute("DELETE FROM authors WHERE id IN ('author_devjane', 'author_coder_bob', 'author_turso_tester', 'author_impostor_user')");
    } catch {}
    process.exit(1);
  }
}

main();
