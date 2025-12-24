import { CollectionConfig, Doc } from './types';

export const COLLECTIONS: CollectionConfig[] = [
  // --- GLOBALS ---
  {
    slug: 'settings',
    type: 'global',
    group: 'System',
    icon: 'Settings',
    admin: { useAsTitle: 'siteName' },
    labels: { singular: 'Site Settings', plural: 'Site Settings' },
    fields: [
      { name: 'siteName', label: 'Website Name', type: 'text', admin: { width: 'half' } },
      { name: 'supportEmail', label: 'Support Email', type: 'email', admin: { width: 'half' } },
      { name: 'maintenanceMode', label: 'Maintenance Mode', type: 'status', options: ['On', 'Off'], admin: { position: 'sidebar' } },
      { name: 'announcement', label: 'Global Announcement', type: 'textarea' },
    ]
  },

  // --- COLLECTIONS ---
  {
    slug: 'appointments',
    type: 'collection',
    group: 'Shop Floor',
    icon: 'Calendar',
    admin: { useAsTitle: 'clientName', defaultColumns: ['clientName', 'status', 'date', 'time', 'barber'] },
    labels: { singular: 'Appointment', plural: 'Appointments' },
    fields: [
      { name: 'clientName', label: 'Client Name', type: 'text', admin: { width: 'half' } },
      { name: 'status', label: 'Status', type: 'status', options: ['Confirmed', 'Pending', 'Cancelled', 'Completed'], admin: { width: 'half' } },
      { name: 'date', label: 'Date', type: 'date', admin: { width: 'half' } },
      { name: 'time', label: 'Time Slot', type: 'time', admin: { width: 'half' } },
      { name: 'service', label: 'Service', type: 'relationship', relationTo: 'services', admin: { width: 'half' } },
      { name: 'barber', label: 'Barber', type: 'select', options: ['Marcus Blade', 'Donny Scissors', 'Sarah Fade'] },
      { name: 'notes', label: 'Client Notes', type: 'textarea' },
    ]
  },
  {
    slug: 'service-categories',
    type: 'collection',
    viewType: 'tree', // TREE VIEW
    orderable: true, // ENABLE SORTING
    // CONFIG FOR SHOWING SERVICES INSIDE CATEGORIES
    treeConfig: {
        relationCollection: 'services',
        relationField: 'category'
    },
    group: 'Management',
    icon: 'Layers',
    admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'isActive'] },
    labels: { singular: 'Category', plural: 'Service Categories' },
    fields: [
      { name: 'name', label: 'Category Name', type: 'text', admin: { width: 'half' } },
      { name: 'slug', label: 'Slug', type: 'text', admin: { width: 'half' } },
      // PARENT FIELD FOR TREE HIERARCHY
      { 
        name: 'parent', 
        label: 'Parent Category', 
        type: 'relationship', 
        relationTo: 'service-categories', 
        admin: { position: 'sidebar', description: 'Select parent for hierarchy' } 
      },
      { name: 'isActive', label: 'Active', type: 'status', options: ['Active', 'Draft'], admin: { position: 'sidebar' } },
      { name: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  {
    slug: 'services',
    type: 'collection',
    group: 'Management',
    icon: 'Scissors',
    orderable: true, // DRAG AND DROP
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'price', 'duration', 'isActive'] },
    labels: { singular: 'Service', plural: 'Services' },
    fields: [
      { name: 'title', label: 'Service Name', type: 'text', admin: { placeholder: 'e.g. Hot Towel Shave' } },
      { name: 'slug', label: 'URL Slug', type: 'text', admin: { position: 'sidebar' } },
      // RELATIONSHIP FIELD
      { name: 'category', label: 'Category', type: 'relationship', relationTo: 'service-categories', admin: { width: 'half' } },
      { name: 'isActive', label: 'Active', type: 'status', options: ['Active', 'Draft'], admin: { position: 'sidebar' } },
      { name: 'price', label: 'Price', type: 'currency', admin: { width: 'half' } },
      { name: 'duration', label: 'Duration (min)', type: 'number', admin: { width: 'half' } },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'image', label: 'Promotional Image', type: 'image' },
      { 
        name: 'features', 
        label: 'Service Features', 
        type: 'array', 
        fields: [
           { name: 'featureName', label: 'Feature', type: 'text' },
           { name: 'included', label: 'Included', type: 'select', options: ['Yes', 'No'] }
        ]
      }
    ]
  },
  {
    slug: 'customers',
    type: 'collection',
    group: 'Shop Floor',
    icon: 'Users',
    admin: { useAsTitle: 'fullName', defaultColumns: ['fullName', 'phone', 'email', 'favorites'] },
    labels: { singular: 'Customer', plural: 'Customers' },
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', admin: { width: 'half' } },
      { name: 'phone', label: 'Phone', type: 'text', admin: { width: 'half' } },
      { name: 'email', label: 'Email', type: 'email' },
      // MULTI RELATIONSHIP
      { name: 'favorites', label: 'Favorite Services', type: 'relationship', relationTo: 'services', hasMany: true },
      { name: 'lastVisit', label: 'Last Visit', type: 'date' },
    ]
  },
  {
    slug: 'products',
    type: 'collection',
    group: 'Inventory',
    icon: 'ShoppingBag',
    admin: { useAsTitle: 'productName', defaultColumns: ['productName', 'stock', 'price', 'sku'] },
    labels: { singular: 'Product', plural: 'Products' },
    fields: [
      { name: 'productName', label: 'Product Name', type: 'text' },
      { name: 'stock', label: 'Stock Level', type: 'number', admin: { width: 'half' } },
      { name: 'price', label: 'Retail Price', type: 'currency', admin: { width: 'half' } },
      { name: 'sku', label: 'SKU', type: 'text' },
    ]
  }
];

export const MOCK_DATA: Record<string, Doc[]> = {
  settings: [
    { id: 'global', siteName: 'PayloadZero Barbers', supportEmail: 'help@barber.io', maintenanceMode: 'Off', announcement: 'Holiday hours in effect next week.', createdAt: '2023-01-01', updatedAt: '2023-10-20' }
  ],
  appointments: [
    { id: '1', clientName: 'James Bond', status: 'Confirmed', date: '2023-10-25', time: '14:00', service: '1', barber: 'Marcus Blade', notes: 'Martini served dry.', createdAt: '2023-10-20', updatedAt: '2023-10-20' },
    { id: '2', clientName: 'Thomas Shelby', status: 'Completed', date: '2023-10-24', time: '10:00', service: '2', barber: 'Sarah Fade', notes: 'Short on sides.', createdAt: '2023-10-18', updatedAt: '2023-10-24' },
    { id: '3', clientName: 'Tony Stark', status: 'Pending', date: '2023-10-26', time: '16:30', service: '3', barber: 'Donny Scissors', notes: '', createdAt: '2023-10-21', updatedAt: '2023-10-21' },
  ],
  'service-categories': [
    { id: '1', name: 'Hair Services', slug: 'hair', parent: null, isActive: 'Active', order: 1, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: '2', name: 'Beard & Shave', slug: 'beard', parent: null, isActive: 'Active', order: 2, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: '3', name: 'Scissor Cuts', slug: 'scissor', parent: '1', isActive: 'Active', order: 3, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: '4', name: 'Clipper Cuts', slug: 'clipper', parent: '1', isActive: 'Active', order: 4, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: '5', name: 'Hot Towel', slug: 'hot-towel', parent: '2', isActive: 'Draft', order: 5, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  ],
  services: [
    { 
      id: '1', 
      title: 'The Royal Treatment', 
      slug: 'royal-treatment',
      category: '2', // ID of Beard & Shave
      isActive: 'Active',
      price: 85, 
      duration: 60, 
      description: 'Full service package.', 
      order: 1,
      features: [
          { featureName: 'Haircut', included: 'Yes' },
          { featureName: 'Shave', included: 'Yes' },
          { featureName: 'Massage', included: 'Yes' }
      ],
      createdAt: '2023-08-01', updatedAt: '2023-08-01' 
    },
    { id: '2', title: 'Classic Cut', slug: 'classic-cut', category: '3', isActive: 'Active', price: 45, duration: 45, description: 'Traditional cut.', order: 2, features: [], createdAt: '2023-08-01', updatedAt: '2023-08-01' },
    { id: '3', title: 'Beard Trim', slug: 'beard-trim', category: '2', isActive: 'Draft', price: 30, duration: 30, description: 'Shape up.', order: 3, features: [], createdAt: '2023-08-01', updatedAt: '2023-08-01' },
  ],
  customers: [
    { id: '1', fullName: 'James Bond', phone: '007', email: 'secret@mi6.gov.uk', favorites: ['1', '2'], lastVisit: '2023-09-01', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: '2', fullName: 'Thomas Shelby', phone: '123-456', email: 'peaky@blinders.co', favorites: [], lastVisit: '2023-10-24', createdAt: '2023-02-15', updatedAt: '2023-06-20' },
  ],
  products: [
     { id: '1', productName: 'Matte Clay Pomade', stock: 42, price: 25, sku: 'POM-001', createdAt: '2023-09-10', updatedAt: '2023-09-10' },
     { id: '2', productName: 'Beard Oil - Sandalwood', stock: 15, price: 30, sku: 'OIL-002', createdAt: '2023-09-12', updatedAt: '2023-09-12' }
  ]
};
