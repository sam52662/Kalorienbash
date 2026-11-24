export default function FoodLog({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="log-section">
        <div className="log-empty">
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🍽️</div>
          <p>Noch keine Einträge heute.</p>
          <p style={{ marginTop: 4, fontSize: '0.8rem' }}>Füge dein erstes Essen hinzu!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-section">
      <div className="log-date">Heute</div>
      {entries.map(entry => (
        <div key={entry.id} className="log-item">
          {entry.image
            ? <img className="log-item-thumb" src={entry.image} alt={entry.name} />
            : <div className="log-item-icon">🍴</div>
          }
          <div className="log-item-info">
            <div className="log-item-name">{entry.name}</div>
            <div className="log-item-time">{entry.time}</div>
          </div>
          <div className="log-item-kcal">{entry.calories} kcal</div>
          <button className="delete-btn" onClick={() => onDelete(entry.id)} title="Löschen">🗑️</button>
        </div>
      ))}
    </div>
  );
}
