# docsify-mermaid-lightbox

A lightweight, self-contained Docsify 5 plugin for **Mermaid** diagram rendering with a full-featured **lightbox**.  
Single `<script>` import — no extra CSS or dependency tags needed.

## Features

- **Single `<script>` tag** — auto-loads Mermaid from CDN, injects all CSS
- **Auto dark / light mode** — detects Docsify 5 theme or OS preference, picks matching Mermaid theme
- **Lightbox** with fit-to-screen zoom, pan, and keyboard navigation
- **Wide zoom range** — 0.1x to 20x, with adaptive scroll speed
- Pinch-to-zoom and swipe navigation on touch devices
- Previous / Next diagram navigation inside the lightbox
- **Copy to clipboard** button on each diagram (copies markdown fenced code block)
- Works with GitHub Pages out of the box

## Quick start

```html
<script src="docsify-mermaid-lightbox.js"></script>
```

That's it. Drop the script **before** the Docsify script in your `index.html`.

## Configuration

Optional — set `window.$docsifyMermaid` before the plugin loads:

```js
window.$docsifyMermaid = {
  theme: 'auto',       // 'auto' (default), 'neutral', 'default', 'dark', 'forest'
  lightbox: true,      // set false to disable the lightbox
};
```

| Option | Default | Description |
|--------|---------|-------------|
| `theme` | `'auto'` | Mermaid theme. `'auto'` picks `dark` or `neutral` based on OS / Docsify 5 theme |
| `mermaidUrl` | jsDelivr latest | Custom URL for the Mermaid ESM module |
| `lightbox` | `true` | Enable / disable the lightbox on click |

## Writing diagrams

Use fenced code blocks with the language `mermaid`:

````markdown
```mermaid
graph LR
  A --> B --> C
```
````

## Lightbox controls

| Action | Mouse / Touch | Keyboard |
|--------|--------------|----------|
| Open | Click diagram | — |
| Close | Click backdrop / ✕ | `Esc` |
| Zoom in | Scroll up / pinch out / `+` button | `+` |
| Zoom out | Scroll down / pinch in / `−` button | `-` |
| Reset (fit) | `↺` button / double-tap | `0` |
| Previous | `❮` button / swipe right | `←` |
| Next | `❯` button / swipe left | `→` |
| Pan | Drag (when zoomed) | — |
| Copy source | `⎘` button (top-right of diagram) | — |

## Test pages

- [Examples](examples.md) — common diagram types
- [Stress Test](stress-test.md) — **all 21 Mermaid diagram types** in one page

## Demo diagram

```mermaid
graph TD
    A[Visit Site] --> B{Has Mermaid?}
    B -->|Yes| C[Render Diagram]
    B -->|No| D[Show Code Block]
    C --> E[Click to Expand]
    E --> F[Lightbox with Zoom & Pan]
```

## License

MIT
