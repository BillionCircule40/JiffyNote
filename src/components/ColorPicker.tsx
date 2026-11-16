import React, { useState } from 'react';
import { EVENT_COLORS } from '../calendar/types';

const RECENT_COLORS_KEY = 'jiffynote.planner.recentColors';

const loadRecentColors = (): string[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((color): color is string => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState(color);

  const selectColor = (nextColor: string, remember = true) => {
    onChange(nextColor);
    if (!remember) {
      return;
    }
    setRecentColors((current) => {
      const next = [nextColor, ...current.filter((recent) => recent.toLowerCase() !== nextColor.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
      } catch {
        // Recent colors remain available for the current session.
      }
      return next;
    });
  };

  return (
    <div className="color-picker-control">
      <div className="color-picker-layout">
        <div className="color-picker-swatches" role="group" aria-label="Event colors">
          {EVENT_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`color-swatch${color.toLowerCase() === preset.toLowerCase() ? ' selected' : ''}`}
              style={{ background: preset }}
              aria-label={`Select color ${preset}`}
              aria-pressed={color.toLowerCase() === preset.toLowerCase()}
              onClick={() => selectColor(preset, false)}
            />
          ))}
          {recentColors.map((recent) => (
            <button
              key={recent}
              type="button"
              className={`color-swatch${color.toLowerCase() === recent.toLowerCase() ? ' selected' : ''}`}
              style={{ background: recent }}
              aria-label={`Use recent color ${recent}`}
              aria-pressed={color.toLowerCase() === recent.toLowerCase()}
              title={recent}
              onClick={() => selectColor(recent)}
            />
          ))}
          <button
            type="button"
            className="color-picker-add"
            title="Choose custom color"
            aria-label="Choose custom color"
            aria-expanded={customPickerOpen}
            onClick={() => {
              setPendingColor(color);
              setCustomPickerOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
      {customPickerOpen && (
        <div className="color-picker-custom-panel" role="group" aria-label="Custom color picker">
          <label className="color-picker-custom-field">
            <span>Custom color</span>
            <input type="color" value={pendingColor} onChange={(event) => setPendingColor(event.target.value)} />
            <code>{pendingColor.toUpperCase()}</code>
          </label>
          <div className="color-picker-custom-actions">
            <button type="button" className="outline-btn" onClick={() => setCustomPickerOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="color-picker-confirm"
              onClick={() => {
                selectColor(pendingColor);
                setCustomPickerOpen(false);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
