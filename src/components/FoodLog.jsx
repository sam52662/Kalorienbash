import { Utensils, Trash2, Flame } from 'lucide-react';

export default function FoodLog({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="page">
        <div className="log-empty">
          <Utensils size={48} strokeWidth={1.5} color="#94a3b8" style={{ marginBottom: 12 }} />
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
            : <div className="log-item-icon"><Utensils size={24} strokeWidth={1.5} color="#16a34a" /></div>
          }
          <div className="log-item-info">
            <div className="log-item-name">{entry.name}</div>
            <div className="log-item-time" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={12} strokeWidth={2} color="#f97316" />{entry.time} Uhr
            </div>
          </div>
          <div className="log-item-kcal">{entry.calories} kcal</div>
          <button className="delete-btn" onClick={() => onDelete(entry.id)} title="Löschen">
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
