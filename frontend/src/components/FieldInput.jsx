import { useState, useRef, useEffect } from 'react';

/**
 * A form field that tracks whether its value was AI-extracted or manually entered.
 * Shows a colored badge and updates the aiFlags map on change.
 */
export default function FieldInput({ label, fieldKey, value, onChange, onFlagChange, aiFlags, alternatives = {}, type = 'text', textarea = false }) {
  const isAI    = aiFlags?.[fieldKey] === 'ai';
  const isEmpty = value === null || value === undefined || value === '';
  const alts    = alternatives?.[fieldKey] || [];
  
  const [showAlts, setShowAlts] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowAlts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    onChange(fieldKey, e.target.value);
    // Once the user edits, mark as manual
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
        {alts.length > 0 && (
          <button 
            type="button"
            className="text-xs font-bold text-blue-mid hover:underline"
            onClick={() => setShowAlts(!showAlts)}
            style={{ marginBottom: 4 }}
          >
            {showAlts ? 'Close Alts' : `Alternatives (${alts.length}) ▼`}
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
          <input
            className="form-input"
            type={type}
            value={value ?? ''}
            onChange={handleChange}
          />
        )}
        
        {!isEmpty && !showAlts && (
          <span className={`field-badge ${isAI ? 'badge-ai' : 'badge-manual'}`}>
            {isAI ? '🤖 AI' : '✏️'}
          </span>
        )}

        {showAlts && (
          <div className="alternatives-dropdown">
            <div style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold', color: '#666', borderBottom: '1px solid #eee' }}>
              POSSIBLE ALTERNATIVES
            </div>
            {alts.map((alt, i) => (
              <div 
                key={i} 
                className="alt-item"
                onClick={() => selectAlt(alt)}
              >
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

