/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ApiConfigModal } from './components/ApiConfigModal';
import { WorkSpace } from './components/WorkSpace';
import { Dashboard } from './components/Dashboard';
import { Positions } from './components/Positions';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <WorkSpace>
      <div className="flex h-screen bg-[#0b0c10] overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenConfig={() => setIsConfigOpen(true)} 
        />

        <main className="flex-1 overflow-auto bg-[#0b0c10] p-6">
          <header className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white capitalize">
              {activeTab}
            </h2>
          </header>

          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'positions' && <Positions />}
        </main>

        <ApiConfigModal 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
        />
      </div>
    </WorkSpace>
  );
}
