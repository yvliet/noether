/**
 * @module PluginRoutesBackwardCompatibility
 * @description
 * Re-exports the extension routes as pluginRoutes to ensure 100% backward
 * compatibility with legacy client libraries and existing tests.
 */

import { extensionRoutes } from './extensions.js';

export const pluginRoutes = extensionRoutes;
export default extensionRoutes;
