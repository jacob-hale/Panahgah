import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import type { PublicSocialFeedItem } from '../api/types';
import './NewsAndSocialPage.css';

/** Instagram embed that includes caption inside the widget (fallback when we cannot use a native image). */
function instagramCaptionedEmbedUrl(permalink: string): string {
  const u = permalink.trim().replace(/\/+$/, '');
  const stripped = u.replace(/\/embed(?:\/captioned)?\/?$/i, '');
  return `${stripped}/embed/captioned/`;
}

function embedFriendlyUrl(platform: string, permalink: string): string | null {
  const p = platform.trim().toLowerCase();
  const u = permalink.trim();
  if (!u) return null;
  if (p === 'instagram') {
    return instagramCaptionedEmbedUrl(u);
  }
  if (p === 'facebook') {
    return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(u)}&show_text=true&width=500&height=720`;
  }
  return null;
}

function resolveEmbedSrc(item: PublicSocialFeedItem, skipInstagram: boolean): string | null {
  const ig = item.instagram_post_url?.trim();
  const fb = item.facebook_post_url?.trim();
  if (!skipInstagram && ig) return embedFriendlyUrl('Instagram', ig);
  if (fb) return embedFriendlyUrl('Facebook', fb);
  const fallback = item.published_post_url?.trim();
  if (!fallback) return null;
  if (skipInstagram) {
    const label = item.platform.toLowerCase();
    if (label.includes('facebook')) return embedFriendlyUrl('Facebook', fallback);
    return null;
  }
  const label = item.platform.toLowerCase();
  if (label.includes('instagram')) return embedFriendlyUrl('Instagram', fallback);
  if (label.includes('facebook')) return embedFriendlyUrl('Facebook', fallback);
  return embedFriendlyUrl('Facebook', fallback);
}

function previewImageSrc(mediaUrl: string | null): string | null {
  if (!mediaUrl) return null;
  const marker = '/campaign-media/';
  const idx = mediaUrl.toLowerCase().indexOf(marker);
  if (idx >= 0) {
    return mediaUrl.substring(idx);
  }
  return mediaUrl;
}

/** Single Instagram image from Graph: show full-resolution photo with natural aspect ratio (not the square iframe). */
function useNativeInstagramImage(item: PublicSocialFeedItem): boolean {
  const mt = item.media_type?.toUpperCase();
  if (mt !== 'IMAGE') {
    return false;
  }
  const hasIg = Boolean(item.instagram_post_url?.trim()) || item.platform.toLowerCase().includes('instagram');
  if (!hasIg) {
    return false;
  }
  const src = previewImageSrc(item.media_url);
  if (!src || /\.mp4(\?|$)/i.test(src)) {
    return false;
  }
  return true;
}

function sidebarHandle(item: PublicSocialFeedItem): string {
  if (item.instagram_post_url?.trim()) {
    return 'panahgah.refuge';
  }
  if (item.facebook_post_url?.trim()) {
    return 'Panahgah Refuge';
  }
  return item.campaign_title?.trim() || item.platform;
}

export function NewsAndSocialPage() {
  const [items, setItems] = useState<PublicSocialFeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetch<PublicSocialFeedItem[]>('/api/public/social-feed?take=24');
        if (!cancelled) {
          setItems(rows);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load updates.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="container py-4 py-md-5">
      <h1 className="h2 mb-2">News &amp; social updates</h1>
      <p className="text-body-secondary col-lg-10 mb-4">
        Highlights from Panahgah on Instagram and Facebook—stories from the safehouses, events, and the people we walk
        alongside. Open any post to see the full thread, comments, and ways to share.
      </p>

      {loading ? <p className="text-body-secondary">Loading…</p> : null}
      {error ? <div className="alert alert-warning">{error}</div> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="text-body-secondary col-lg-10">
          No updates to show yet. New highlights from our social channels will appear here—please check back soon.
        </p>
      ) : null}

      <div className="row g-4">
        {items.map((item, idx) => {
          const nativeIg = useNativeInstagramImage(item);
          const embedSrc = resolveEmbedSrc(item, nativeIg);
          const thumb = previewImageSrc(item.media_url);
          const showFallbackThumb = Boolean(thumb) && !embedSrc && !nativeIg;
          const when = item.published_at_utc ? new Date(item.published_at_utc).toLocaleString() : '';
          const platformLabel =
            item.platforms && item.platforms.length > 0 ? item.platforms.join(' · ') : item.platform;
          const title =
            item.campaign_title?.trim() ||
            (platformLabel.toLowerCase().includes('instagram') ? 'Instagram' : 'Facebook');
          const imgSrc = nativeIg ? previewImageSrc(item.media_url) : null;
          const handle = sidebarHandle(item);
          const hasMedia = Boolean((nativeIg && imgSrc) || embedSrc || showFallbackThumb);

          return (
            <div key={`${item.published_post_url ?? item.caption}-${idx}`} className="col-12 col-lg-6">
              <article className="card shadow-sm overflow-hidden border">
                <div className="news-post-card-inner">
                  <div className="row g-0 flex-column flex-lg-row">
                    {/* Media column sets card height; no min-height for photos (avoids tall black bars). */}
                    <div
                      className="news-post-media-col col-12 col-lg-7 d-flex align-items-center justify-content-center bg-black p-0"
                      style={
                        embedSrc && !nativeIg
                          ? { minHeight: 'min(48vh, 500px)' }
                          : !hasMedia
                            ? { minHeight: '200px' }
                            : undefined
                      }
                    >
                      {nativeIg && imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.caption?.trim() ? item.caption.trim().slice(0, 200) : 'Post image'}
                          className="w-100 d-block"
                          style={{
                            maxHeight: 'min(85vh, 960px)',
                            height: 'auto',
                            objectFit: 'contain',
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      {showFallbackThumb ? (
                        <img
                          src={thumb!}
                          alt=""
                          className="w-100 d-block"
                          style={{
                            maxHeight: 'min(85vh, 960px)',
                            objectFit: 'contain',
                          }}
                          loading="lazy"
                        />
                      ) : null}
                      {embedSrc ? (
                        <iframe
                          title="Embedded social post"
                          src={embedSrc}
                          className="border-0 w-100 d-block bg-dark"
                          style={{ minHeight: 'min(48vh, 500px)', height: '100%' }}
                          scrolling="no"
                          allowFullScreen
                        />
                      ) : null}
                      {!hasMedia ? (
                        <span className="text-white-50 small p-4">No preview available</span>
                      ) : null}
                    </div>

                    {/* Caption column: on lg+ height = media column; caption scrolls inside */}
                    <div className="news-post-sidebar-col col-12 col-lg-5 d-flex flex-column min-h-0 bg-body border-top border-lg-0 border-lg-start border-secondary-subtle">
                    <div className="flex-shrink-0 d-flex align-items-center gap-2 p-3 border-bottom border-secondary-subtle bg-body-tertiary">
                      <img
                        src="/panahgah-logo.png"
                        alt=""
                        width={36}
                        height={36}
                        className="rounded-circle flex-shrink-0 border border-light shadow-sm"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="min-w-0 flex-grow-1">
                        <div className="fw-semibold small text-body text-truncate">
                          {item.instagram_post_url?.trim() ? `@${handle}` : handle}
                        </div>
                        {when ? <div className="text-body-secondary small">{when}</div> : null}
                      </div>
                      <span className="badge rounded-pill text-bg-secondary flex-shrink-0">{platformLabel}</span>
                    </div>

                    {item.campaign_title?.trim() && item.campaign_title.trim() !== handle ? (
                      <div className="flex-shrink-0 px-3 pt-2 pb-1 small fw-semibold text-body-secondary border-bottom border-secondary-subtle">
                        {title}
                      </div>
                    ) : null}

                    <div className="news-caption-scroll flex-grow-1 min-h-0 overflow-auto p-3 small text-body">
                      {item.caption?.trim() ? (
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {item.caption}
                        </p>
                      ) : (
                        <p className="mb-0 text-body-secondary fst-italic">No caption for this post.</p>
                      )}
                    </div>

                    <div className="flex-shrink-0 p-3 border-top border-secondary-subtle bg-body-tertiary d-flex flex-wrap gap-2 justify-content-end">
                      {item.instagram_post_url ? (
                        <a
                          href={item.instagram_post_url}
                          className="btn btn-outline-primary btn-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open on Instagram
                        </a>
                      ) : null}
                      {item.facebook_post_url ? (
                        <a
                          href={item.facebook_post_url}
                          className="btn btn-outline-primary btn-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open on Facebook
                        </a>
                      ) : null}
                      {!item.instagram_post_url && !item.facebook_post_url && item.published_post_url ? (
                        <a
                          href={item.published_post_url}
                          className="btn btn-outline-primary btn-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open post
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
