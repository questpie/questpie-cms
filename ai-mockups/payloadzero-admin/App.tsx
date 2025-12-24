import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CollectionList from './pages/CollectionList';
import CollectionEdit from './pages/CollectionEdit';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collections/:slug" element={<CollectionList />} />
          <Route path="/collections/:slug/:id" element={<CollectionEdit />} />
          {/* Route for Singleton Globals */}
          <Route path="/globals/:slug" element={<CollectionEdit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
