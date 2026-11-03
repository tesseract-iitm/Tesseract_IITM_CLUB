import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/ui/schema';
import { motion } from 'framer-motion';
import {
  Loader2,
  Search,
  X,
  Crown,
  Shield,
  Sparkles,
  Users,
  Gamepad2,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Brackets, Pill, type Accent } from '@/components/tesseract';
import {
  TESSERACT_TEAM_MEMBERS,
  CORE_WING_MEMBERS,
  GAME_WING_MEMBERS,
  type ExtendedTeamMember,
  type TeamHierarchyTier,
} from '@/data/teamData';

const TEAM_ACCENTS: Accent[] = ['yellow', 'green', 'blue', 'purple', 'orange', 'red'];

type WingCategory = 'ALL' | 'COUNCIL' | 'CORE_WING' | 'GAME_WING';

export default function TeamPage() {
  const [activeWing, setActiveWing] = useState<WingCategory>('ALL');
  const [activeDepartment, setActiveDepartment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<ExtendedTeamMember[]>(TESSERACT_TEAM_MEMBERS);
  const [loading, setLoading] = useState(true);

  // Load team roster, enriching with any database updates if available
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const data = await api.getTeam(undefined, { compact: false });
        if (Array.isArray(data) && data.length > 0) {
          // Merge any live database additions or edits while preserving authoritative PDF roster & hierarchy
          const merged = TESSERACT_TEAM_MEMBERS.map((base) => {
            const dbMatch = data.find(
              (m) =>
                (m.slug && m.slug === base.slug) ||
                (m.name && m.name.toLowerCase() === base.name.toLowerCase()),
            );
            return dbMatch
              ? {
                  ...base,
                  ...dbMatch,
                  tier: base.tier,
                  wing: base.wing,
                  department: base.department,
                }
              : base;
          });
          setTeamMembers(merged);
        } else {
          setTeamMembers(TESSERACT_TEAM_MEMBERS);
        }
      } catch {
        // Fallback on verified static roster
        setTeamMembers(TESSERACT_TEAM_MEMBERS);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeam();
  }, []);

  // Council members
  const councilList = useMemo(() => {
    return teamMembers.filter((m) => m.tier === 'COUNCIL' || m.team.toLowerCase() === 'council');
  }, [teamMembers]);

  // Unique departments for filter pills
  const departments = useMemo(() => {
    const set = new Set<string>();
    teamMembers.forEach((m) => {
      if (m.department && m.department !== 'Council') {
        set.add(m.department);
      }
    });
    return ['All', ...Array.from(set)];
  }, [teamMembers]);

  // Filtered members based on wing, department, and search query
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      // Wing filter
      if (activeWing === 'COUNCIL' && m.wing !== 'Council') return false;
      if (activeWing === 'CORE_WING' && m.wing !== 'Core Wing') return false;
      if (activeWing === 'GAME_WING' && m.wing !== 'Game Wing') return false;

      // Department filter
      if (activeDepartment !== 'All' && m.department !== activeDepartment) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = m.name?.toLowerCase().includes(q);
      const roleMatch = m.role?.toLowerCase().includes(q);
      const deptMatch = m.department?.toLowerCase().includes(q);
      const teamMatch = m.team?.toLowerCase().includes(q);
      const bioMatch = m.bio?.toLowerCase().includes(q);
      const expertiseMatch = m.expertise?.toLowerCase().includes(q);
      return Boolean(nameMatch || roleMatch || deptMatch || teamMatch || bioMatch || expertiseMatch);
    });
  }, [teamMembers, activeWing, activeDepartment, searchQuery]);

  // Group filtered non-council members by department
  const groupedDepartments = useMemo(() => {
    const map = new Map<string, ExtendedTeamMember[]>();
    filteredMembers.forEach((m) => {
      if (m.wing === 'Council') return; // Council is rendered in top priority section
      const dept = m.department || m.team;
      if (!map.has(dept)) {
        map.set(dept, []);
      }
      map.get(dept)!.push(m);
    });

    // Ensure within each department: HEAD first, then VOLUNTEERS
    const result: Array<{ department: string; members: ExtendedTeamMember[] }> = [];
    map.forEach((members, department) => {
      const sorted = [...members].sort((a, b) => {
        const tierRank = (tier: TeamHierarchyTier) => {
          if (tier === 'HEAD') return 1;
          return 2;
        };
        return tierRank(a.tier) - tierRank(b.tier) || (a.order ?? 99) - (b.order ?? 99);
      });
      result.push({ department, members: sorted });
    });
    return result;
  }, [filteredMembers]);

  // Council search match check
  const showCouncil = useMemo(() => {
    if (activeDepartment !== 'All') return false;
    if (activeWing === 'CORE_WING' || activeWing === 'GAME_WING') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return councilList.some(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.bio?.toLowerCase().includes(q),
    );
  }, [activeDepartment, activeWing, searchQuery, councilList]);

  return (
    <Layout>
      <SEO
        title="Team Roster & Council — Tesseract Esports Society"
        description="Meet the official team behind Tesseract — Executive Council, Core Department Leads, and Game Wing Coordinators at IIT Madras BS."
        url="/team"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
          { name: 'Team', url: 'https://tesseract.iitm.ac.in/team' },
        ]}
      />

      {/* Hero Header */}
      <section className="lb-hero" style={{ paddingBottom: 28 }}>
        <div className="lb-hero-left" style={{ minWidth: 0, maxWidth: 860 }}>
          <div className="inline-flex items-center gap-2 lb-mono text-xs uppercase px-2.5 py-1 mb-4 border border-[var(--c-yellow-soft)] text-[var(--c-yellow)] bg-[rgba(201,160,46,0.08)]">
            <Crown className="h-3.5 w-3.5 text-[var(--c-yellow)]" />
            <span>// THE.SQUADRON · HIERARCHY &amp; ROSTER</span>
          </div>

          <h1 className="lb-headline">
            <span className="lb-h-line">OFFICIAL</span>
            <span className="lb-h-line lb-h-accent">TEAM DIRECTORY.</span>
          </h1>

          <p className="lb-sub" style={{ maxWidth: 700, marginTop: 12 }}>
            The autonomous student-led body of Tesseract Esports Society at IIT Madras BS — governing
            championship tournaments, developing web applications, and directing competitive game wings.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap gap-2.5 mt-6 items-center">
            <div className="inline-flex items-center gap-2 lb-mono text-xs px-3 py-1.5 border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-dim)]">
              <Shield className="h-3.5 w-3.5 text-[var(--c-yellow)]" />
              <span>COUNCIL: 4 OFFICERS</span>
            </div>
            <div className="inline-flex items-center gap-2 lb-mono text-xs px-3 py-1.5 border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-dim)]">
              <Cpu className="h-3.5 w-3.5 text-[var(--c-blue)]" />
              <span>CORE WINGS: 8 TEAMS</span>
            </div>
            <div className="inline-flex items-center gap-2 lb-mono text-xs px-3 py-1.5 border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-dim)]">
              <Gamepad2 className="h-3.5 w-3.5 text-[var(--c-green)]" />
              <span>GAME WING: 8 TITLES</span>
            </div>
            <div className="inline-flex items-center gap-2 lb-mono text-xs px-3 py-1.5 border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-dim)]">
              <Users className="h-3.5 w-3.5 text-[var(--fg)]" />
              <span>TOTAL CREW: {teamMembers.length} MEMBERS</span>
            </div>
          </div>
        </div>

        <div className="lb-hero-right hidden lg:flex items-center justify-center" style={{ minHeight: 220 }}>
          <div className="p-5 border border-[var(--line)] bg-[var(--surface-1)]/60 backdrop-blur-sm max-w-xs text-left">
            <div className="lb-mono text-[11px] text-[var(--c-yellow)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>// OPERATIONAL STRUCTURE</span>
            </div>
            <p className="text-xs text-[var(--fg-mute)] leading-relaxed">
              Headed by the Executive Council (Secretary, Deputy Secretary &amp; Coordinators), each wing operates with dedicated Heads and Core Volunteers.
            </p>
            <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between text-[11px] lb-mono text-[var(--fg-dim)]">
              <span>IIT MADRAS BS</span>
              <span className="text-[var(--c-green)]">● VERIFIED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Controls Bar: Category Wings, Search & Department Pills */}
      <section className="lb-modules" style={{ paddingTop: 0, paddingBottom: 24 }}>
        <div className="p-4 border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md space-y-4">
          {/* Top Row: Wing Selector Tabs + Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Wing Category Tabs */}
            <div className="inline-flex p-1 bg-[var(--surface-0)] border border-[var(--line)] overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveWing('ALL');
                  setActiveDepartment('All');
                }}
                className={`px-3 py-1.5 lb-mono text-xs font-semibold uppercase transition-colors shrink-0 ${
                  activeWing === 'ALL'
                    ? 'bg-[var(--c-yellow)] text-black'
                    : 'text-[var(--fg-dim)] hover:text-white'
                }`}
              >
                All Wings ({teamMembers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWing('COUNCIL');
                  setActiveDepartment('All');
                }}
                className={`px-3 py-1.5 lb-mono text-xs font-semibold uppercase transition-colors shrink-0 ${
                  activeWing === 'COUNCIL'
                    ? 'bg-[var(--c-yellow)] text-black'
                    : 'text-[var(--fg-dim)] hover:text-white'
                }`}
              >
                Council ({councilList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWing('CORE_WING');
                  setActiveDepartment('All');
                }}
                className={`px-3 py-1.5 lb-mono text-xs font-semibold uppercase transition-colors shrink-0 ${
                  activeWing === 'CORE_WING'
                    ? 'bg-[var(--c-yellow)] text-black'
                    : 'text-[var(--fg-dim)] hover:text-white'
                }`}
              >
                Core Wings ({CORE_WING_MEMBERS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWing('GAME_WING');
                  setActiveDepartment('All');
                }}
                className={`px-3 py-1.5 lb-mono text-xs font-semibold uppercase transition-colors shrink-0 ${
                  activeWing === 'GAME_WING'
                    ? 'bg-[var(--c-yellow)] text-black'
                    : 'text-[var(--fg-dim)] hover:text-white'
                }`}
              >
                Game Wing ({GAME_WING_MEMBERS.length})
              </button>
            </div>

            {/* Search Input Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-mute)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, role, or game..."
                className="w-full pl-10 pr-9 py-2 bg-[var(--surface-0)] border border-[var(--line)] text-sm text-[var(--fg)] placeholder:text-[var(--fg-mute)] focus:outline-none focus:border-[var(--c-yellow)] transition-colors lb-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-mute)] hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Department Filter Pills (when not viewing Council specifically) */}
          {activeWing !== 'COUNCIL' && departments.length > 2 && (
            <div className="pt-3 border-t border-[var(--line)]/50">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] lb-mono uppercase text-[var(--fg-mute)]">
                <span>FILTER DEPARTMENT:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {departments.map((dept, i) => {
                  const count =
                    dept === 'All'
                      ? teamMembers.filter((m) => m.wing !== 'Council').length
                      : teamMembers.filter((m) => m.department === dept).length;
                  const accent = TEAM_ACCENTS[i % TEAM_ACCENTS.length];

                  return (
                    <Pill
                      key={dept}
                      active={activeDepartment === dept}
                      accent={accent}
                      onClick={() => setActiveDepartment(dept)}
                    >
                      <span className="uppercase">{dept}</span>
                      <span
                        className={`ml-1.5 px-1.5 py-0.2 text-[10px] rounded-xs ${
                          activeDepartment === dept
                            ? 'bg-white/20'
                            : 'bg-black/40 text-[var(--fg-mute)]'
                        }`}
                      >
                        {count}
                      </span>
                    </Pill>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--c-yellow)' }} />
          <span className="lb-mono text-xs uppercase text-[var(--fg-dim)] tracking-wider">
            Loading society roster...
          </span>
        </div>
      ) : filteredMembers.length === 0 && !showCouncil ? (
        <section className="lb-modules">
          <div className="lb-module-grid">
            <Brackets tag="no_results" accent="yellow">
              <div className="text-center py-12 px-4">
                <p className="lb-mono text-sm uppercase text-[var(--fg-dim)] tracking-widest mb-2">
                  No members found matching &quot;{searchQuery || activeDepartment}&quot;
                </p>
                <p className="text-xs text-[var(--fg-mute)] mb-6 max-w-sm mx-auto">
                  Try adjusting your search terms or clearing the current department filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveWing('ALL');
                    setActiveDepartment('All');
                  }}
                  className="lb-btn-primary"
                >
                  CLEAR ALL FILTERS
                </button>
              </div>
            </Brackets>
          </div>
        </section>
      ) : (
        <div className="space-y-14">
          {/* ======================================================== */}
          {/* 1. COUNCIL SECTION (TOP HIERARCHY LEVEL) */}
          {/* ======================================================== */}
          {showCouncil && (
            <section className="lb-modules" style={{ paddingBottom: 0 }}>
              <div className="lb-sect-head border-b border-[var(--c-yellow)]/40 pb-3 mb-6">
                <div>
                  <div className="lb-kicker text-[var(--c-yellow)] flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5" />
                    <span>// TIER_01 · EXECUTIVE.COUNCIL</span>
                  </div>
                  <h2 className="lb-section-title">THE COUNCIL</h2>
                </div>
                <div className="lb-kicker-right text-[var(--c-yellow)] font-bold">
                  GOVERNING BODY
                </div>
              </div>

              {/* Council Grid: 4 Prominent Spotlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {councilList.map((councilMember, idx) => (
                  <MemberCard key={councilMember.id} member={councilMember} index={idx} />
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 2. DEPARTMENTS & WINGS */}
          {/* ======================================================== */}
          {groupedDepartments.map(({ department, members }) => {
            const headMember = members.find((m) => m.tier === 'HEAD');
            const wingLabel = members[0]?.wing || 'Core Wing';

            return (
              <section key={department} className="lb-modules" style={{ paddingBottom: 0 }}>
                {/* Department Header */}
                <div className="lb-sect-head border-b border-[var(--line)] pb-3 mb-6">
                  <div>
                    <div className="lb-kicker">
                      // {wingLabel.toUpperCase()} · {members.length} MEMBERS
                    </div>
                    <h2 className="lb-section-title">{department.toUpperCase()}</h2>
                  </div>
                  <div className="lb-kicker-right">
                    {headMember?.name ? `LEAD: ${headMember.name}` : department}
                  </div>
                </div>

                {/* Unified Council-Style Grid for All Department Members */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {members.map((member, idx) => (
                    <MemberCard key={member.id} member={member} index={idx} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

/**
 * Unified Council-Style Member Card
 * Renders Council officers, Department Leads, and Team Volunteers with a cohesive layout
 */
function MemberCard({ member, index }: { member: ExtendedTeamMember; index: number }) {
  const isCouncil = member.wing === 'Council';
  const isHead = member.tier === 'HEAD';

  // Determine accent color
  let accent: Accent;
  if (isCouncil) {
    accent = index === 0 ? 'yellow' : index === 1 ? 'purple' : 'blue';
  } else if (isHead) {
    accent = 'yellow';
  } else {
    accent = TEAM_ACCENTS[index % TEAM_ACCENTS.length];
  }

  const slugOrId = member.slug || member.id;
  const initial = member.name?.charAt(0)?.toUpperCase() || '?';

  // Badge label
  const badgeLabel = isCouncil
    ? member.role.toUpperCase()
    : isHead
    ? 'HEAD'
    : 'VOLUNTEER';

  // Kicker label
  const kickerLabel = isCouncil
    ? 'COUNCIL OFFICER'
    : isHead
    ? 'DEPARTMENT LEAD'
    : 'TEAM MEMBER';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
      className={`relative group border ${
        isHead || isCouncil
          ? `border-[var(--c-${accent})]`
          : 'border-[var(--line)] hover:border-white/30'
      } bg-[var(--surface-1)] hover:bg-[var(--surface-1)]/90 p-5 flex flex-col justify-between transition-all`}
    >
      <div>
        {/* Avatar with Cyber Brackets */}
        <div
          className={`relative w-full aspect-square border-2 ${
            isHead || isCouncil ? `border-[var(--c-${accent})]` : 'border-[var(--line)]'
          } bg-[var(--surface-0)] overflow-hidden mb-4`}
        >
          {member.imageUrl ? (
            <img
              src={member.imageUrl}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center font-display text-5xl text-[var(--c-${accent})]`}
            >
              {initial}
            </div>
          )}

          {/* Tier Badge */}
          <div
            className={`absolute top-2 right-2 ${
              isHead || isCouncil
                ? `bg-black/85 border border-[var(--c-${accent})] text-[var(--c-${accent})]`
                : 'bg-black/80 border border-white/20 text-white'
            } text-[10px] font-bold px-2 py-0.5 lb-mono`}
          >
            {badgeLabel}
          </div>
        </div>

        {/* Member Meta */}
        <div className="space-y-1">
          <div
            className={`text-[10px] lb-mono uppercase text-[var(--c-${accent})] tracking-widest font-bold`}
          >
            {kickerLabel}
          </div>
          <h3
            className={`text-lg font-bold text-white group-hover:text-[var(--c-${accent})] transition-colors truncate`}
          >
            {member.name}
          </h3>
          <p className="text-xs lb-mono text-[var(--fg-dim)] uppercase">
            {member.role}
          </p>
          {member.bio && (
            <p className="text-xs text-[var(--fg-mute)] line-clamp-2 leading-relaxed pt-1.5">
              {member.bio}
            </p>
          )}
        </div>
      </div>

      {/* Card Action Link */}
      <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between">
        <span className="text-[10px] lb-mono text-[var(--fg-mute)]">
          #{member.department.toLowerCase().replace(/\s+/g, '_')}
        </span>
        <Link
          to={`/team/${slugOrId}`}
          className={`inline-flex items-center gap-1 lb-mono text-xs font-semibold text-[var(--c-${accent})] hover:underline`}
        >
          <span>DOSSIER</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}
