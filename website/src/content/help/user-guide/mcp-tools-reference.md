# MCP Tools Reference

This reference lists all built-in Model Context Protocol (MCP) tools available to connected AI assistants.

## 1. Native Vault Tools
---

The local Noether MCP server provides tools for reading, searching, and managing notes over standard input/output (`stdio`):

| Tool Name | Action | Description |
| :--- | :--- | :--- |
| `noether_list_vaults` | Discovery | Lists all known local vaults on your machine. |
| `noether_get_active_vault` | Context | Returns metadata for the currently active vault. |
| `noether_switch_vault` | Navigation | Switches the active vault context by path or name. |
| `noether_search_notes` | Retrieval | Fast keyword search across note titles and content. |
| `noether_search_across_vaults` | Retrieval | Searches across all known local vaults at once. |
| `noether_read_note` | Retrieval | Reads raw CommonMark content and frontmatter metadata. |
| `noether_create_note` | Mutation | Creates a new `.md` file at a vault path with content. |
| `noether_update_note` | Mutation | Overwrites or updates an existing note safely. |
| `noether_delete_note` | Safety | Moves a note to `.trash/` (non-destructive deletion). |
| `noether_list_all_notes` | Index | Returns a flat listing of all note paths and metadata. |
| `noether_get_backlinks` | Graph | Returns incoming and outgoing links for a note. |
| `noether_run_script` | Automation | Executes sandboxed JavaScript scripts inside Noether. |

## 2. Custom Tools
---

You can create custom scripts in `.noether/tools/` that AI assistants can discover and call as MCP tools:

| Tool Name | Action | Description |
| :--- | :--- | :--- |
| `noether_create_custom_tool` | Automation | Creates a new tool script in `.noether/tools/`. |
| `noether_list_custom_tools` | Discovery | Lists all user-created custom tools. |
| `noether_run_custom_tool` | Automation | Executes a custom tool by name with arguments. |
| `noether_delete_custom_tool` | Automation | Deletes a custom tool from `.noether/tools/`. |

## 3. Core Extension Tools
---

When core extensions are enabled in Noether, they register tools that AI assistants can use:

- **Backlinks**: `backlinks_get_incoming`, `backlinks_get_outgoing`, `backlinks_get_unlinked_mentions`, `backlinks_convert_mention`, `backlinks_insert_link`
- **Bookmarks**: `bookmarks_list`, `bookmarks_toggle`
- **Canvas**: `canvas_create_board`, `canvas_get_board`, `canvas_create_node`, `canvas_create_edge`, `canvas_delete_node`
- **Covers**: `covers_get`, `covers_set`, `covers_remove`
- **Graph View**: `graph_get_network`, `graph_get_orphans`, `graph_get_local_graph`, `graph_get_related_notes`, `graph_find_path`, `graph_get_hub_notes`
- **Version History**: `history_get_file_history`, `history_get_file_diff`, `history_restore_file_version`, `history_create_file_snapshot`
- **Daily Journal**: `journal_open_today`, `journal_open_date`, `journal_append_entry`
- **Marketplace**: `marketplace_list_installed`, `marketplace_search`
- **More Icons**: `more-icons_list`, `more-icons_get`, `more-icons_update_icon`, `more-icons_delete_icon`
- **Outline**: `outline_get_headings`
- **Properties**: `properties_get`, `properties_set`, `properties_delete`
- **Database Sync**: `sync_sync_now`, `sync_get_sync_status`, `sync_test_connection`
- **Tags**: `tags_list_all`, `tags_get_tree`, `tags_get_documents_for_tag`
- **Tasks**: `tasks_get_all`, `tasks_get_by_document`, `tasks_toggle_status`

## 4. Next Steps
---

- For client setup guides (Claude Desktop, Cursor, Windsurf), see [[AI Assistants & MCP]].
- To learn how to build your own tools in extensions, see [[Model Context Protocol (MCP) Runtime]] and [[Model Context Protocol (MCP) Tools]].
