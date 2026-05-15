/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ApiKeys } from './components/ApiKeys';
import { WorkSpace } from './components/WorkSpace';
import { Dashboard } from './components/Dashboard';
import { Positions } from './components/Positions';
import { Settings } from './components/Settings';
import { ApiTester } from './components/ApiTester';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  let activeTabName = activeTab;
  if (activeTab === 'api-keys') activeTabName = 'API Keys';
  if (activeTab === 'settings') activeTabName = 'Settings';
  if (activeTab === 'api-tester') activeTabName = 'Execução de Testes';

  return (
    <WorkSpace>
      <div className="flex h-screen bg-[#0b0c10] overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />

        <main className="flex-1 overflow-hidden bg-[#0b0c10] p-6 flex flex-col">
          <header className="mb-6 shrink-0">
            <h2 className="text-2xl font-semibold tracking-tight text-white capitalize">
              {activeTabName}
            </h2>
          </header>

          <div className="flex-1 overflow-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'positions' && <Positions />}
            {activeTab === 'api-keys' && <ApiKeys />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'api-tester' && <ApiTester />}
          </div>
        </main>
      </div>
    </WorkSpace>
  );
}

