import { useTopArtists, useTopTracks, useRecentlyPlayed, useHomePlaylists } from '../../lib/queries/useHome';
import { getImage } from '../../lib/utils';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';

interface HomeViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ opacity: 0.3 }}>
          <div className="card-image" />
          <div>
            <div className="card-title">&nbsp;</div>
            <div className="card-subtitle">&nbsp;</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultImage() {
  return (
    <div className="card-image" style={{
      background: 'var(--lt-surface-elevated)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--lt-fg-tertiary)',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  if (!src) return <DefaultImage />;
  return <img className="card-image" src={src} alt={alt} loading="lazy" />;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const { data: topArtists, isLoading: taLoading } = useTopArtists(6);
  const { data: topTracks, isLoading: ttLoading } = useTopTracks(6);
  // Fetch extra recently-played: the endpoint returns one entry per play event,
  // so we over-fetch then dedupe by track id to get 6 distinct tracks.
  const { data: recentlyPlayed, isLoading: rpLoading } = useRecentlyPlayed(50);
  const { data: playlists, isLoading: plLoading } = useHomePlaylists(6);

  // Dedupe recently-played by track id, keeping first (most recent) occurrence.
  const recentUnique = (() => {
    if (!recentlyPlayed) return [];
    const seen = new Set<string>();
    const out: typeof recentlyPlayed.items = [];
    for (const item of recentlyPlayed.items) {
      const key = item.track?.id ?? item.track?.uri;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= 6) break;
    }
    return out;
  })();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Good evening</h1>
      </div>

      {recentUnique.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Recently played</h2>
          </div>
          <div className="card-grid">
            {recentUnique.map((item) => (
              <div
                key={`${item.track.id}-${item.played_at}`}
                className="card"
                onClick={() => onNavigate('album', { id: item.track.album?.id ?? '' })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('album', { id: item.track.album?.id ?? '' }); } }}
              >
                <CardImage src={getImage(item.track.album?.images ?? null)} alt={item.track.album?.name ?? ''} />
                <div>
                  <div className="card-title">{item.track.name}</div>
                  <div className="card-subtitle">{item.track.artists.map(a => a.name).join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {rpLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header"><h2 className="section-title">Recently played</h2></div>
          <CardSkeleton />
        </section>
      )}

      {topArtists && topArtists.items.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Your top artists</h2>
            <button className="section-link" onClick={() => onNavigate('search')}>Show all</button>
          </div>
          <div className="card-grid">
            {topArtists.items.slice(0, 6).map((artist) => (
              <div
                key={artist.id}
                className="card"
                onClick={() => onNavigate('artist', { id: artist.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('artist', { id: artist.id }); } }}
              >
                <img className="card-image card-image-round" src={getImage(artist.images)} alt={artist.name} loading="lazy" />
                <div>
                  <div className="card-title">{artist.name}</div>
                  <div className="card-subtitle">Artist</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {taLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header"><h2 className="section-title">Your top artists</h2></div>
          <CardSkeleton />
        </section>
      )}

      {topTracks && topTracks.items.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Your top tracks</h2>
          </div>
          <div className="card-grid">
            {topTracks.items.slice(0, 6).map((track) => {
              const albumId = track.album?.id;
              return (
                <div
                  key={track.id ?? track.uri}
                  className="card"
                  onClick={() => { if (albumId) onNavigate('album', { id: albumId }); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && albumId) { e.preventDefault(); onNavigate('album', { id: albumId }); } }}
                >
                  <CardImage src={getImage(track.album?.images ?? null)} alt={track.album?.name ?? ''} />
                  <div>
                    <div className="card-title">{track.name}</div>
                    <div className="card-subtitle">{track.artists.map(a => a.name).join(', ')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {ttLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header"><h2 className="section-title">Your top tracks</h2></div>
          <CardSkeleton />
        </section>
      )}

      {playlists && playlists.items.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Your playlists</h2>
            <button className="section-link" onClick={() => onNavigate('library')}>Show all</button>
          </div>
          <div className="card-grid">
            {playlists.items.slice(0, 6).map((pl) => (
              <div
                key={pl.id}
                className="card"
                onClick={() => onNavigate('playlist', { id: pl.id })}
                onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, { kind: 'playlist', id: pl.id, name: pl.name, uri: `spotify:playlist:${pl.id}`, image: getImage(pl.images, 64) }); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('playlist', { id: pl.id }); } }}
              >
                <CardImage src={getImage(pl.images)} alt={pl.name} />
                <div>
                  <div className="card-title">{pl.name}</div>
                  <div className="card-subtitle">
                    {pl.tracks?.total ?? 0} track{(pl.tracks?.total ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {plLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header"><h2 className="section-title">Your playlists</h2></div>
          <CardSkeleton />
        </section>
      )}

      {!rpLoading && !taLoading && !plLoading && !recentlyPlayed && !topArtists && !playlists && (
        <div className="empty-state">
          <div className="empty-state-title">Welcome to Litetify</div>
          <div className="empty-state-desc">
            Your personalized home feed will appear here. Start by exploring your library.
          </div>
        </div>
      )}
    </div>
  );
}