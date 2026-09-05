# ProseMirror & Editor Bridge

Extensions in Flint can integrate directly into the TipTap 2.x and ProseMirror Live Preview editor engine using `this.registerEditorPlugin()`.


## 1. Registering an Editor Plugin

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


## 2. $O(1)$ Transaction Decoration Mapping

---

Flint maps editor decorations through ProseMirror transaction steps (`mapping.map(decorations)`), running in $O(K)$ time over active decorations rather than rescanning the whole document, preserving sub-8ms typing latency on documents with over 100,000 words.
