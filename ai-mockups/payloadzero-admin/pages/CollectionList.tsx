import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Trash2, SlidersHorizontal, 
  ArrowUp, ArrowDown, GripVertical, Folder, FolderOpen, ChevronRight, Check, X,
  Box, ArrowRight, Eye, EyeOff, Link as LinkIcon, Save, Filter
} from 'lucide-react';
import { COLLECTIONS, MOCK_DATA } from '../constants';
import { FilterRule, SavedView, Doc } from '../types';
import Sheet from '../components/Sheet';

const CollectionList: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const config = COLLECTIONS.find(c => c.slug === slug);
  
  // --- STATE ---
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View Configuration State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Saved Views State
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState('');

  // UI State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'filters' | 'views'>('columns');

  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  // Identify if collection has status field
  const statusField = config?.fields.find(f => f.name === 'isActive' || f.name === 'status');

  // --- EFFECTS ---
  useEffect(() => {
    if (slug && MOCK_DATA[slug] && config) {
      setData(MOCK_DATA[slug]);
      setVisibleColumns(config.admin.defaultColumns || config.fields.slice(0, 5).map(f => f.name));
      setFilters([]);
      setSortConfig(config.orderable ? { key: 'order', direction: 'asc' } : null);
      setShowActiveOnly(false);
      // Mock some saved views
      setSavedViews([
          { 
              id: 'default', 
              name: 'Default View', 
              slug: slug, 
              filters: [], 
              sortConfig: null, 
              visibleColumns: config.admin.defaultColumns || config.fields.slice(0, 5).map(f => f.name) 
          }
      ]);
    }
  }, [slug, config]);

  if (!config) return <div className="p-8 text-center text-zinc-500">Collection not found</div>;

  // --- ACTIONS ---
  
  // Sorting
  const handleHeaderClick = (fieldName: string) => {
    setSortConfig(current => {
        if (current?.key === fieldName) {
            if (current.direction === 'asc') return { key: fieldName, direction: 'desc' };
            return null; // Toggle off
        }
        return { key: fieldName, direction: 'asc' };
    });
  };

  // Columns
  const toggleColumn = (fieldName: string) => {
    setVisibleColumns(current => {
        if (current.includes(fieldName)) {
            return current.filter(f => f !== fieldName);
        }
        return [...current, fieldName];
    });
  };

  // Filters
  const addFilter = () => {
    setFilters([...filters, { id: Date.now().toString(), field: config.fields[0].name, operator: 'contains', value: '' }]);
  };

  const updateFilter = (id: string, key: keyof FilterRule, value: string) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  // Views
  const saveCurrentView = () => {
    if (!viewName) return;
    const newView: SavedView = {
        id: Date.now().toString(),
        name: viewName,
        slug: slug || '',
        filters: [...filters],
        sortConfig: sortConfig ? { ...sortConfig } : null,
        visibleColumns: [...visibleColumns]
    };
    setSavedViews([...savedViews, newView]);
    setViewName('');
  };

  const loadView = (view: SavedView) => {
    setFilters(view.filters);
    setSortConfig(view.sortConfig);
    setVisibleColumns(view.visibleColumns);
    setIsSheetOpen(false);
  };

  // Inline Edit
  const startEditing = (doc: Doc, fieldName: string, e: React.MouseEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      setEditingCell({ id: doc.id, field: fieldName });
      setEditValue(doc[fieldName]);
  };

  const saveEdit = (id: string, fieldName: string) => {
      setData(prev => prev.map(d => d.id === id ? { ...d, [fieldName]: editValue } : d));
      setEditingCell(null);
  };

  const cancelEdit = () => {
      setEditingCell(null);
  };

  // Immediate toggle for boolean-like status
  const handleToggleStatus = (e: React.MouseEvent, doc: Doc, fieldName: string) => {
      e.preventDefault();
      e.stopPropagation();
      const current = doc[fieldName];
      // Logic for various status types
      let next;
      if (current === 'Active') next = 'Draft';
      else if (current === 'Draft') next = 'Active';
      else if (current === 'On') next = 'Off';
      else if (current === 'Off') next = 'On';
      else return; // Don't toggle other statuses blindly

      setData(prev => prev.map(d => d.id === doc.id ? { ...d, [fieldName]: next } : d));
  };

  // --- DRAG AND DROP LOGIC (ID-Based) ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('dragId', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const dragId = e.dataTransfer.getData('dragId');
      if (dragId === targetId) return;
      
      const newData = [...data];
      const dragIndex = newData.findIndex(d => d.id === dragId);
      const targetIndex = newData.findIndex(d => d.id === targetId);
      
      if (dragIndex === -1 || targetIndex === -1) return;

      const [draggedItem] = newData.splice(dragIndex, 1);
      newData.splice(targetIndex, 0, draggedItem);
      
      // Update order field mock for all items to ensure persistence
      const updated = newData.map((item, idx) => ({ ...item, order: idx + 1 }));
      setData(updated);
  };

  // --- FILTER & SORT LOGIC ---
  const filteredData = data.filter(doc => {
    // 1. Search
    const matchesSearch = Object.values(doc).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    // 2. Quick Status Filter
    if (showActiveOnly && statusField) {
        const val = doc[statusField.name];
        if (val !== 'Active' && val !== 'Confirmed' && val !== 'On') return false;
    }

    // 3. Advanced Filters
    if (filters.length === 0) return true;
    return filters.every(rule => {
      const val = String(doc[rule.field] || '').toLowerCase();
      const ruleVal = rule.value.toLowerCase();
      switch (rule.operator) {
        case 'equals': return val === ruleVal;
        case 'contains': return val.includes(ruleVal);
        case 'greaterThan': return val > ruleVal; // Simple comparison
        case 'lessThan': return val < ruleVal;
        default: return true;
      }
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // --- RENDER HELPERS ---

  const renderTree = (parentId: string | null = null, depth = 0) => {
      // Find children for this level, sorted by the current sortConfig (usually order)
      const nodes = sortedData.filter(d => d.parent === parentId || (!parentId && !d.parent));
      
      return nodes.map((node) => {
          let relatedItems: any[] = [];
          if (config.treeConfig) {
             const relatedCollection = MOCK_DATA[config.treeConfig.relationCollection] || [];
             relatedItems = relatedCollection.filter(item => item[config.treeConfig!.relationField] === node.id);
          }

          return (
          <React.Fragment key={node.id}>
              <tr 
                  draggable={config.orderable}
                  onDragStart={(e) => config.orderable && handleDragStart(e, node.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => config.orderable && handleDrop(e, node.id)}
                  className={`hover:bg-primary-50/30 group transition-colors border-b border-zinc-50 last:border-0 ${config.orderable ? 'cursor-move' : ''}`}
              >
                  {config.orderable && (
                        <td className="px-4 text-zinc-300 w-10">
                            <GripVertical size={16} />
                        </td>
                  )}
                  {visibleColumns.map((fieldName, idx) => {
                      const field = config.fields.find(f => f.name === fieldName);
                      if (!field) return null;
                      
                      if (idx === 0) {
                          return (
                              <td key={fieldName} className="px-4 py-3 md:px-6 md:py-3 text-sm whitespace-nowrap">
                                  <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
                                      {depth > 0 && <div className="w-6 border-l border-b border-zinc-300 h-4 mr-2 -mt-4 rounded-bl"></div>}
                                      <Link to={`/collections/${slug}/${node.id}`} className="flex items-center gap-2 font-bold text-zinc-800 hover:text-primary-600">
                                          <Folder size={16} className="text-primary-400 fill-primary-50" />
                                          {node[fieldName]}
                                      </Link>
                                  </div>
                              </td>
                          );
                      }
                      return (
                          <td key={fieldName} className="px-4 py-3 md:px-6 md:py-3 text-sm whitespace-nowrap text-zinc-600">
                              {renderCell(field, node)}
                          </td>
                      );
                  })}
                  <td className="px-4 py-3 md:px-6 md:py-3 text-right">
                       <Link to={`/collections/${slug}/${node.id}`} className="inline-block p-2 text-zinc-400 hover:text-primary-600"><Edit2 size={16} /></Link>
                  </td>
              </tr>
              {relatedItems.length > 0 && relatedItems.map(item => (
                 <tr key={`rel-${item.id}`} className="bg-zinc-50/50 hover:bg-zinc-100 transition-colors border-b border-zinc-50">
                    {/* Add spacer for drag handle col if enabled */}
                    {config.orderable && <td className="w-10"></td>}
                    <td className="px-6 py-2 text-sm whitespace-nowrap" colSpan={visibleColumns.length + 1}>
                        <div className="flex items-center" style={{ paddingLeft: `${(depth + 1) * 24}px` }}>
                            <div className="w-6 border-l border-b border-zinc-300 h-4 mr-2 -mt-4 rounded-bl opacity-50"></div>
                            <Link 
                                to={`/collections/${config.treeConfig?.relationCollection}/${item.id}`} 
                                className="flex items-center gap-2 text-zinc-600 hover:text-primary-600 text-xs font-medium"
                            >
                                <Box size={14} className="text-zinc-400" />
                                {item.title || item.name}
                                <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <span className="ml-4 text-[10px] text-zinc-400 uppercase tracking-wider border border-zinc-200 px-1 rounded">
                                {config.treeConfig?.relationCollection}
                            </span>
                        </div>
                    </td>
                 </tr>
              ))}
              {renderTree(node.id, depth + 1)}
          </React.Fragment>
      )});
  };

  const renderCell = (field: any, doc: any) => {
      const isEditing = editingCell?.id === doc.id && editingCell?.field === field.name;
      const value = doc[field.name];

      // Inline Edit Mode
      if (isEditing) {
          if (field.type === 'status' || field.type === 'select') {
              return (
                  <div className="flex items-center gap-1">
                      <select 
                          autoFocus
                          className="p-1 text-xs border border-primary-500 rounded-none bg-white shadow-sm outline-none font-mono"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(doc.id, field.name)}
                      >
                          {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                  </div>
              )
          }
          return (
             <div className="flex items-center gap-1">
                 <input 
                    autoFocus
                    className="w-full p-1 text-xs border border-primary-500 rounded-none shadow-sm outline-none font-mono"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') saveEdit(doc.id, field.name);
                        if(e.key === 'Escape') cancelEdit();
                    }}
                 />
                 <button onClick={() => saveEdit(doc.id, field.name)} className="text-green-600"><Check size={14}/></button>
                 <button onClick={cancelEdit} className="text-red-600"><X size={14}/></button>
             </div>
          )
      }

      // Display: Toggle Switch for active/draft/on/off
      if (field.type === 'status' && (value === 'Active' || value === 'Draft' || value === 'On' || value === 'Off')) {
          const isActive = value === 'Active' || value === 'On';
          return (
            <div 
                className="flex items-center cursor-pointer group"
                onClick={(e) => handleToggleStatus(e, doc, field.name)}
            >
                <div className={`w-8 h-4 border transition-colors relative flex items-center ${isActive ? 'bg-primary-600 border-primary-600' : 'bg-zinc-200 border-zinc-300'}`}>
                    <div className={`w-2 h-2 bg-white absolute transition-all ${isActive ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="ml-3 text-xs font-mono text-zinc-500 group-hover:text-zinc-800 transition-colors uppercase">{value}</span>
            </div>
          );
      }
      
      // Display: Badge for other statuses
      if (field.type === 'status') {
          const colors: any = {
              'Confirmed': 'bg-green-100 text-green-700', 
              'Pending': 'bg-amber-100 text-amber-700', 
              'Cancelled': 'bg-red-100 text-red-700',
              'Completed': 'bg-blue-100 text-blue-700'
          };
          return (
              <span 
                onClick={(e) => startEditing(doc, field.name, e)}
                className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider cursor-pointer hover:ring-2 hover:ring-primary-200 transition-all ${colors[value] || 'bg-gray-100'}`}
              >
                  {value}
              </span>
          );
      }

      // Display: Relationship
      if (field.type === 'relationship') {
          if (!value) return <span className="text-zinc-300">-</span>;
          const relatedCollection = COLLECTIONS.find(c => c.slug === field.relationTo);
          const relatedDocs = MOCK_DATA[field.relationTo || ''] || [];
          
          if (field.hasMany && Array.isArray(value)) {
              return (
                  <div className="flex flex-wrap gap-1">
                      {value.map(id => {
                          const relDoc = relatedDocs.find(d => d.id === id);
                          const title = relDoc ? (relDoc[relatedCollection?.admin.useAsTitle || 'id'] || relDoc.id) : id;
                          return (
                            <Link key={id} to={`/collections/${field.relationTo}/${id}`} onClick={e => e.stopPropagation()} className="px-1.5 py-0.5 bg-primary-50 text-primary-700 text-[10px] border border-primary-100 hover:bg-primary-100 flex items-center gap-1">
                                {title}
                            </Link>
                          );
                      })}
                  </div>
              );
          } else {
              const relDoc = relatedDocs.find(d => d.id === value);
              const title = relDoc ? (relDoc[relatedCollection?.admin.useAsTitle || 'id'] || relDoc.id) : value;
              return (
                  <Link to={`/collections/${field.relationTo}/${value}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-medium">
                      <LinkIcon size={12} />
                      {title}
                  </Link>
              );
          }
      }

      if (field.name === config.admin.useAsTitle) {
         return (
             <Link to={`/collections/${slug}/${doc.id}`} className="font-bold text-zinc-900 hover:text-primary-600 transition-colors">
                 {String(value)}
             </Link>
         );
      }

      if (field.type === 'text' || field.type === 'number') {
          return (
              <span 
                onClick={(e) => startEditing(doc, field.name, e)}
                className="cursor-pointer hover:bg-zinc-100 px-1 border border-transparent hover:border-zinc-200 block truncate"
              >
                  {String(value)}
              </span>
          )
      }

      if (field.type === 'currency') return `$${value}`;
      if (field.type === 'array') return <span className="text-zinc-400 italic text-xs">{Array.isArray(value) ? `${value.length} items` : 'Empty'}</span>;
      
      return <span className="text-zinc-600">{String(value)}</span>;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">{config.labels.plural}</h1>
           <p className="text-zinc-500 text-xs md:text-sm mt-1 flex items-center gap-2">
             {config.viewType === 'tree' ? <FolderOpen size={14} /> : <SlidersHorizontal size={14} />}
             <span className="hidden md:inline">{config.viewType === 'tree' ? 'Hierarchical View' : 'List View'}</span>
             <span className="md:hidden">{config.viewType === 'tree' ? 'Tree' : 'List'}</span>
           </p>
        </div>
        <Link 
          to={`/collections/${slug}/create`}
          className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 md:px-6 md:py-3 hover:bg-primary-700 transition-colors font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary-600/20 rounded-none shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span className="hidden md:inline">Create New</span>
          <span className="md:hidden">Create</span>
        </Link>
      </div>

      {/* Toolbar - Compact Layout for Mobile */}
      <div className="bg-white border border-zinc-200 p-1 flex flex-col md:flex-row gap-2 shadow-sm rounded-none">
        <div className="relative flex-1 w-full">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
           <input 
             type="text" 
             placeholder={`Search ${config.labels.plural.toLowerCase()}...`}
             className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-white focus:bg-zinc-50 outline-none text-sm transition-colors placeholder:text-zinc-400 rounded-none"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        
        {/* Action Group: Side-by-side on mobile, Row on desktop */}
        <div className="flex flex-row gap-2 w-full md:w-auto">
            {/* Active Toggle */}
            {statusField && (
                <button 
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    className={`
                        flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 text-xs font-bold uppercase tracking-wider flex-1 md:flex-none justify-center transition-colors border border-zinc-100 md:border-l md:border-y-0 md:border-r-0
                        ${showActiveOnly ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-white hover:bg-zinc-50 text-zinc-500'}
                    `}
                >
                    {showActiveOnly ? <Eye size={16}/> : <EyeOff size={16} />}
                    {showActiveOnly ? <span className="hidden sm:inline">Active Only</span> : <span className="hidden sm:inline">Show All</span>}
                    <span className="sm:hidden">{showActiveOnly ? 'Active' : 'All'}</span>
                </button>
            )}

            <button 
                onClick={() => setIsSheetOpen(true)}
                className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 hover:bg-zinc-50 text-zinc-600 text-xs font-bold uppercase tracking-wider flex-1 md:flex-none justify-center transition-colors rounded-none border border-zinc-100 md:border-l md:border-y-0 md:border-r-0"
            >
                <SlidersHorizontal size={16} />
                Options
            </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white border border-zinc-200 shadow-sm relative rounded-none overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                    {config.orderable && <th className="w-10 px-4"></th>}
                    {visibleColumns.map((fieldName) => {
                        const field = config.fields.find(f => f.name === fieldName);
                        if (!field) return null;
                        return (
                            <th 
                                key={field.name} 
                                className="px-4 py-3 md:px-6 md:py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em] cursor-pointer hover:bg-zinc-100 hover:text-primary-600 transition-colors group select-none"
                                onClick={() => handleHeaderClick(field.name)}
                            >
                                <div className="flex items-center gap-2">
                                    {field.label}
                                    {sortConfig?.key === field.name && (
                                        sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-primary-600" /> : <ArrowDown size={12} className="text-primary-600" />
                                    )}
                                    {sortConfig?.key !== field.name && (
                                        <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                                    )}
                                </div>
                            </th>
                        );
                    })}
                    <th className="px-4 py-3 md:px-6 md:py-4 w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
                {config.viewType === 'tree' ? (
                    renderTree()
                ) : (
                    sortedData.map((doc, index) => (
                        <tr 
                            key={doc.id} 
                            draggable={config.orderable}
                            onDragStart={(e) => config.orderable && handleDragStart(e, doc.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => config.orderable && handleDrop(e, doc.id)}
                            className={`hover:bg-primary-50/30 group transition-colors ${config.orderable ? 'cursor-move' : ''}`}
                        >
                             {config.orderable && (
                                 <td className="px-4 text-zinc-300 w-10">
                                     <GripVertical size={16} />
                                 </td>
                             )}
                            {visibleColumns.map((fieldName) => {
                                 const field = config.fields.find(f => f.name === fieldName);
                                 if (!field) return null;
                                return (
                                    <td key={fieldName} className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                                        {renderCell(field, doc)}
                                    </td>
                                );
                            })}
                            <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                                <Link to={`/collections/${slug}/${doc.id}`} className="inline-block p-2 text-zinc-400 hover:text-primary-600 hover:bg-white border border-transparent hover:border-zinc-200 rounded-none">
                                    <Edit2 size={16} />
                                </Link>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
      
      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="View Options">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 mb-4">
              <button 
                  onClick={() => setActiveTab('columns')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'columns' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                  Columns
              </button>
              <button 
                  onClick={() => setActiveTab('filters')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'filters' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                  Filters
              </button>
              <button 
                  onClick={() => setActiveTab('views')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'views' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                  Saved Views
              </button>
          </div>

          <div className="space-y-4">
              {activeTab === 'columns' && (
                  <div className="space-y-2">
                      <p className="text-xs text-zinc-400 mb-4">Select columns to display in the list.</p>
                      {config.fields.map(field => (
                          <label key={field.name} className="flex items-center gap-3 p-2 hover:bg-zinc-50 cursor-pointer border border-transparent hover:border-zinc-100 transition-colors">
                              <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${visibleColumns.includes(field.name) ? 'bg-primary-600 border-primary-600 text-white' : 'border-zinc-300 bg-white'}`}>
                                   {visibleColumns.includes(field.name) && <Check size={10} strokeWidth={4} />}
                              </div>
                              <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={visibleColumns.includes(field.name)} 
                                  onChange={() => toggleColumn(field.name)}
                              />
                              <span className="text-sm font-medium text-zinc-700">{field.label}</span>
                          </label>
                      ))}
                  </div>
              )}

              {activeTab === 'filters' && (
                  <div className="space-y-4">
                       <p className="text-xs text-zinc-400">Narrow down your results with custom rules.</p>
                       {filters.map((filter, idx) => (
                           <div key={filter.id} className="p-3 bg-zinc-50 border border-zinc-200 space-y-2 animate-in fade-in slide-in-from-right-4">
                               <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold uppercase text-zinc-400">Filter #{idx + 1}</span>
                                   <button onClick={() => removeFilter(filter.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={14}/></button>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                   <select 
                                      className="w-full p-2 bg-white border border-zinc-300 text-xs rounded-none outline-none focus:border-primary-500"
                                      value={filter.field}
                                      onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                                   >
                                       {config.fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                                   </select>
                                   <select 
                                      className="w-full p-2 bg-white border border-zinc-300 text-xs rounded-none outline-none focus:border-primary-500"
                                      value={filter.operator}
                                      onChange={(e) => updateFilter(filter.id, 'operator', e.target.value as any)}
                                   >
                                       <option value="contains">Contains</option>
                                       <option value="equals">Equals</option>
                                       <option value="greaterThan">Greater Than</option>
                                       <option value="lessThan">Less Than</option>
                                   </select>
                               </div>
                               <input 
                                  type="text" 
                                  className="w-full p-2 bg-white border border-zinc-300 text-xs rounded-none outline-none focus:border-primary-500"
                                  placeholder="Value..."
                                  value={filter.value}
                                  onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                               />
                           </div>
                       ))}
                       {filters.length === 0 && (
                           <div className="text-center p-8 border border-dashed border-zinc-200 text-zinc-400 text-sm">
                               No active filters.
                           </div>
                       )}
                       <button onClick={addFilter} className="w-full py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-primary-600 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                           <Plus size={14} /> Add Filter
                       </button>
                  </div>
              )}

              {activeTab === 'views' && (
                  <div className="space-y-6">
                       <div className="bg-primary-50 p-4 border border-primary-100">
                           <label className="block text-[10px] font-bold uppercase text-primary-700 mb-2">Save Current Configuration</label>
                           <div className="flex gap-0 shadow-sm">
                               <input 
                                  type="text" 
                                  className="flex-1 p-2 border border-primary-200 text-sm focus:outline-none focus:border-primary-500 rounded-none bg-white"
                                  placeholder="View Name..."
                                  value={viewName}
                                  onChange={(e) => setViewName(e.target.value)}
                               />
                               <button 
                                  onClick={saveCurrentView}
                                  disabled={!viewName}
                                  className="bg-primary-600 text-white px-3 py-2 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                               >
                                   <Save size={16} />
                               </button>
                           </div>
                           <p className="text-[10px] text-primary-400 mt-2">Saves current columns, filters, and sort order.</p>
                       </div>
                       
                       <div className="space-y-2">
                           <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Saved Views</p>
                           {savedViews.filter(v => v.slug === slug).map(view => (
                               <div key={view.id} className="flex items-center justify-between p-3 border border-zinc-200 hover:border-primary-300 hover:shadow-md bg-white group cursor-pointer transition-all" onClick={() => loadView(view)}>
                                   <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-primary-100 group-hover:text-primary-600 group-hover:border-primary-200">
                                           <Box size={14} />
                                       </div>
                                       <div>
                                           <p className="text-sm font-bold text-zinc-700 group-hover:text-primary-700">{view.name}</p>
                                           <p className="text-[10px] text-zinc-400 flex gap-2">
                                               <span>{view.filters.length} filters</span>
                                               <span>•</span>
                                               <span>{view.visibleColumns.length} cols</span>
                                           </p>
                                       </div>
                                   </div>
                                   <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-primary-400 -translate-x-2 group-hover:translate-x-0 transition-all" />
                               </div>
                           ))}
                           {savedViews.filter(v => v.slug === slug).length === 0 && (
                               <div className="text-center p-4 text-zinc-400 text-xs italic">No saved views yet.</div>
                           )}
                       </div>
                  </div>
              )}
          </div>
      </Sheet>
    </div>
  );
};

export default CollectionList;
