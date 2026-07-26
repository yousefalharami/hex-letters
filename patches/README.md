# patches/

`ScreenOrientation.swift.patched` is a reference copy of the fixed
`@capacitor/screen-orientation` iOS plugin source. `node_modules/` is
gitignored, so this hand-patch (see CLAUDE.md's "Orientation is per-screen"
section for exactly what it fixes and why) is otherwise invisible to git and
gets silently lost on a fresh `npm install`.

If iPad landscape-lock stops working after reinstalling dependencies, restore
it with:

```
cp patches/ScreenOrientation.swift.patched node_modules/@capacitor/screen-orientation/ios/Sources/ScreenOrientationPlugin/ScreenOrientation.swift
```

Then `npx cap sync ios` and a clean rebuild (the fix is native Swift code —
requires an actual recompile, not just a webview reload).
