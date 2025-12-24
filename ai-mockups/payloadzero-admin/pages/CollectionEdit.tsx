import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Wand2, Loader2, UploadCloud, Plus, X, GripVertical, Clock, Hash, Calendar, CheckCircle2, Circle, Link as LinkIcon, Check } from 'lucide-react';
import { COLLECTIONS, MOCK_DATA } from '../constants';
import { generateTextEnhancement } from '../services/ai';
import { Doc } from '../types';

const CollectionEdit: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id?: string }>();
  const navigate = useNavigate();
  const config = COLLECTIONS.find(c => c.slug === slug);
  const isGlobal = config?.type === 'global';
  
  const effectiveId = isGlobal ? 'global' : id;

  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Identify status field if exists (for header toggle)
  const statusField = config?.fields.find(f => f.name === 'isActive' || f.name === 'status');

  useEffect(() => {
    if (slug && effectiveId && effectiveId !== 'create') {
      const data = MOCK_DATA[slug]?.find(d => d.id === effectiveId);
      if (data) setFormData(data);
    } else {
        // Default values
        const defaults: any = {};
        if (config) {
            config.fields.forEach(f => {
                if (f.type === 'status' && f.options) defaults[f.name] = f.options[0];
            });
        }
        setFormData(defaults);
    }
  }, [slug, effectiveId, config]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!isGlobal && effectiveId === 'create') navigate(`/collections/${slug}`);
      if (!isGlobal && effectiveId !== 'create') navigate(`/collections/${slug}`);
    }, 600);
  };

  const handleAIMagic = async (fieldName: string) => {
    const currentVal = formData[fieldName] || "";
    setAiLoading(fieldName);
    const result = await generateTextEnhancement(currentVal, "Improve this text specifically for a premium service business description.");
    setFormData((prev: any) => ({ ...prev, [fieldName]: result }));
    setAiLoading(null);
  };

  const toggleStatus = () => {
      if (!statusField) return;
      const current = formData[statusField.name];
      let next = current;
      
      if (statusField.name === 'isActive') {
          next = current === 'Active' ? 'Draft' : 'Active';
      } else if (statusField.options) {
          // Cycle through options for other status fields
          const idx = statusField.options.indexOf(current);
          const nextIdx = (idx + 1) % statusField.options.length;
          next = statusField.options[nextIdx];
      }
      
      handleChange(statusField.name, next);
  };

  if (!config) return <div>Config not found</div>;

  const mainFields = config.fields.filter(f => f.admin?.position !== 'sidebar');
  const sidebarFields = config.fields.filter(f => f.admin?.position === 'sidebar');

  // --- RENDER FIELD ---
  const renderInput = (field: any, value: any, onChange: (val: any) => void) => {
      const baseInputStyles = "w-full p-2 md:p-3 border border-zinc-300 rounded-none bg-white focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none text-sm transition-all placeholder:text-zinc-300 font-mono";
      
      switch(field.type) {
        case 'textarea':
             return (
                <div className="relative group">
                    <textarea 
                        rows={5}
                        className={baseInputStyles}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <button 
                       onClick={() => handleAIMagic(field.name)}
                       className="absolute right-2 bottom-2 p-1.5 bg-zinc-50 border border-zinc-200 text-zinc-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
                       title="Enhance with AI"
                    >
                      {aiLoading === field.name ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                    </button>
                </div>
             );
        case 'select':
        case 'status':
             return (
                <div className="relative">
                    <select 
                        className={`${baseInputStyles} appearance-none`}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <GripVertical size={12} className="rotate-90" />
                    </div>
                </div>
             );
        case 'relationship':
            const relatedCollection = COLLECTIONS.find(c => c.slug === field.relationTo);
            // Fetch potential options
            let options = MOCK_DATA[field.relationTo || ''] || [];
            // If self-referential (Parent selection), exclude self
            if (field.relationTo === slug && effectiveId) {
                options = options.filter(o => o.id !== effectiveId);
            }

            if (field.hasMany) {
                const selectedIds: string[] = Array.isArray(value) ? value : [];
                return (
                    <div className="border border-zinc-300 bg-white p-2 space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedIds.map(id => {
                                const doc = options.find(o => o.id === id);
                                const label = doc ? (doc[relatedCollection?.admin.useAsTitle || 'id'] || doc.id) : id;
                                return (
                                    <span key={id} className="flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 text-[10px] uppercase font-bold tracking-wider border border-primary-200">
                                        {label}
                                        <button 
                                            onClick={() => onChange(selectedIds.filter(sid => sid !== id))}
                                            className="hover:text-primary-900"
                                        ><X size={12}/></button>
                                    </span>
                                )
                            })}
                        </div>
                        <select 
                             className={`${baseInputStyles} appearance-none border-t border-zinc-100 mt-2`}
                             value=""
                             onChange={(e) => {
                                 if(e.target.value && !selectedIds.includes(e.target.value)) {
                                     onChange([...selectedIds, e.target.value]);
                                 }
                             }}
                        >
                            <option value="">+ Add {field.label}</option>
                            {options.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt[relatedCollection?.admin.useAsTitle || 'id'] || opt.id}
                                </option>
                            ))}
                        </select>
                    </div>
                );
            } else {
                return (
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                            <LinkIcon size={14} />
                        </div>
                        <select 
                            className={`${baseInputStyles} pl-10 appearance-none`}
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                        >
                            <option value="">Select {field.label}...</option>
                            {options.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt[relatedCollection?.admin.useAsTitle || 'id'] || opt.id}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                            <GripVertical size={12} className="rotate-90" />
                        </div>
                    </div>
                );
            }
        case 'array':
             const items = Array.isArray(value) ? value : [];
             return (
                 <div className="space-y-4">
                     {items.map((item: any, idx: number) => (
                         <div key={idx} className="bg-zinc-50 border border-zinc-200 p-3 md:p-4 flex gap-4 items-start group hover:border-zinc-300 transition-colors">
                             <div className="mt-3 text-zinc-300 cursor-move"><GripVertical size={16}/></div>
                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {field.fields?.map((subField: any) => (
                                     <div key={subField.name}>
                                         <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block tracking-wider">{subField.label}</label>
                                         {renderInput(subField, item[subField.name], (val) => {
                                             const newItems = [...items];
                                             newItems[idx] = { ...newItems[idx], [subField.name]: val };
                                             onChange(newItems);
                                         })}
                                     </div>
                                 ))}
                             </div>
                             <button 
                                onClick={() => {
                                    const newItems = items.filter((_, i) => i !== idx);
                                    onChange(newItems);
                                }}
                                className="text-zinc-300 hover:text-red-500 p-1 mt-2"
                             >
                                 <X size={16} />
                             </button>
                         </div>
                     ))}
                     <button 
                        onClick={() => onChange([...items, {}])}
                        className="w-full py-3 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-primary-600 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                     >
                         <Plus size={14} /> Add {field.label} Item
                     </button>
                 </div>
             );
        default:
             return (
                <input 
                    type={field.type === 'currency' ? 'number' : field.type}
                    className={baseInputStyles}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                />
             );
      }
  }

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-2">
      
      {/* Header Section */}
      <div className="border-b border-zinc-200 bg-white -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-6 pb-4 md:pb-6 mb-6 md:mb-8 shadow-sm">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-3 md:gap-4">
                {/* Top Row: Back & Title */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                        {!isGlobal && (
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 md:gap-3">
                                <h1 className="text-xl md:text-3xl font-black text-zinc-900 tracking-tight font-mono truncate">
                                    {effectiveId === 'create' ? `New ${config.labels.singular}` : (formData[config.admin.useAsTitle] || config.labels.singular)}
                                </h1>
                                {statusField && formData[statusField.name] && (
                                    <button 
                                        onClick={toggleStatus}
                                        className={`
                                            flex items-center gap-1.5 px-2 py-1 md:px-3 text-[10px] font-bold uppercase tracking-widest border transition-all shrink-0
                                            ${formData[statusField.name] === 'Active' || formData[statusField.name] === 'Confirmed' || formData[statusField.name] === 'On'
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'}
                                        `}
                                    >
                                        {formData[statusField.name] === 'Active' ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                                        <span className="hidden sm:inline">{formData[statusField.name]}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 md:px-8 md:py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary-900/10 transition-all disabled:opacity-50 shrink-0"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span className="hidden md:inline">Save Changes</span>
                        <span className="md:hidden">Save</span>
                    </button>
                </div>

                {/* Bottom Row: Meta Data (Moved from sidebar) */}
                {!isGlobal && effectiveId !== 'create' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-zinc-400 uppercase tracking-wide pt-1 pl-1 md:pl-12">
                        <div className="flex items-center gap-2" title="Document ID">
                            <Hash size={12} />
                            <span className="text-zinc-600 select-all">{formData.id}</span>
                        </div>
                        <div className="flex items-center gap-2" title="Date Created">
                            <Calendar size={12} />
                            <span>Created: <span className="text-zinc-600">{formData.createdAt}</span></span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2" title="Last Updated">
                            <Clock size={12} />
                            <span>Updated: <span className="text-zinc-600">{formData.updatedAt}</span></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
             <div className="bg-white p-4 md:p-8 border border-zinc-200 shadow-sm space-y-6 md:space-y-8">
                {mainFields.map((field) => (
                    <div key={field.name} className={`${field.admin?.width === 'half' ? 'w-full md:w-[48%] inline-block mr-[2%]' : 'w-full'} align-top`}>
                        <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2">
                            {field.label}
                        </label>
                        {renderInput(field, formData[field.name], (val) => handleChange(field.name, val))}
                        {field.admin?.description && (
                            <p className="mt-1.5 text-[10px] text-zinc-400">{field.admin.description}</p>
                        )}
                    </div>
                ))}
             </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-6">
              {sidebarFields.length > 0 && (
                  <div className="bg-zinc-50 p-4 md:p-6 border border-zinc-200 space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-3">Settings</h3>
                      {sidebarFields.map((field) => (
                        <div key={field.name}>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">
                                {field.label}
                            </label>
                            {renderInput(field, formData[field.name], (val) => handleChange(field.name, val))}
                        </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default CollectionEdit;