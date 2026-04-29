import StatCard from '../../ui/StatCard';

export default function StatsGridCard({ cards, gridClassName }) {
  const className = gridClassName || 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8';

  return (
    <div className={className}>
      {cards.map((card) => (
        <StatCard
          key={card.id || card.label}
          label={card.label}
          value={card.value}
          color={card.color}
          icon={card.icon}
          subtext={card.subtext}
        />
      ))}
    </div>
  );
}
