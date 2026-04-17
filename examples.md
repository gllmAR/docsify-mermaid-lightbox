# Mermaid Examples

A collection of diagram types to test the plugin.

## Flowchart

```mermaid
graph TD
    Start([Start]) --> Input[/Read Input/]
    Input --> Decision{Valid?}
    Decision -->|Yes| Process[Process Data]
    Decision -->|No| Error[Show Error]
    Error --> Input
    Process --> Output[/Display Result/]
    Output --> End([End])
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant Docsify
    participant Plugin
    participant Mermaid

    Browser->>Docsify: Load page
    Docsify->>Plugin: doneEach hook
    Plugin->>Plugin: Find mermaid code blocks
    Plugin->>Mermaid: render(id, source)
    Mermaid-->>Plugin: SVG output
    Plugin-->>Browser: Replace code block with SVG
    Browser->>Browser: Click diagram
    Browser->>Plugin: Open lightbox
```

## Class Diagram

```mermaid
classDiagram
    class DocsifyPlugin {
        +afterEach(html) string
        +doneEach() void
    }
    class MermaidRenderer {
        -counter: int
        +loadMermaid() Promise
        +renderDiagrams(el) void
    }
    class Lightbox {
        -scale: float
        -x: float
        -y: float
        +open(index) void
        +close() void
        +zoomIn() void
        +zoomOut() void
        +pan(dx, dy) void
    }
    DocsifyPlugin --> MermaidRenderer : uses
    DocsifyPlugin --> Lightbox : creates
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : Page navigation
    Loading --> Rendering : Mermaid blocks found
    Loading --> Idle : No diagrams
    Rendering --> Displayed : SVG ready
    Displayed --> Lightbox : Click diagram
    Lightbox --> Displayed : Close / Esc
    Displayed --> Idle : Navigate away
```

## Gantt Chart

```mermaid
gantt
    title Plugin Development Timeline
    dateFormat  YYYY-MM-DD
    section Core
        Plugin scaffold        :done,    p1, 2025-01-01, 3d
        Mermaid integration    :done,    p2, after p1, 4d
        CSS injection          :done,    p3, after p1, 2d
    section Lightbox
        Overlay & toolbar      :done,    l1, after p2, 3d
        Zoom & pan             :done,    l2, after l1, 3d
        Navigation arrows      :done,    l3, after l2, 2d
    section Polish
        Touch support          :done,    x1, after l3, 2d
        Keyboard shortcuts     :done,    x2, after l3, 1d
        Documentation          :active,  x3, after x2, 3d
```

## Pie Chart

```mermaid
pie title Lines of Code Breakdown
    "Plugin logic" : 45
    "CSS styles" : 25
    "Lightbox" : 20
    "Config & glue" : 10
```

## Entity Relationship

```mermaid
erDiagram
    DOCSIFY ||--o{ PAGE : renders
    PAGE ||--o{ MERMAID_BLOCK : contains
    MERMAID_BLOCK ||--|| SVG_DIAGRAM : "compiled to"
    SVG_DIAGRAM ||--o| LIGHTBOX : "opened in"
```

## Git Graph

```mermaid
gitGraph
    commit id: "init"
    commit id: "plugin scaffold"
    branch feature/lightbox
    commit id: "overlay"
    commit id: "zoom & pan"
    commit id: "navigation"
    checkout main
    merge feature/lightbox id: "merge lightbox"
    commit id: "docs"
    commit id: "release v1.0"
```
