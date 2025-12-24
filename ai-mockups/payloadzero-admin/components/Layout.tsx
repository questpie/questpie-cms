import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Menu, 
  ChevronRight,
  User,
  LogOut,
  Calendar,
  Scissors,
  Users,
  ShoppingBag,
  UserCheck,
  Box,
  Layers,
  Search,
  Command
} from 'lucide-react';
import { COLLECTIONS } from '../constants';
import GlobalSearch from './GlobalSearch';

// Icon mapper
const IconMap: Record<string, any> = {
  Calendar, Scissors, Users, ShoppingBag, UserCheck, Box, Layers, Settings
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Group collections
  const groupedCollections = COLLECTIONS.reduce((acc, col) => {
    if (!acc[col.group]) acc[col.group] = [];
    acc[col.group].push(col);
    return acc;
  }, {} as Record<string, typeof COLLECTIONS>);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50">
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    
      {/* Sidebar */}
      <aside 
        className={`
          flex flex-col bg-zinc-900 text-zinc-400 border-r border-zinc-800 transition-all duration-300 ease-in-out z-30
          ${sidebarOpen ? 'w-72 absolute md:relative h-full shadow-2xl md:shadow-none' : 'w-0 md:w-20 overflow-hidden'}
        `}
      >
        {/* Logo Area */}
        <div className="h-14 md:h-16 min-h-[56px] md:min-h-[64px] flex items-center px-6 bg-zinc-950 border-b border-zinc-800">
           <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
             <div className="min-w-[32px] h-8 bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-900/50">
                P
             </div>
             <span className={`font-bold tracking-tight text-white uppercase text-lg transition-opacity duration-200 ${!sidebarOpen && 'opacity-0 hidden'}`}>
                PayloadZero
             </span>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 no-scrollbar">
          <ul className="space-y-1">
            <li className="px-2">
              <NavLink 
                to="/" 
                onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 hover:text-white transition-colors group rounded-md
                  ${isActive ? 'bg-zinc-800 text-primary-400 shadow-inner' : ''}
                `}
              >
                {({ isActive }) => (
                  <>
                    <LayoutDashboard size={20} className={isActive ? "text-primary-400" : "text-zinc-500 group-hover:text-zinc-300"} />
                    <span className={`${!sidebarOpen && 'hidden md:hidden'} md:group-hover:block transition-all font-medium`}>Dashboard</span>
                  </>
                )}
              </NavLink>
            </li>

            {Object.entries(groupedCollections).map(([group, cols]) => (
              <li key={group} className="mt-8 px-2">
                <div className={`px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ${!sidebarOpen && 'hidden'}`}>
                  {group}
                </div>
                <ul>
                  {cols.map(col => {
                    const Icon = col.icon ? IconMap[col.icon] : Box;
                    const linkPath = col.type === 'global' ? `/globals/${col.slug}` : `/collections/${col.slug}`;
                    return (
                      <li key={col.slug} className="mb-1">
                        <NavLink 
                          to={linkPath} 
                          onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 hover:text-white transition-colors group rounded-md
                            ${isActive || (col.type !== 'global' && location.pathname.includes(col.slug)) ? 'bg-zinc-800 text-primary-400' : ''}
                          `}
                        >
                          <Icon size={18} />
                          <span className={`${!sidebarOpen && 'hidden'}`}>{col.labels.plural}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
           <button className="flex items-center gap-3 w-full hover:bg-zinc-900 p-2 transition-colors rounded-md">
              <div className="w-9 h-9 bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 rounded-full">
                <User size={16} />
              </div>
              <div className={`text-sm overflow-hidden whitespace-nowrap text-left ${!sidebarOpen && 'hidden'}`}>
                <p className="font-bold text-zinc-200">Admin User</p>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Log Out</p>
              </div>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 relative">
        {/* Topbar */}
        <header className="h-14 md:h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-20 sticky top-0 md:relative">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 hover:bg-zinc-100 text-zinc-600 active:scale-95 transition-transform rounded"
            >
              <Menu size={22} />
            </button>
            
            {/* Mobile Search Button */}
            <button 
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded"
            >
                <Search size={20} />
            </button>
            
            {/* Desktop Search */}
            <button 
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 px-3 py-1.5 rounded-md border border-zinc-200 transition-colors"
            >
                <Search size={14} />
                <span className="text-sm">Search...</span>
                <span className="text-xs bg-white border border-zinc-300 px-1 rounded flex items-center gap-0.5"><Command size={10}/> K</span>
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden lg:flex items-center text-sm text-zinc-500 ml-4">
              <span className="hover:text-primary-600 cursor-pointer font-medium" onClick={() => navigate('/')}>Home</span>
              {pathSegments.map((seg, i) => (
                <React.Fragment key={i}>
                  <ChevronRight size={14} className="mx-2 text-zinc-300" />
                  <span className="capitalize font-bold text-zinc-800 tracking-tight">{seg}</span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
             <button className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded">
                <LogOut size={18} />
             </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto pb-12">
            {children}
          </div>
        </div>
        
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="md:hidden absolute inset-0 bg-black/50 z-20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
      </main>
    </div>
  );
};

export default Layout;