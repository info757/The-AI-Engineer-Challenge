import React from 'react';

interface HVACNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  darkMode: boolean;
  onQuickAction?: (action: string) => void;
}

const HVACNavigation: React.FC<HVACNavigationProps> = ({ activeTab, onTabChange, darkMode, onQuickAction }) => {
  const tabs = [
    { id: 'diagnostics', label: '🔍 Diagnostics', description: 'Problem-solving mode' },
    { id: 'installation', label: '🔧 Installation', description: 'Step-by-step guides' },
    { id: 'maintenance', label: '⚙️ Maintenance', description: 'Service procedures' },
    { id: 'specifications', label: '📊 Specifications', description: 'Technical data lookup' },
    { id: 'troubleshooting', label: '🚨 Troubleshooting', description: 'Common issues' }
  ];

  return (
    <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} rounded-lg p-4 border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
      <div className="flex flex-wrap gap-2 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-blue-100'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Active tab description */}
      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {tabs.find(tab => tab.id === activeTab)?.description}
      </div>
      
      {/* HVAC-specific quick actions based on active tab */}
      <div className="mt-3 flex flex-wrap gap-2">
        {activeTab === 'diagnostics' && (
          <>
            <button 
              onClick={() => onQuickAction?.('System Won\'t Start')}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full border border-red-200 hover:bg-red-200 transition-colors"
            >
              System Won't Start
            </button>
            <button 
              onClick={() => onQuickAction?.('No Heat/Cool')}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full border border-orange-200 hover:bg-orange-200 transition-colors"
            >
              No Heat/Cool
            </button>
            <button 
              onClick={() => onQuickAction?.('Strange Noises')}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              Strange Noises
            </button>
            <button 
              onClick={() => onQuickAction?.('High Energy Bills')}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 hover:bg-green-200 transition-colors"
            >
              High Energy Bills
            </button>
          </>
        )}
        
        {activeTab === 'installation' && (
          <>
            <button 
              onClick={() => onQuickAction?.('New System Install')}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors"
            >
              New System Install
            </button>
            <button 
              onClick={() => onQuickAction?.('Ductwork Setup')}
              className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full border border-purple-200 hover:bg-purple-200 transition-colors"
            >
              Ductwork Setup
            </button>
            <button 
              onClick={() => onQuickAction?.('Thermostat Wiring')}
              className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-200 transition-colors"
            >
              Thermostat Wiring
            </button>
            <button 
              onClick={() => onQuickAction?.('Refrigerant Lines')}
              className="px-3 py-1 text-xs bg-teal-100 text-teal-700 rounded-full border border-teal-200 hover:bg-teal-200 transition-colors"
            >
              Refrigerant Lines
            </button>
          </>
        )}
        
        {activeTab === 'maintenance' && (
          <>
            <button 
              onClick={() => onQuickAction?.('Filter Replacement')}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              Filter Replacement
            </button>
            <button 
              onClick={() => onQuickAction?.('Coil Cleaning')}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors"
            >
              Coil Cleaning
            </button>
            <button 
              onClick={() => onQuickAction?.('Lubrication')}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 hover:bg-green-200 transition-colors"
            >
              Lubrication
            </button>
            <button 
              onClick={() => onQuickAction?.('Safety Check')}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              Safety Check
            </button>
          </>
        )}
        
        {activeTab === 'specifications' && (
          <>
            <button 
              onClick={() => onQuickAction?.('BTU Ratings')}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full border border-red-200 hover:bg-red-200 transition-colors"
            >
              BTU Ratings
            </button>
            <button 
              onClick={() => onQuickAction?.('Electrical Specs')}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full border border-orange-200 hover:bg-orange-200 transition-colors"
            >
              Electrical Specs
            </button>
            <button 
              onClick={() => onQuickAction?.('Refrigerant Type')}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              Refrigerant Type
            </button>
            <button 
              onClick={() => onQuickAction?.('Dimensions')}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 hover:bg-green-200 transition-colors"
            >
              Dimensions
            </button>
          </>
        )}
        
        {activeTab === 'troubleshooting' && (
          <>
            <button 
              onClick={() => onQuickAction?.('Error Codes')}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full border border-red-200 hover:bg-red-200 transition-colors"
            >
              Error Codes
            </button>
            <button 
              onClick={() => onQuickAction?.('Pressure Issues')}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full border border-orange-200 hover:bg-orange-200 transition-colors"
            >
              Pressure Issues
            </button>
            <button 
              onClick={() => onQuickAction?.('Wiring Problems')}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              Wiring Problems
            </button>
            <button 
              onClick={() => onQuickAction?.('Performance Issues')}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 hover:bg-green-200 transition-colors"
            >
              Performance Issues
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HVACNavigation;