# 04 - Block Editor UI

> **Status:** ✅ Implemented
> **Priority:** High
> **Dependencies:** 03_BLOCK_SYSTEM
> **Package:** `@questpie/admin`

## Overview

Admin UI komponenty pre vizualne editovanie blokov. Drag-drop reordering, block picker, inline editing, nested blocks.

---

## Component Hierarchy

```
<BlockEditorProvider>
  ├── <BlockEditorLayout>              // Split pane layout
  │   │
  │   ├── <BlockCanvas>                // Left pane - block tree
  │   │   ├── <BlockTree>
  │   │   │   └── <BlockItem>          // Draggable block item
  │   │   │       ├── <BlockDragHandle>
  │   │   │       ├── <BlockTypeIcon>
  │   │   │       ├── <BlockLabel>
  │   │   │       ├── <BlockActions>   // Duplicate, delete, etc.
  │   │   │       └── <BlockChildren>  // Nested blocks (if layout)
  │   │   │
  │   │   └── <BlockInsertButton>      // Add block at position
  │   │
  │   └── <BlockSidebar>               // Right pane - contextual
  │       ├── <BlockForm>              // Edit selected block
  │       └── <BlockLibrary>           // Block picker (when adding)
  │
  └── (Preview handled by Collection Preview - Phase 05)
</BlockEditorProvider>
```

---

## BlockEditorContext

```typescript
// packages/admin/src/client/components/blocks/block-editor-context.tsx

export type BlockEditorState = {
  /** Block content (tree + values) */
  content: BlockContent;
  /** Currently selected block ID */
  selectedBlockId: string | null;
  /** Expanded block IDs (for nested blocks) */
  expandedBlockIds: Set<string>;
  /** Is block library open */
  isLibraryOpen: boolean;
  /** Insert position when adding new block */
  insertPosition: InsertPosition | null;
  /** Registered block definitions */
  blocks: Record<string, BlockDefinition>;
  /** Allowed block types for this field */
  allowedBlocks: string[] | null;
};

export type InsertPosition = {
  parentId: string | null; // null = root level
  index: number;
};

export type BlockEditorActions = {
  // Selection
  selectBlock: (id: string | null) => void;
  toggleExpanded: (id: string) => void;

  // CRUD
  addBlock: (type: string, position: InsertPosition) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;

  // Reorder
  moveBlock: (id: string, toPosition: InsertPosition) => void;

  // Values
  updateBlockValues: (id: string, values: Record<string, any>) => void;

  // Library
  openLibrary: (position: InsertPosition) => void;
  closeLibrary: () => void;
};

export type BlockEditorContextValue = {
  state: BlockEditorState;
  actions: BlockEditorActions;
};

const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);

export function useBlockEditor() {
  const ctx = useContext(BlockEditorContext);
  if (!ctx)
    throw new Error("useBlockEditor must be used within BlockEditorProvider");
  return ctx;
}
```

---

## BlockEditorProvider

```typescript
// packages/admin/src/client/components/blocks/block-editor-provider.tsx

export type BlockEditorProviderProps = {
  /** Initial content */
  value: BlockContent;
  /** Change handler */
  onChange: (content: BlockContent) => void;
  /** Registered blocks */
  blocks: Record<string, BlockDefinition>;
  /** Allowed block types (optional filter) */
  allowedBlocks?: string[];
  children: React.ReactNode;
};

export function BlockEditorProvider({
  value,
  onChange,
  blocks,
  allowedBlocks,
  children,
}: BlockEditorProviderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState<InsertPosition | null>(null);

  const actions: BlockEditorActions = useMemo(() => ({
    selectBlock: (id) => setSelectedBlockId(id),

    toggleExpanded: (id) => {
      setExpandedBlockIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },

    addBlock: (type, position) => {
      const blockDef = blocks[type];
      if (!blockDef) return;

      const newBlock: BlockNode = {
        id: crypto.randomUUID(),
        type,
        children: [],
      };

      const newValues = getDefaultValues(blockDef.fields);

      onChange({
        _tree: insertBlockInTree(value._tree, newBlock, position),
        _values: { ...value._values, [newBlock.id]: newValues },
      });

      setSelectedBlockId(newBlock.id);
      setIsLibraryOpen(false);
      setInsertPosition(null);
    },

    removeBlock: (id) => {
      const { newTree, removedIds } = removeBlockFromTree(value._tree, id);
      const newValues = { ...value._values };
      for (const removedId of removedIds) {
        delete newValues[removedId];
      }

      onChange({ _tree: newTree, _values: newValues });

      if (selectedBlockId === id || removedIds.includes(selectedBlockId!)) {
        setSelectedBlockId(null);
      }
    },

    duplicateBlock: (id) => {
      const { newTree, newIds, newValues } = duplicateBlockInTree(
        value._tree,
        value._values,
        id
      );

      onChange({
        _tree: newTree,
        _values: { ...value._values, ...newValues },
      });

      setSelectedBlockId(newIds[0]);
    },

    moveBlock: (id, toPosition) => {
      onChange({
        ...value,
        _tree: moveBlockInTree(value._tree, id, toPosition),
      });
    },

    updateBlockValues: (id, newValues) => {
      onChange({
        ...value,
        _values: {
          ...value._values,
          [id]: { ...value._values[id], ...newValues },
        },
      });
    },

    openLibrary: (position) => {
      setInsertPosition(position);
      setIsLibraryOpen(true);
    },

    closeLibrary: () => {
      setIsLibraryOpen(false);
      setInsertPosition(null);
    },
  }), [value, onChange, blocks, selectedBlockId]);

  const state: BlockEditorState = {
    content: value,
    selectedBlockId,
    expandedBlockIds,
    isLibraryOpen,
    insertPosition,
    blocks,
    allowedBlocks: allowedBlocks || null,
  };

  return (
    <BlockEditorContext.Provider value={{ state, actions }}>
      {children}
    </BlockEditorContext.Provider>
  );
}
```

---

## BlockEditorLayout

```typescript
// packages/admin/src/client/components/blocks/block-editor-layout.tsx

export function BlockEditorLayout() {
  const { state } = useBlockEditor();

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Left pane - Block tree (60%) */}
      <div className="w-3/5 border-r overflow-auto bg-muted/30">
        <BlockCanvas />
      </div>

      {/* Right pane - Sidebar (40%) */}
      <div className="w-2/5 overflow-auto">
        {state.isLibraryOpen ? (
          <BlockLibrary />
        ) : state.selectedBlockId ? (
          <BlockForm blockId={state.selectedBlockId} />
        ) : (
          <BlockSidebarEmpty />
        )}
      </div>
    </div>
  );
}

function BlockSidebarEmpty() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p>Select a block to edit</p>
    </div>
  );
}
```

---

## BlockCanvas

```typescript
// packages/admin/src/client/components/blocks/block-canvas.tsx

export function BlockCanvas() {
  const { state, actions } = useBlockEditor();

  return (
    <div className="p-4">
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={state.content._tree.map(b => b.id)}>
          <BlockTree
            blocks={state.content._tree}
            level={0}
            parentId={null}
          />
        </SortableContext>
      </DndContext>

      {/* Add block at end */}
      <BlockInsertButton
        position={{ parentId: null, index: state.content._tree.length }}
      />
    </div>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Calculate new position from over target
    const newPosition = calculateDropPosition(over);
    actions.moveBlock(active.id as string, newPosition);
  }
}
```

---

## BlockTree & BlockItem

```typescript
// packages/admin/src/client/components/blocks/block-tree.tsx

type BlockTreeProps = {
  blocks: BlockNode[];
  level: number;
  parentId: string | null;
};

export function BlockTree({ blocks, level, parentId }: BlockTreeProps) {
  const { state, actions } = useBlockEditor();

  return (
    <div className={cn("space-y-1", level > 0 && "ml-6 pl-4 border-l")}>
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <BlockItem
            block={block}
            level={level}
            index={index}
            parentId={parentId}
          />

          {/* Insert button between blocks */}
          <BlockInsertButton
            position={{ parentId, index: index + 1 }}
            compact
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// packages/admin/src/client/components/blocks/block-item.tsx

type BlockItemProps = {
  block: BlockNode;
  level: number;
  index: number;
  parentId: string | null;
};

export function BlockItem({ block, level, index, parentId }: BlockItemProps) {
  const { state, actions } = useBlockEditor();
  const blockDef = state.blocks[block.type];
  const isSelected = state.selectedBlockId === block.id;
  const isExpanded = state.expandedBlockIds.has(block.id);
  const hasChildren = block.children.length > 0;
  const canHaveChildren = blockDef?.allowChildren;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group",
        isDragging && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md cursor-pointer",
          "hover:bg-accent",
          isSelected && "bg-accent ring-2 ring-primary"
        )}
        onClick={() => actions.selectBlock(block.id)}
      >
        {/* Drag handle */}
        <button
          className="cursor-grab opacity-0 group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical className="h-4 w-4" />
        </button>

        {/* Expand/collapse for layout blocks */}
        {canHaveChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleExpanded(block.id);
            }}
            className="p-0.5"
          >
            {isExpanded ? (
              <CaretDown className="h-4 w-4" />
            ) : (
              <CaretRight className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Block icon */}
        <BlockTypeIcon type={block.type} />

        {/* Block label */}
        <span className="flex-1 truncate text-sm">
          {getBlockLabel(block, blockDef, state.content._values[block.id])}
        </span>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.duplicateBlock(block.id);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.removeBlock(block.id);
            }}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {canHaveChildren && isExpanded && (
        <div className="mt-1">
          <BlockTree
            blocks={block.children}
            level={level + 1}
            parentId={block.id}
          />

          {/* Add child block button */}
          <BlockInsertButton
            position={{ parentId: block.id, index: block.children.length }}
            compact
            className="ml-6"
          />
        </div>
      )}
    </div>
  );
}

function getBlockLabel(
  block: BlockNode,
  blockDef: BlockDefinition | undefined,
  values: Record<string, any> | undefined
): string {
  // Try to get meaningful label from values
  const title = values?.title || values?.name || values?.label;
  if (title && typeof title === "string") {
    return title.slice(0, 50);
  }

  // Fall back to block type label
  return blockDef?.label?.en || block.type;
}
```

---

## BlockInsertButton

```typescript
// packages/admin/src/client/components/blocks/block-insert-button.tsx

type BlockInsertButtonProps = {
  position: InsertPosition;
  compact?: boolean;
  className?: string;
};

export function BlockInsertButton({
  position,
  compact,
  className,
}: BlockInsertButtonProps) {
  const { actions } = useBlockEditor();

  if (compact) {
    return (
      <button
        className={cn(
          "w-full h-1 group flex items-center justify-center",
          "hover:h-8 transition-all",
          className
        )}
        onClick={() => actions.openLibrary(position)}
      >
        <div className="hidden group-hover:flex items-center gap-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          <span>Add block</span>
        </div>
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      className={cn("w-full border-dashed", className)}
      onClick={() => actions.openLibrary(position)}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add block
    </Button>
  );
}
```

---

## BlockLibrary

```typescript
// packages/admin/src/client/components/blocks/block-library.tsx

export function BlockLibrary() {
  const { state, actions } = useBlockEditor();
  const [search, setSearch] = useState("");

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const result = new Map<string, BlockDefinition[]>();

    for (const [name, def] of Object.entries(state.blocks)) {
      // Filter by allowed blocks
      if (state.allowedBlocks && !state.allowedBlocks.includes(name)) {
        continue;
      }

      // Filter by search
      if (search) {
        const label = def.label?.en || name;
        if (!label.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }
      }

      const category = def.category || "other";
      if (!result.has(category)) {
        result.set(category, []);
      }
      result.get(category)!.push({ ...def, name });
    }

    return result;
  }, [state.blocks, state.allowedBlocks, search]);

  const handleSelect = (type: string) => {
    if (state.insertPosition) {
      actions.addBlock(type, state.insertPosition);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Add Block</h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.closeLibrary}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search blocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Block list by category */}
      <div className="space-y-4">
        {Array.from(blocksByCategory.entries()).map(([category, blocks]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              {getCategoryLabel(category)}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {blocks.map((block) => (
                <button
                  key={block.name}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-md",
                    "border hover:border-primary hover:bg-accent",
                    "transition-colors"
                  )}
                  onClick={() => handleSelect(block.name)}
                >
                  <BlockTypeIcon type={block.name} className="h-8 w-8" />
                  <span className="text-sm">{block.label?.en || block.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    layout: "Layout",
    content: "Content",
    media: "Media",
    sections: "Sections",
    interactive: "Interactive",
    other: "Other",
  };
  return labels[category] || category;
}
```

---

## BlockForm

```typescript
// packages/admin/src/client/components/blocks/block-form.tsx

type BlockFormProps = {
  blockId: string;
};

export function BlockForm({ blockId }: BlockFormProps) {
  const { state, actions } = useBlockEditor();
  const block = findBlockById(state.content._tree, blockId);
  const blockDef = block ? state.blocks[block.type] : null;
  const values = state.content._values[blockId] || {};

  if (!block || !blockDef) {
    return null;
  }

  // Collect localized field paths for _meta
  const localizedPaths = useMemo(() => {
    return Object.entries(blockDef.fields || {})
      .filter(([_, field]) => field["~options"]?.localized)
      .map(([key]) => key);
  }, [blockDef.fields]);

  const handleChange = (newValues: Record<string, any>) => {
    actions.updateBlockValues(blockId, newValues);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BlockTypeIcon type={block.type} />
        <h3 className="font-medium">{blockDef.label?.en || block.type}</h3>
      </div>

      {blockDef.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {blockDef.description.en}
        </p>
      )}

      {/* Auto-generated form from block fields */}
      <AutoFormFields
        fields={blockDef.fields}
        values={values}
        onChange={handleChange}
        localizedPaths={localizedPaths}
      />
    </div>
  );
}
```

---

## BlocksField (Form Field Component)

```typescript
// packages/admin/src/client/components/fields/blocks/blocks-field.tsx

export function BlocksField({
  value,
  onChange,
  config,
  blocks,
}: FieldComponentProps<BlockContent, BlocksFieldConfig>) {
  // Default empty content
  const content: BlockContent = value || { _tree: [], _values: {} };

  // Filter blocks by allowedBlocks config
  const filteredBlocks = useMemo(() => {
    if (!config.allowedBlocks) return blocks;
    return Object.fromEntries(
      Object.entries(blocks).filter(([name]) =>
        config.allowedBlocks!.includes(name)
      )
    );
  }, [blocks, config.allowedBlocks]);

  return (
    <BlockEditorProvider
      value={content}
      onChange={onChange}
      blocks={filteredBlocks}
      allowedBlocks={config.allowedBlocks}
    >
      <BlockEditorLayout />
    </BlockEditorProvider>
  );
}
```

---

## Tree Utilities

```typescript
// packages/admin/src/client/components/blocks/utils/tree-utils.ts

export function findBlockById(tree: BlockNode[], id: string): BlockNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findBlockById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function insertBlockInTree(
  tree: BlockNode[],
  block: BlockNode,
  position: InsertPosition,
): BlockNode[] {
  if (position.parentId === null) {
    // Insert at root level
    const newTree = [...tree];
    newTree.splice(position.index, 0, block);
    return newTree;
  }

  // Insert as child of parent
  return tree.map((node) => {
    if (node.id === position.parentId) {
      const newChildren = [...node.children];
      newChildren.splice(position.index, 0, block);
      return { ...node, children: newChildren };
    }
    return {
      ...node,
      children: insertBlockInTree(node.children, block, position),
    };
  });
}

export function removeBlockFromTree(
  tree: BlockNode[],
  id: string,
): { newTree: BlockNode[]; removedIds: string[] } {
  const removedIds: string[] = [];

  function collectIds(node: BlockNode) {
    removedIds.push(node.id);
    node.children.forEach(collectIds);
  }

  function remove(nodes: BlockNode[]): BlockNode[] {
    return nodes
      .filter((node) => {
        if (node.id === id) {
          collectIds(node);
          return false;
        }
        return true;
      })
      .map((node) => ({
        ...node,
        children: remove(node.children),
      }));
  }

  return { newTree: remove(tree), removedIds };
}

export function moveBlockInTree(
  tree: BlockNode[],
  blockId: string,
  toPosition: InsertPosition,
): BlockNode[] {
  // Find and remove block
  const block = findBlockById(tree, blockId);
  if (!block) return tree;

  const { newTree } = removeBlockFromTree(tree, blockId);

  // Insert at new position
  return insertBlockInTree(newTree, block, toPosition);
}

export function duplicateBlockInTree(
  tree: BlockNode[],
  values: Record<string, Record<string, any>>,
  blockId: string,
): {
  newTree: BlockNode[];
  newIds: string[];
  newValues: Record<string, Record<string, any>>;
} {
  const block = findBlockById(tree, blockId);
  if (!block) {
    return { newTree: tree, newIds: [], newValues: {} };
  }

  const newIds: string[] = [];
  const newValues: Record<string, Record<string, any>> = {};

  function cloneNode(node: BlockNode): BlockNode {
    const newId = crypto.randomUUID();
    newIds.push(newId);
    newValues[newId] = { ...values[node.id] };

    return {
      id: newId,
      type: node.type,
      children: node.children.map(cloneNode),
    };
  }

  const clonedBlock = cloneNode(block);

  // Find parent and index
  const { parentId, index } = findBlockPosition(tree, blockId);

  // Insert after original
  const newTree = insertBlockInTree(tree, clonedBlock, {
    parentId,
    index: index + 1,
  });

  return { newTree, newIds, newValues };
}
```

---

## File Structure

```
packages/admin/src/client/components/blocks/
├── block-editor-context.tsx
├── block-editor-provider.tsx
├── block-editor-layout.tsx
├── block-canvas.tsx
├── block-tree.tsx
├── block-item.tsx
├── block-insert-button.tsx
├── block-library.tsx
├── block-form.tsx
├── block-type-icon.tsx
├── utils/
│   └── tree-utils.ts
└── index.ts

packages/admin/src/client/components/fields/blocks/
├── blocks-field.tsx
└── index.ts
```

---

## Keyboard Shortcuts

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Delete` / `Backspace` | Delete selected block    |
| `Cmd+D`                | Duplicate selected block |
| `Escape`               | Deselect / Close library |
| `Arrow Up/Down`        | Navigate blocks          |
| `Enter`                | Edit selected block      |

---

## Drag & Drop

Using `@dnd-kit/core` and `@dnd-kit/sortable`:

- Drag handle on each block item
- Visual drop indicators between blocks
- Support for nested drops (into layout blocks)
- Keyboard accessible reordering
