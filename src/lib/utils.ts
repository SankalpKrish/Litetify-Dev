export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function getImage(images: { url: string; width?: number | null; height?: number | null }[] | null | undefined, size?: number): string {
  if (!images || images.length === 0) return '';
  if (size) {
    const sorted = [...images].sort((a, b) => ((b.width ?? 0) - (a.width ?? 0)));
    const best = sorted.find(i => i.width != null && i.width >= size) ?? sorted[0];
    return best?.url ?? '';
  }
  return images[0]?.url ?? '';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
