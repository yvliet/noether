# Community Directory Overview

The Flint Community Directory is designed to connect creators with users who want to extend their personal knowledge workspace with custom plugins, themes, and AI tools.


## 1. Current State: Local-First Extension Loading

---

Flint is engineered as a local-first application. In the current release:

- **Local Discovery**: Extensions reside directly within your active workspace folder at `<hearth>/.flint/plugins/<extension-id>/`.
- **Zero Network Required**: Extensions execute entirely offline inside your local sandbox.
- **Direct Testing**: As soon as an extension folder containing `manifest.json` and `main.js` is placed inside `.flint/plugins/`, Flint detects it and permits activation via **Settings > Extensions**.

```
My-Hearth/
└── .flint/
    └── plugins/
        ├── word-counter/
        │   ├── manifest.json
        │   └── main.js
        └── my-custom-plugin/
            ├── manifest.json
            └── main.js
```


## 2. Planned Cloud Registry & One-Click Installation

---

I am actively developing an official community directory registry. When launched, this will provide:

- **In-App Discovery**: Browse, search, and install verified community plugins directly within the desktop application interface.
- **Automated Version Checks**: Automatic notifications when plugin authors release new versions on GitHub.
- **Cryptographic Publisher Verification**: Secure namespace verification linking plugin authors to their verified GitHub identities.

Until this service launches, extensions and themes are distributed via GitHub repositories and installed by placing the compiled files into your local Hearth.


## 3. Getting Involved

---

- To build your first extension, follow [[Plugin Quick Start]].
- To style custom themes, follow [[Build Your First Theme]].
- Review my privacy and performance requirements in [[Developer Policies & Guidelines]].
- Share your extensions and discuss new APIs with me and fellow developers on [GitHub Discussions](https://github.com/yvliet/flint/discussions).
