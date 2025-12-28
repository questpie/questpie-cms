import React from 'react';
import { ModuleDefinition } from '@questpie/core/server/module/types';

// TODO: replace with actual UI components from shadcn/ui or custom ones
const DefaultTextInput = (props: any) => <input type="text" {...props} className="border p-2 rounded w-full" />;
const DefaultNumberInput = (props: any) => <input type="number" {...props} className="border p-2 rounded w-full" />;
const DefaultBooleanInput = (props: any) => <input type="checkbox" {...props} />;
const DefaultSelectInput = (props: any) => <select {...props} className="border p-2 rounded w-full" />;

// Define a type for field configurations in the Admin UI
export type AdminFieldConfig = {
  label?: string;
  description?: string;
  component?: React.ReactNode; // Or a reference to a component function
  // Add more UI-specific properties here (e.g., validation rules for UI, display format)
};

// Define a type for resource configurations in the Admin UI
export type AdminResourceConfig = {
  list?: {
    columns?: string[]; // Fields to display in the list view
    overrideListView?: React.ReactNode; // A custom component to render the entire list view
  };
  edit?: {
    layout?: any; // Layout configuration (e.g., main column, sidebar)
  };
  fields?: { [fieldName: string]: AdminFieldConfig };
  // Add more resource-level UI properties here
};

// Define the overall Admin Module Configuration
export type AdminModuleConfig = {
  module: ModuleDefinition<any>; // Link to the backend module
  resources: { [collectionSlug: string]: AdminResourceConfig };
};

// Helper function to define an Admin config
export function defineAdminConfig(config: AdminModuleConfig) {
  return config;
}

// Example: Custom Currency Input for Admin
export const CurrencyInput = (props: { value: number; onChange: (val: number) => void; currency: string }) => (
  <div className="flex items-center border p-2 rounded w-full bg-white">
    <span className="text-gray-500 mr-2">{props.currency}</span>
    <DefaultNumberInput 
      value={props.value}
      onChange={(e: any) => props.onChange(parseFloat(e.target.value))}
      className="flex-1 border-none p-0 focus:ring-0 outline-none"
    />
  </div>
);

// Example: Custom Calendar View for Admin (for Appointments)
export const CalendarView = (props: { groupBy: string; timeStart: string; timeEnd: string }) => (
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-800">
    <h3 className="font-bold">Custom Calendar View</h3>
    <p>Grouping by: {props.groupBy}</p>
    <p>Hours: {props.timeStart} - {props.timeEnd}</p>
    <p className="text-sm text-blue-600 mt-2">This is a placeholder for a rich calendar component.</p>
  </div>
);
