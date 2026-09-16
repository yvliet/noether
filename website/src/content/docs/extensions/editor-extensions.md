# ProseMirror & Editor Bridge

Extensions in Noether can integrate directly into the TipTap 2.x and ProseMirror Live Preview editor engine using `this.registerEditorPlugin()`.


## 1. Registering Editor Extensions & Middleware

---

```typescript
this.registerEditorPlugin({
  id: 'custom-mention-decorator',
  decorations: (state, ctx) => {
    // Return custom mapped DecorationSet
    return null;
  },
  shortcuts: {
    'Mod-Alt-m': (editor) => {
      editor.chain().focus().insertContent('@').run();
      return true;
    },
  },
});
```


## 2. Transaction Decoration Mapping

---

When creating custom editor decorations, avoid re-scanning the entire document on every keystroke. Noether maps existing decorations through ProseMirror transaction steps (`mapping.map(decorations)`), which updates active decorations rather than reparsing the whole note. Only the dirty range being edited needs to be inspected for new tokens, keeping the editor responsive even on long documents.
