import { useNewReleases, useFeaturedPlaylists, useRecommendations } from '../../lib/queries/useBrowse';
import { getImage } from '../../lib/utils';

interface HomeViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

function CardGridSkeleton({ count = 6 }: { count?: number }) {
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

export function HomeView({ onNavigate }: HomeViewProps) {
  const { data: newReleases, isLoading: nrLoading } = useNewReleases(12);
  const { data: featured, isLoading: fpLoading } = useFeaturedPlaylists(12);
  const { data: recommendations, isLoading: recLoading } = useRecommendations(
    undefined,
    undefined,
    'pop',
    10,
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
        <p className="page-subtitle">Discover new music and pick up where you left off.</p>
      </div>

      {featured && featured.playlists.items.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Featured</h2>
            <button className="section-link" onClick={() => onNavigate('library')}>Show all</button>
          </div>
          <div className="card-grid">
            {featured.playlists.items.slice(0, 6).map((pl) => (
              <div
                key={pl.id}
                className="card"
                onClick={() => onNavigate('playlist', { id: pl.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('playlist', { id: pl.id }); } }}
              >
                <img
                  className="card-image"
                  src={getImage(pl.images)}
                  alt={pl.name}
                  loading="lazy"
                />
                <div>
                  <div className="card-title">{pl.name}</div>
                  <div className="card-subtitle">
                    {pl.tracks.total} track{pl.tracks.total !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {fpLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Featured</h2>
          </div>
          <CardGridSkeleton />
        </section>
      )}

      {newReleases && newReleases.albums.items.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">New Releases</h2>
            <button className="section-link" onClick={() => onNavigate('library')}>Show all</button>
          </div>
          <div className="card-grid">
            {newReleases.albums.items.slice(0, 6).map((album) => (
              <div
                key={album.id}
                className="card"
                onClick={() => onNavigate('album', { id: album.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('album', { id: album.id }); } }}
              >
                <img
                  className="card-image"
                  src={getImage(album.images)}
                  alt={album.name}
                  loading="lazy"
                />
                <div>
                  <div className="card-title">{album.name}</div>
                  <div className="card-subtitle">
                    {album.artists.map((a) => a.name).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {nrLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">New Releases</h2>
          </div>
          <CardGridSkeleton />
        </section>
      )}

      {recommendations && recommendations.tracks.length > 0 && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Recommended for You</h2>
          </div>
          <div className="card-grid">
            {recommendations.tracks.slice(0, 6).map((track) => (
              <div key={track.id ?? track.uri} className="card" style={{ cursor: 'default' }}>
                <img
                  className="card-image"
                  src={getImage(track.album?.images ?? null)}
                  alt={track.name}
                  loading="lazy"
                />
                <div>
                  <div className="card-title">{track.name}</div>
                  <div className="card-subtitle">
                    {track.artists.map((a) => a.name).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {recLoading && (
        <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
          <div className="section-header">
            <h2 className="section-title">Recommended for You</h2>
          </div>
          <CardGridSkeleton />
        </section>
      )}

      {!nrLoading && !fpLoading && !newReleases && !featured && (
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
