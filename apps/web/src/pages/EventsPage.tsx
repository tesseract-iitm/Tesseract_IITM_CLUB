import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ExternalLink, 
  Search, 
  X, 
  MapPin, 
  Trophy, 
  Users, 
  LayoutGrid, 
  List as ListIcon, 
  ArrowRight, 
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/ui/schema';
import { Brackets, Pill, type Accent } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { processImageUrl } from '@/lib/imageUtils';
import { SAAVAN_EVENTS, type SaavanEvent, getFeaturedSaavanEvent } from '@/data/saavanEvents';

type EventStatus = 'UPCOMING' | 'ONGOING' | 'PAST';
type ViewMode = 'grid' | 'list';

const ROW_ACCENTS: Accent[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const CATEGORY_FILTERS = [
  { key: 'ALL', label: 'all_categories' },
  { key: 'Esports', label: 'esports' },
  { key: 'Puzzle & Mind Games', label: 'mind_games' },
  { key: 'Nostalgic Competitive Event', label: 'nostalgia' },
  { key: 'Community', label: 'community' },
];

function formatEventDay(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
}

function formatEventTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatLongDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' }).toUpperCase();
}

function startsIn(d: string): string {
  const ms = new Date(d).getTime() - Date.now();
  if (ms < 0) return 'COMPLETED';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h < 24) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h`;
}

function getSaavanRegistrationStatus(event: SaavanEvent): {
  status: 'not_started' | 'open' | 'closed' | 'full' | 'past';
  message: string;
  canRegister: boolean;
} {
  if (event.status === 'PAST') {
    return { status: 'past', message: 'Event has ended', canRegister: false };
  }

  if (event.capacity && event.capacity <= 0) {
    return { status: 'full', message: 'Event is full', canRegister: false };
  }

  return { status: 'open', message: 'Registration open', canRegister: true };
}

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState<EventStatus | 'ALL'>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [registeredEventIds] = useState<Set<string>>(new Set());

  const { user, token } = useAuth();
  const navigate = useNavigate();

  const events = SAAVAN_EVENTS;

  const handleRegister = async (event: SaavanEvent) => {
    if (event.registrationUrl) {
      window.location.assign(event.registrationUrl);
      return;
    }
    const regStatus = getSaavanRegistrationStatus(event);
    if (!regStatus.canRegister) {
      toast.error(regStatus.message);
      return;
    }
    if (!user || !token) {
      localStorage.setItem('pendingEventRegistration', event.id);
      localStorage.setItem('pendingEventRegistrationType', event.teamRegistration ? 'team' : 'solo');
      navigate('/signin', { state: { from: '/events', pendingEventId: event.id } });
      return;
    }
    if (!user.phone || !user.course || !user.branch || !user.year) {
      localStorage.setItem('pendingEventRegistration', event.id);
      navigate('/dashboard/profile', { state: { message: 'Complete your profile first', pendingEventId: event.id } });
      return;
    }
    if (event.teamRegistration) {
      navigate(`/events/${event.slug}`);
      return;
    }
  };

  // Multi-dimensional filtering: Status, Category, and Real-time Search Query
  const filtered = useMemo(() => {
    return events.filter((e) => {
      // Status filter
      if (activeTab !== 'ALL' && e.status !== activeTab) return false;

      // Category filter
      if (activeCategory !== 'ALL' && !e.eventType?.toLowerCase().includes(activeCategory.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = e.title.toLowerCase().includes(query);
        const inDesc = (e.shortDescription || e.description || '').toLowerCase().includes(query);
        const inType = (e.eventType || '').toLowerCase().includes(query);
        const inVenue = (e.venue || e.location || '').toLowerCase().includes(query);
        if (!inTitle && !inDesc && !inType && !inVenue) return false;
      }

      return true;
    });
  }, [events, activeTab, activeCategory, searchQuery]);

  const featured = getFeaturedSaavanEvent();
  const list = useMemo(() => {
    if (activeTab === 'PAST' || activeCategory !== 'ALL' || searchQuery.trim()) {
      return filtered;
    }
    return filtered.filter((e) => e.id !== featured?.id);
  }, [filtered, featured, activeTab, activeCategory, searchQuery]);

  const statusTabs: Array<{ key: EventStatus | 'ALL'; label: string; accent: Accent; count: number }> = [
    { key: 'ALL', label: 'all_events', accent: 'yellow', count: events.length },
    { key: 'UPCOMING', label: 'upcoming', accent: 'green', count: events.filter((e) => e.status === 'UPCOMING').length },
    { key: 'ONGOING', label: 'ongoing', accent: 'blue', count: events.filter((e) => e.status === 'ONGOING').length },
    { key: 'PAST', label: 'past', accent: 'purple', count: events.filter((e) => e.status === 'PAST').length },
  ];

  const totalPrizePool = useMemo(() => {
    return events.reduce((acc, curr) => {
      if (curr.prizes) {
        const num = parseInt(curr.prizes.replace(/[^\d]/g, ''), 10);
        return isNaN(num) ? acc : acc + num;
      }
      return acc;
    }, 0);
  }, [events]);

  return (
    <Layout>
      <SEO
        title="Events & Tournaments"
        description="Official competitive calendar for IIT Madras BS esports tournaments, mind games, and campus gaming events."
        url="/events"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
        { name: 'Events', url: 'https://tesseract.iitm.ac.in/events' },
      ]} />

      {/* Cybernetic Editorial Header */}
      <section className="events-hero" style={{ borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <span 
            className="lb-mono"
            style={{
              background: 'rgba(0, 240, 255, 0.12)',
              color: 'var(--c-cyan, #00f0ff)',
              border: '1px solid var(--c-cyan, #00f0ff)',
              padding: '3px 9px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              fontWeight: 700
            }}
          >
            SECTION 10 // EVENT HORIZON
          </span>
          <span className="lb-kicker" style={{ margin: 0 }}>
            // OFFICIAL COMPETITIVE CALENDAR
          </span>
        </div>

        <h1 className="events-title">
          TESSERACT <span className="lb-h-accent">TOURNAMENTS</span> & ACTIVITIES
        </h1>
        <p className="lb-sub" style={{ maxWidth: '780px' }}>
          The central discovery and competitive arena for IIT Madras BS esports tournaments, mind games, collegiate stages, and community challenges.
        </p>

        {/* Live Telemetry KPI Strip */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '12px', 
            marginTop: '1.5rem', 
            paddingTop: '1.2rem',
            borderTop: '1px dashed rgba(255, 255, 255, 0.12)' 
          }}
        >
          <div style={{ background: 'var(--bg-1)', padding: '12px 16px', border: '1px solid var(--line-2)' }}>
            <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              SCHEDULED STAGES
            </div>
            <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: 'var(--fg)', marginTop: '4px' }}>
              {events.length} ACTIVE
            </div>
          </div>

          <div style={{ background: 'var(--bg-1)', padding: '12px 16px', border: '1px solid var(--line-2)' }}>
            <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              CUMULATIVE PRIZES
            </div>
            <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: 'var(--c-green)', marginTop: '4px' }}>
              ₹{totalPrizePool.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'var(--bg-1)', padding: '12px 16px', border: '1px solid var(--line-2)' }}>
            <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              NEXT UP
            </div>
            <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: 'var(--c-yellow)', marginTop: '4px' }}>
              {featured ? startsIn(featured.startDate) : 'TBA'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-1)', padding: '12px 16px', border: '1px solid var(--line-2)' }}>
            <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              ACCESS PROTOCOL
            </div>
            <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '14px', color: 'var(--c-cyan)', marginTop: '8px' }}>
              OPEN TO ALL STUDENTS
            </div>
          </div>
        </div>
      </section>

      {/* Control Toolbar: Status, Categories, Search, and View Mode */}
      <section style={{ padding: '20px 40px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Row: Status Tabs + Search + View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {statusTabs.map((t) => (
                <Pill
                  key={t.key}
                  accent={t.accent}
                  active={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label} ({t.count})
                </Pill>
              ))}
            </div>

            {/* Right Controls: Search & View Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Monospace Search Box */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg)',
                  border: '1px solid var(--line-2)',
                  padding: '6px 12px',
                  gap: '8px',
                  width: '240px'
                }}
              >
                <Search size={14} style={{ color: 'var(--fg-mute)' }} />
                <input
                  type="text"
                  placeholder="SEARCH EVENTS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '11px',
                    width: '100%',
                    letterSpacing: '0.05em'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-mute)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div style={{ display: 'flex', border: '1px solid var(--line-2)', background: 'var(--bg)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  style={{
                    background: viewMode === 'grid' ? 'var(--c-yellow)' : 'transparent',
                    color: viewMode === 'grid' ? '#000' : 'var(--fg-mute)',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">GRID</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  style={{
                    background: viewMode === 'list' ? 'var(--c-yellow)' : 'transparent',
                    color: viewMode === 'list' ? '#000' : 'var(--fg-mute)',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  <ListIcon size={14} />
                  <span className="hidden sm:inline">LIST</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Category Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.12em', marginRight: '4px' }}>
              DISCIPLINE:
            </span>
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  background: activeCategory === cat.key ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                  color: activeCategory === cat.key ? 'var(--c-cyan)' : 'var(--fg-mute)',
                  border: `1px solid ${activeCategory === cat.key ? 'var(--c-cyan)' : 'var(--line)'}`,
                  padding: '4px 10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                [{cat.label}]
              </button>
            ))}
            {(activeCategory !== 'ALL' || searchQuery || activeTab !== 'ALL') && (
              <button
                onClick={() => {
                  setActiveTab('ALL');
                  setActiveCategory('ALL');
                  setSearchQuery('');
                }}
                className="lb-mono"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-red)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: 'auto'
                }}
              >
                RESET FILTERS ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured Showcase (Displayed on ALL/UPCOMING without active text query) */}
      {featured && activeTab !== 'PAST' && activeCategory === 'ALL' && !searchQuery.trim() && (
        <section className="events-featured">
          <Brackets tag="featured · premier_stage" accent="red">
            <div className="event-feat lb-c-red">
              <div className="event-feat-art" style={{ position: 'relative', overflow: 'hidden' }}>
                {featured.imageUrl ? (
                  <img
                    src={processImageUrl(featured.imageUrl, 'poster-card')}
                    alt={featured.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="event-feat-glyph">▶</div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, transparent 60%)' }} />
                <div className="event-feat-tag">
                  {featured.eventType ? `#${featured.eventType.toLowerCase().replace(/\s+/g, '_')}` : '#event'}
                </div>
                {featured.prizes && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'var(--c-green)',
                      color: '#000',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      letterSpacing: '0.05em'
                    }}
                  >
                    PRIZE: {featured.prizes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="event-feat-when">
                    <div><span>DATE</span><b>{formatLongDate(featured.startDate)}</b></div>
                    <div><span>TIME</span><b>{formatEventTime(featured.startDate)} IST</b></div>
                    <div><span>WHERE</span><b>{(featured.venue || featured.location || 'TBA').slice(0, 18)}</b></div>
                    <div><span>STARTS_IN</span><b style={{ color: 'var(--c-red)' }}>{startsIn(featured.startDate)}</b></div>
                  </div>
                  <h2 className="event-feat-title">{featured.title}</h2>
                  <p className="event-feat-desc">
                    {featured.shortDescription || featured.description?.slice(0, 240) || 'No description available.'}
                  </p>
                </div>
                <div className="event-feat-actions">
                  {featured.registrationUrl ? (
                    <a
                      href={featured.registrationUrl}
                      target="_self"
                      rel="noopener noreferrer"
                      className="lb-btn-primary lb-btn-lg"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                      <span>REGISTER ON SAAVAN</span>
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <button
                      disabled={registeredEventIds.has(featured.id)}
                      onClick={() => void handleRegister(featured)}
                      className="lb-btn-primary lb-btn-lg"
                    >
                      {registeredEventIds.has(featured.id) ? '✓ REGISTERED' : 'RSVP ✓'}
                    </button>
                  )}
                  <Link to={`/events/${featured.slug}`} className="lb-btn-ghost lb-btn-lg" style={{ textDecoration: 'none' }}>
                    RULEBOOK & DETAILS →
                  </Link>
                </div>
              </div>
            </div>
          </Brackets>
        </section>
      )}

      {/* Main Events Container */}
      <section className="events-list-section" style={{ minHeight: '400px' }}>
        <div className="lb-sect-head" style={{ padding: '0 40px 20px' }}>
          <div>
            <div className="lb-kicker">// {activeTab.toLowerCase()} · {list.length} matches</div>
            <h2 className="lb-section-title">
              {activeCategory !== 'ALL' ? activeCategory.toUpperCase() : "COMPETITIVE STAGES"}
            </h2>
          </div>
          <div className="lb-kicker-right">
            mode · {viewMode} · {list.length} events
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{ padding: '0 40px' }}>
            <Brackets tag="empty_state" accent="orange">
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: '14px', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  NO EVENTS FOUND MATCHING CRITERIA
                </p>
                <p style={{ color: 'var(--fg-mute)', fontSize: '12px', maxWidth: '420px', margin: '0 auto 20px' }}>
                  Try switching categories, clearing search terms, or view all scheduled activities.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('ALL');
                    setActiveCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="lb-btn-ghost"
                  style={{ fontSize: '11px', padding: '8px 16px' }}
                >
                  CLEAR ALL FILTERS
                </button>
              </div>
            </Brackets>
          </div>
        ) : viewMode === 'grid' ? (
          /* =====================================================================
             GRID VIEW (Adapted Reference Cyber Cards)
             ===================================================================== */
          <div 
            style={{ 
              padding: '0 40px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', 
              gap: '24px' 
            }}
          >
            {list.map((e, i) => {
              const accent = ROW_ACCENTS[i % ROW_ACCENTS.length];
              const isRegistered = registeredEventIds.has(e.id);
              const regStatus = getSaavanRegistrationStatus(e);
              const isExternalReg = Boolean(e.registrationUrl && e.status !== 'PAST' && regStatus.canRegister);

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-hover"
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(el) => {
                    el.currentTarget.style.borderColor = `var(--c-${accent})`;
                    el.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(el) => {
                    el.currentTarget.style.borderColor = 'var(--line-2)';
                    el.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Card Corner Accents */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTop: `2px solid var(--c-${accent})`, borderLeft: `2px solid var(--c-${accent})` }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderTop: `2px solid var(--c-${accent})`, borderRight: `2px solid var(--c-${accent})` }} />

                  <div>
                    {/* Artwork Container */}
                    <div style={{ height: '190px', position: 'relative', background: '#0a0a10', overflow: 'hidden' }}>
                      {e.imageUrl ? (
                        <img
                          src={processImageUrl(e.imageUrl, 'poster-card')}
                          alt={e.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                          onError={(ev) => {
                            (ev.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--c-${accent})`, fontFamily: '"Audiowide", sans-serif', fontSize: '32px' }}>
                          ◈
                        </div>
                      )}

                      {/* Gradient Vignette */}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-1) 5%, transparent 75%)' }} />

                      {/* Badges on artwork */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span 
                          className="lb-mono"
                          style={{
                            background: 'rgba(0, 0, 0, 0.85)',
                            color: `var(--c-${accent})`,
                            border: `1px solid var(--c-${accent})`,
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          #{e.eventType?.toLowerCase().replace(/\s+/g, '_') || 'event'}
                        </span>
                        <span 
                          className="lb-mono"
                          style={{
                            background: e.status === 'ONGOING' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.85)',
                            color: e.status === 'ONGOING' ? 'var(--c-cyan)' : e.status === 'UPCOMING' ? 'var(--c-green)' : 'var(--fg-mute)',
                            border: `1px solid ${e.status === 'ONGOING' ? 'var(--c-cyan)' : 'var(--line-2)'}`,
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          {e.status}
                        </span>
                      </div>

                      {isRegistered && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'var(--c-green)',
                            color: '#000',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle2 size={12} /> REGISTERED
                        </div>
                      )}
                    </div>

                    {/* Content Body */}
                    <div style={{ padding: '16px' }}>
                      {/* Telemetry line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fg-mute)', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
                        <span style={{ color: `var(--c-${accent})`, fontWeight: 700 }}>{formatLongDate(e.startDate)}</span>
                        <span>•</span>
                        <span>{formatEventTime(e.startDate)} IST</span>
                      </div>

                      <h3 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '18px', color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
                        {e.title}
                      </h3>

                      <p style={{
                        fontSize: '13px',
                        color: 'var(--fg-dim)',
                        lineHeight: 1.5,
                        margin: '0 0 16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {e.shortDescription || e.description?.slice(0, 140) || ''}
                      </p>

                      {/* Specs Box */}
                      <div style={{
                        background: 'var(--bg)',
                        border: '1px dashed var(--line-2)',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '11px',
                        marginBottom: '16px'
                      }}>
                        {e.prizes && (
                          <div style={{ color: 'var(--c-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trophy size={13} />
                            <span>PRIZE POOL: {e.prizes}</span>
                          </div>
                        )}
                        <div style={{ color: 'var(--fg-mute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          <span>VENUE: {e.venue || e.location || 'Online'}</span>
                        </div>
                        {e.teamRegistration && (
                          <div style={{ color: 'var(--c-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={13} />
                            <span>FORMAT: SQUADS ({e.teamMinSize}-{e.teamMaxSize} MEMBERS)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px' }}>
                    {isExternalReg ? (
                      <a
                        href={e.registrationUrl}
                        target="_self"
                        rel="noopener noreferrer"
                        className="lb-btn-primary"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          padding: '10px 14px',
                          fontSize: '11px'
                        }}
                      >
                        <span>SAAVAN REGISTRATION</span>
                        <ExternalLink size={13} />
                      </a>
                    ) : (
                      <button
                        disabled={isRegistered || e.status === 'PAST'}
                        onClick={() => void handleRegister(e)}
                        className="lb-btn-primary"
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          fontSize: '11px',
                          opacity: isRegistered || e.status === 'PAST' ? 0.6 : 1
                        }}
                      >
                        {e.status === 'PAST' ? 'EVENT ENDED' : isRegistered ? '✓ REGISTERED' : 'REGISTER / RSVP'}
                      </button>
                    )}

                    <Link
                      to={`/events/${e.slug}`}
                      className="lb-btn-ghost"
                      style={{
                        padding: '10px 14px',
                        fontSize: '11px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="View Full Details"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* =====================================================================
             LIST VIEW (Tactical Chronological Rows)
             ===================================================================== */
          <div className="events-list">
            {list.map((e, i) => {
              const accent = ROW_ACCENTS[i % ROW_ACCENTS.length];
              const isRegistered = registeredEventIds.has(e.id);
              const regStatus = getSaavanRegistrationStatus(e);
              const isExternalReg = Boolean(e.registrationUrl && e.status !== 'PAST' && regStatus.canRegister);

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/events/${e.slug}`} className={`event-row lb-c-${accent}`} style={{ textDecoration: 'none' }}>
                    <div>
                      <div className="event-row-day">{formatEventDay(e.startDate)}</div>
                      <div className="event-row-time">{formatEventTime(e.startDate)}</div>
                    </div>
                    <div className="event-row-divider" />
                    <div className="min-w-0">
                      <div className="event-row-tag">
                        #{e.eventType?.toLowerCase().replace(/\s+/g, '_') || 'event'}
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        {e.imageUrl && (
                          <img
                            src={processImageUrl(e.imageUrl, 'poster-card')}
                            alt={e.title}
                            loading="lazy"
                            className="w-16 h-16 shrink-0 rounded object-cover object-top"
                            onError={(ev) => {
                              (ev.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="event-row-title break-words">{e.title}</div>
                          <div className="event-row-desc">
                            {e.shortDescription || e.description?.slice(0, 140) || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="event-row-stats">
                      <div className="event-row-going">
                        {e.prizes ? `${e.prizes}` : ''} · {e.status.toLowerCase()}
                      </div>
                      <div className="event-row-host">venue · {e.venue || e.location || 'TBA'}</div>
                    </div>
                    {isExternalReg ? (
                      <a
                        href={e.registrationUrl}
                        target="_self"
                        rel="noopener noreferrer"
                        className="lb-btn-primary event-row-btn flex items-center justify-center gap-1"
                        style={{ opacity: isRegistered || e.status === 'PAST' ? 0.5 : 1, textDecoration: 'none' }}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Saavan
                      </a>
                    ) : (
                      <button
                        disabled={isRegistered || e.status === 'PAST'}
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          void handleRegister(e);
                        }}
                        className="lb-btn-primary event-row-btn"
                        style={{ opacity: isRegistered || e.status === 'PAST' ? 0.5 : 1 }}
                      >
                        {e.status === 'PAST' ? 'PAST' : isRegistered ? '✓' : 'RSVP'}
                      </button>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}
