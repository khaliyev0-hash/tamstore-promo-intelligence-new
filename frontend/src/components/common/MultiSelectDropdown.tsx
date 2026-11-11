import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X, RotateCcw } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  count?: number;
}

interface MultiSelectDropdownProps {
  label: string;
  allLabel?: string;
  options: (string | MultiSelectOption)[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  title?: string;
  align?: 'left' | 'right';
  className?: string;
  maxWidth?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  allLabel,
  options,
  selectedValues = [],
  onChange,
  title,
  align = 'left',
  className = '',
  maxWidth = 'max-w-[210px]'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { value, label, subLabel }
  const normalizedOptions = useMemo<MultiSelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Outside click and escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Focus search input on open
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.value && opt.value.toLowerCase().includes(q)) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  const isAllSelected = selectedValues.length === 0;
  const isEveryOptionSelected =
    normalizedOptions.length > 0 && selectedValues.length === normalizedOptions.length;
  const isPartial = selectedValues.length > 0;

  // Toggle single option
  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      const next = selectedValues.filter((v) => v !== value);
      onChange(next);
    } else {
      const next = [...selectedValues, value];
      onChange(next);
    }
  };

  // Select all / reset
  const handleSelectAll = () => {
    onChange([]);
  };

  // Clear all selections
  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Determine trigger button display text
  const displayText = useMemo(() => {
    if (isAllSelected || selectedValues.length === 0) {
      return allLabel || `Bütün ${label} (${normalizedOptions.length})`;
    }
    if (selectedValues.length === 1) {
      const found = normalizedOptions.find((o) => o.value === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    return `${label} (${selectedValues.length}/${normalizedOptions.length})`;
  }, [isAllSelected, selectedValues, allLabel, label, normalizedOptions]);

  return (
    <div ref={containerRef} className={`relative inline-block text-xs select-none ${isOpen ? 'z-50' : 'z-auto'}`}>
      {/* Trigger Button Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer text-xs transition-all ${maxWidth} ${
          isPartial
            ? 'filter-pill-active font-semibold shadow-xs'
            : 'filter-pill-glow bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/60'
        } ${className}`}
        title={title || `${label} üzrə süzgəc`}
        aria-expanded={isOpen}
      >
        <span className="truncate text-left flex-1">{displayText}</span>

        {/* Clear X badge if active */}
        {isPartial ? (
          <span
            onClick={handleClearAll}
            className="p-0.5 rounded-full hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 transition-colors ml-0.5"
            title="Süzgəci sıfırla"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          />
        )}
      </button>

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 min-w-[240px] max-w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ boxShadow: '0 12px 36px -6px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)' }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 px-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                {selectedValues.length === 0 ? 'Hamısı' : `${selectedValues.length}/${normalizedOptions.length}`}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-1.5 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                title="Bütün seçimləri göstər (sıfırla)"
              >
                Hamısı
              </button>
              {isPartial && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-1.5 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-0.5"
                  title="Seçimləri təmizlə"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Təmizlə</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Box (if options > 5) */}
          {normalizedOptions.length > 5 && (
            <div className="relative mb-2 px-0.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Axtar..."
                className="w-full pl-7 pr-6 py-1 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg text-[11px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options Checklist */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-[11px]">
                Nəticə tapılmadı
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {/* Custom Styled Checkbox */}
                    <div
                      className={`w-3.5 h-3.5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>

                    {/* Option Label and optional Sublabel */}
                    <div className="flex-1 truncate">
                      <span className="truncate block" title={opt.label}>
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span className="text-[9px] text-slate-400 font-normal block truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>

                    {/* Optional Count */}
                    {typeof opt.count === 'number' && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                        ({opt.count})
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info / Close */}
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>
              {isAllSelected
                ? 'Hamısı aktivdir'
                : `${selectedValues.length} seçim aktivdir`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
