import * as React from 'react';
import { useParams, Link } from '@tanstack/react-router';

export function QuestpieAdmin() {
  // We expect this component to be mounted at a route with a splat param named "$"
  // e.g. /admin/$
  const params = useParams({ strict: false });
  // @ts-ignore - The splat param might not be typed if strict is false or generic
  const currentPath = params['$'] || '';

  // Simple internal routing logic
  let content;
  if (currentPath.startsWith('collections')) {
      content = <CollectionsView />;
  } else if (currentPath.startsWith('settings')) {
      content = <SettingsView />;
  } else {
      content = <DashboardView />;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
        <div className="font-semibold text-lg">Questpie CMS</div>
        <nav className="ml-auto flex items-center gap-4 text-sm font-medium">
             <Link to="/admin" className={`text-muted-foreground hover:text-foreground cursor-pointer ${currentPath === '' ? 'text-foreground' : ''}`}>Dashboard</Link>
             <Link to="/admin/collections" className={`text-muted-foreground hover:text-foreground cursor-pointer ${currentPath.startsWith('collections') ? 'text-foreground' : ''}`}>Collections</Link>
             <Link to="/admin/settings" className={`text-muted-foreground hover:text-foreground cursor-pointer ${currentPath.startsWith('settings') ? 'text-foreground' : ''}`}>Settings</Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {content}
      </main>
    </div>
  );
}

function DashboardView() {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                <Card title="Collections" value="Active" />
                <Card title="Media" value="0 files" />
                <Card title="Users" value="Admin" />
            </div>
            <div className="flex-1 rounded-lg border border-dashed shadow-sm flex items-center justify-center">
                <p className="text-muted-foreground">Welcome to your Questpie Dashboard.</p>
            </div>
        </>
    )
}

function CollectionsView() {
    return (
        <div className="flex-1 rounded-lg border border-dashed shadow-sm flex items-center justify-center bg-muted/10">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Collections</h2>
                <p className="text-muted-foreground">Manage your content types here.</p>
            </div>
        </div>
    )
}

function SettingsView() {
    return (
        <div className="flex-1 rounded-lg border border-dashed shadow-sm flex items-center justify-center bg-muted/10">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Configure your CMS instance.</p>
            </div>
        </div>
    )
}

function Card({ title, value }: { title: string, value: string }) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">{title}</h3>
            </div>
            <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{value}</div>
            </div>
        </div>
    )
}
