# Organizations & Teams

Open-source teams, research labs, and collective developer groups can publish and maintain Flint extensions collaboratively.


## 1. Collaborative Ownership

---

When developing extensions under an organization or team handle:

- Host the repository under your GitHub organization.
- Specify the organization handle in the `author` field of `manifest.json`.
- Provide an `authorUrl` pointing to your organization profile or documentation portal.

```json
{
  "id": "chem-formula-renderer",
  "name": "Chemical Formula Renderer",
  "author": "OpenScience Labs",
  "authorUrl": "https://github.com/openscience-labs"
}
```


## 2. Namespace Recommendations

---

For organization-scoped extensions, I recommend prefixing your extension `id` with your team abbreviation if working on specialized domain tools:

- `osl-chem-renderer`
- `osl-citation-importer`

This ensures clear brand recognition and prevents collisions with general community utilities.

To build and test extensions with your team, follow [[Plugin Quick Start]] and [[Extension Points Reference]].
