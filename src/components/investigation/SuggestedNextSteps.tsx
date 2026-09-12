import React from 'react';
import {
  Search,
  Radio,
  Camera,
  UserCheck,
  Fingerprint,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SuggestionChipItem, SuggestionIconType } from '../../data/investigationDiscoverySequence';

interface SuggestedNextStepsProps {
  suggestions: SuggestionChipItem[];
  onSelectSuggestion: (item: SuggestionChipItem) => void;
  disabled?: boolean;
}

export const SuggestedNextSteps: React.FC<SuggestedNextStepsProps> = ({
  suggestions,
  onSelectSuggestion,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const renderIcon = (type: SuggestionIconType) => {
    const iconClass = "w-3 h-3 shrink-0 opacity-80";
    switch (type) {
      case 'radio':
        return <Radio className={iconClass} />;
      case 'camera':
        return <Camera className={iconClass} />;
      case 'user-check':
        return <UserCheck className={iconClass} />;
      case 'fingerprint':
        return <Fingerprint className={iconClass} />;
      case 'file-text':
        return <FileText className={iconClass} />;
      case 'shield-check':
        return <ShieldCheck className={iconClass} />;
      case 'search':
      default:
        return <Search className={iconClass} />;
    }
  };

  return (
    <div className="w-full px-4 pt-2.5 pb-2 shrink-0 select-none">
      {/* Label: small tracked uppercase */}
      <span
        className={`font-mono text-[9.5px] uppercase tracking-[0.18em] block mb-2 font-medium ${
          isDark ? 'text-[#EDEAE3]/45' : 'text-[#1A1C1E]/45'
        }`}
      >
        SUGGESTED NEXT STEPS
      </span>

      {/* Chips Container: flex wrap with smooth gap */}
      <div className="flex flex-wrap items-center gap-2">
        {suggestions.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectSuggestion(chip)}
            className={`h-7 px-3 rounded-full border text-[11px] font-sans font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group ${
              isDark
                ? 'border-white/[0.09] bg-white/[0.03] text-[#EDEAE3]/80 hover:bg-white/[0.08] hover:border-white/[0.20] hover:text-[#EDEAE3]'
                : 'border-black/[0.08] bg-black/[0.02] text-[#1A1C1E]/80 hover:bg-black/[0.06] hover:border-black/[0.18] hover:text-[#1A1C1E]'
            }`}
            title={chip.label}
          >
            {renderIcon(chip.icon)}
            <span className="truncate max-w-[260px] sm:max-w-[320px]">
              {chip.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
