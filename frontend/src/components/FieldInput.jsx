import { useState, useRef, useEffect } from 'react';

// Simple Levenshtein distance for fuzzy matching
function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * A form field that tracks whether its value was AI-extracted or manually entered.
 * Now includes smart suggestions from master lists and fuzzy matching.
 */
export default function FieldInput({
  label,
  fieldKey,
  value,
  onChange,
  onFlagChange,
  aiFlags,
  alternatives = {},
  type = 'text',
  textarea = false,
  masterList = [], // NEW: List of valid options for this field
}) {
  const isAI = aiFlags?.[fieldKey] === 'ai';
  const isEmpty = value === null || value === undefined || value === '';

  // Combine AI-provided alternatives with fuzzy matches from the master list
  const rawAlts = alternatives?.[fieldKey] || [];
  const [showAlts, setShowAlts] = useState(false);
  const wrapperRef = useRef(null);

  const getSmartSuggestions = () => {
    let suggestions = [...rawAlts];

    if (masterList.length > 0 && value) {
      const normalizedValue = value.toUpperCase();
      // Get top 5 fuzzy matches from master list
      const fuzzyMatches = masterList
        .map((opt) => ({ opt, dist: getLevenshteinDistance(normalizedValue, opt.toUpperCase()) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
        .map((m) => m.opt);

      suggestions = [...new Set([...suggestions, ...fuzzyMatches])];
    }

    return suggestions.filter((s) => s !== value);
  };

  const suggestions = getSmartSuggestions();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowAlts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    onChange(fieldKey, e.target.value);
    if (onFlagChange && aiFlags?.[fieldKey] === 'ai') {
      onFlagChange(fieldKey, 'manual');
    }
  };

  const selectAlt = (alt) => {
    onChange(fieldKey, alt);
    if (onFlagChange) onFlagChange(fieldKey, 'manual');
    setShowAlts(false);
  };

  return (
    <div className="form-group" ref={wrapperRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label && <label className="form-label">{label}</label>}
        {suggestions.length > 0 && (
          <button
            type="button"
            className="text-xs font-bold text-blue-mid hover:underline"
            onClick={() => setShowAlts(!showAlts)}
            style={{ marginBottom: 4 }}
          >
            {showAlts ? 'Close Suggestions' : `Suggestions (${suggestions.length}) ▼`}
          </button>
        )}
      </div>

      <div className="field-wrapper" style={{ position: 'relative' }}>
        {textarea ? (
          <textarea
            className="form-textarea"
            value={value ?? ''}
            onChange={handleChange}
            style={{ paddingRight: 64 }}
          />
        ) : (
          <input className="form-input" type={type} value={value ?? ''} onChange={handleChange} />
        )}

        {!isEmpty && !showAlts && (
          <span className={`field-badge ${isAI ? 'badge-ai' : 'badge-manual'}`}>
            {isAI ? '🤖 AI' : '✏️'}
          </span>
        )}

        {showAlts && (
          <div className="alternatives-dropdown">
            <div
              style={{
                padding: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#666',
                borderBottom: '1px solid #eee',
              }}
            >
              SMART SUGGESTIONS
            </div>
            {suggestions.map((alt, i) => (
              <div key={i} className="alt-item" onClick={() => selectAlt(alt)}>
                {alt}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .alternatives-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid var(--blue-mid);
          border-top: none;
          z-index: 50;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .alt-item {
          padding: 10px 12px;
          font-size: 13px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .alt-item:hover {
          background: #f0f7ff;
          color: var(--blue-dark);
          font-weight: 600;
        }
        .alt-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
