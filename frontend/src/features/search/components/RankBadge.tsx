interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  return <span className={`rank-badge rank-${Math.min(rank, 3)}`}>#{rank}</span>;
}