interface ConfigFormProps {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  onLocationChange: (location: string) => void;
  onWindMinChange: (value: number) => void;
  onWindMaxChange: (value: number) => void;
  onMinSessionHoursChange: (value: number) => void;
}

export function ConfigForm({
  location,
  windMin,
  windMax,
  minSessionHours,
  onLocationChange,
  onWindMinChange,
  onWindMaxChange,
  onMinSessionHoursChange,
}: ConfigFormProps) {
  return (
    <form className="config-form">
      <div className="form-group">
        <label htmlFor="location">Location</label>
        <select
          id="location"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        >
          <option value="beit-yanai">Beit Yanai</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="windMin">Minimum Wind (knots)</label>
        <input
          id="windMin"
          type="number"
          min="0"
          max="50"
          value={windMin}
          onChange={(e) => onWindMinChange(Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="windMax">Maximum Wind (knots)</label>
        <input
          id="windMax"
          type="number"
          min="0"
          max="50"
          value={windMax}
          onChange={(e) => onWindMaxChange(Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="minSessionHours">Minimum Session (hours)</label>
        <input
          id="minSessionHours"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={minSessionHours}
          onChange={(e) => onMinSessionHoursChange(Number(e.target.value))}
        />
      </div>
    </form>
  );
}
