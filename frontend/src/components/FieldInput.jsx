/**
 * A form field that tracks whether its value was AI-extracted or manually entered.
 * Shows a colored badge and updates the aiFlags map on change.
 */
export default function FieldInput({ label, fieldKey, value, onChange, onFlagChange, aiFlags, type = 'text', textarea = false }) {
  const isAI    = aiFlags?.[fieldKey] === 'ai';
  const isEmpty = value === null || value === undefined || value === '';

  const handleChange = (e) => {
    onChange(fieldKey, e.target.value);
    // Once the user edits, mark as manual
    if (onFlagChange && aiFlags?.[fieldKey] === 'ai') {
      onFlagChange(fieldKey, 'manual');
    }
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="field-wrapper">
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
        {!isEmpty && (
          <span className={`field-badge ${isAI ? 'badge-ai' : 'badge-manual'}`}>
            {isAI ? '🤖 AI' : '✏️'}
          </span>
        )}
      </div>
    </div>
  );
}
