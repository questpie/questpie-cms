export interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'email' | 'image' | 'currency' | 'tags' | 'time' | 'status' | 'array' | 'relationship';
  options?: string[]; // For select inputs
  fields?: Field[]; // For array types
  relationTo?: string; // For relationship types
  hasMany?: boolean; // For relationship types
  admin?: {
    placeholder?: string;
    width?: 'full' | 'half' | 'third'; 
    position?: 'main' | 'sidebar'; // Layout positioning
    description?: string;
  };
}

export interface CollectionConfig {
  slug: string;
  type: 'collection' | 'global'; // Differentiate between lists and singletons
  group: string;
  icon?: string;
  viewType?: 'list' | 'tree'; // Hierarchical support
  treeConfig?: { // Configuration for showing related items in tree
    relationCollection: string; // The slug of the related collection (e.g., 'services')
    relationField: string; // The field in the related collection that points to this one (e.g., 'category')
  };
  orderable?: boolean; // Enable drag and drop
  admin: {
    useAsTitle: string;
    defaultColumns?: string[];
  };
  labels: {
    singular: string;
    plural: string;
  };
  fields: Field[];
}

export interface Doc {
  id: string;
  createdAt: string;
  updatedAt: string;
  parent?: string | null; // For tree view
  order?: number; // For drag and drop
  [key: string]: any;
}

export interface WidgetConfig {
  id: string;
  type: 'stats' | 'chart' | 'activity' | 'list';
  title: string;
  size: 'full' | 'half' | 'third';
}

export interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string;
}

export interface SavedView {
  id: string;
  name: string;
  slug: string;
  filters: FilterRule[];
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  visibleColumns: string[];
}
