import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

export function PrivacyToggleButton() {
  const { isPrivateMode, togglePrivacyMode } = usePrivacy();

  return (
    <button
      onClick={togglePrivacyMode}
      className="p-2 text-gray-400 hover:text-white bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] hover:bg-gray-200 dark:hover:bg-[#2a2b30] rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6BFF] focus:ring-offset-2 dark:focus:ring-offset-[#0b0c10]"
      aria-label={isPrivateMode ? 'Ativar modo visível' : 'Ativar modo privado'}
      title={isPrivateMode ? 'Mostrar valores' : 'Ocultar valores'}
    >
      {isPrivateMode ? (
        <EyeOff className="w-5 h-5 transition-transform hover:scale-105" />
      ) : (
        <Eye className="w-5 h-5 transition-transform hover:scale-105" />
      )}
    </button>
  );
}
