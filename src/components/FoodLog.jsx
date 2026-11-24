export default function FoodLog({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="page">
        <div className="log-empty">
          <div className="log-empty-icon">🍽️</div>
          <p>Noch keine Einträge heute.<br />Füge dein erstes Essen hinzu!</p>
        </div>
      </div>
    );
  }

  const total = entries.reduce((s, e) => s + e.calories, 0);

  return (
    <div className="page">
      <div className="section-label">Heute · {total} kcal gesamt</div>
      {entries.map(entry => (
        <div key={entry.id} className="log-item">
          {entry.image
            ? <img className="log-item-thumb" src={entry.image} alt={entry.name} />
            : <div className="log-item-icon">🍴</div>
          }
          <div className="log-item-info">
            <div className="log-item-name">{entry.name}</div>
            <div className="log-item-time">{entry.time} Uhr</div>
          </div>
          <div className="log-item-kcal">{entry.calories} kcal</div>
          <button className="delete-btn" onClick={() => onDelete(entry.id)} title="Löschen">🗑</button>
        </div>
      ))}
    </div>
  );
}
