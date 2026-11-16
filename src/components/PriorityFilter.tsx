import React, { useEffect, useRef, useState } from 'react';
import {
  PRIORITY_OPTIONS,
  focusPrioritySelection,
  resetPrioritySelection,
  togglePrioritySelection,
} from '../services/eventService';

interface PriorityFilterProps {
  selectedPriorities: number[];
  onChange: (selectedPriorities: number[]) => void;
}

const PriorityFilter: React.FC<PriorityFilterProps> = ({ selectedPriorities, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePriorityClick = (value: number) => {
    onChange(togglePrioritySelection(selectedPriorities, value));
  };

  const handlePriorityDoubleClick = (value: number) => {
    onChange(focusPrioritySelection(value));
  };

  const handleReset = () => {
    onChange(resetPrioritySelection());
  };

  return (
    <div className="priority-filter-menu" ref={menuRef}>
      <button
        type="button"
        className="priority-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open priority filter menu"
        aria-expanded={isOpen}
      >
        !
      </button>

      {isOpen && (
        <div className="priority-menu-dropdown">
          <div className="priority-filter-header">
            <span className="priority-filter-label">Priority</span>
            <span className="priority-filter-range">
              {selectedPriorities.length ? `${Math.min(...selectedPriorities)}–${Math.max(...selectedPriorities)}` : 'None'}
            </span>
          </div>
          <div className="priority-filter-row" aria-label="Priority filter options">
            {PRIORITY_OPTIONS.map((value) => {
              const active = selectedPriorities.includes(value);

              return (
                <button
                  key={value}
                  type="button"
                  className={`priority-chip${active ? ' active' : ''}`}
                  onClick={() => handlePriorityClick(value)}
                  onDoubleClick={() => handlePriorityDoubleClick(value)}
                  aria-pressed={active}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <div className="priority-filter-footer">
            <button type="button" className="priority-reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityFilter;
