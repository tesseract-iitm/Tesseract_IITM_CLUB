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

const CORE_WING_NAMES = [
  'Webops',
  'Graphic Design',
  'Video Editing',
  'Sponsorship & Research',
  'PR & Outreach',
  'Streamer & Caster',
  'Game-Dev',
  'Escape Wing',
];

const GAME_WING_NAMES = [
  'BGMI',
  'Free Fire',
  'Clash of Clans',
  'Casual Games',
  'Valorant',
  'CODM',
  'Minecraft',
  'Among Us',
];

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
          // Merge live database details while guaranteeing authoritative hierarchy and leadership roles
          const merged = TESSERACT_TEAM_MEMBERS.map((base) => {
            const dbMatch = data.find(
              (m) =>
                (m.slug && m.slug === base.slug) ||
                (m.name && m.name.toLowerCase() === base.name.toLowerCase()),
            );
            // Vaibhav Nargwani is strictly enforced as Co-Head of Webops
            if (base.name.toLowerCase().includes('vaibhav')) {
              return {
                ...base,
                tier: 'CO_HEAD' as const,
                role: 'Co-Head of Webops',
                department: 'Webops',
                team: 'Webops',
                wing: 'Core Wing' as const,
              };
            }
            return dbMatch
              ? {
                  ...dbMatch,
                  ...base, // Authoritative roster rules: role, tier, wing, department ALWAYS come from base
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

    // Ensure within each department: HEAD first, then CO_HEAD, then other members
    const result: Array<{ department: string; members: ExtendedTeamMember[] }> = [];
    map.forEach((members, department) => {
      const sorted = [...members].sort((a, b) => {
        const tierRank = (tier: TeamHierarchyTier) => {
          if (tier === 'HEAD') return 1;
          if (tier === 'CO_HEAD') return 2;
          return 3;
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

  // Department Leads helper for Organogram pills
  const getDeptLeads = (deptName: string) => {
    const mems = teamMembers.filter((m) => m.department === deptName);
    const explicitLeads = mems.filter((m) => m.tier === 'HEAD' || m.tier === 'CO_HEAD');
    if (explicitLeads.length > 0) return explicitLeads;
    return mems.slice(0, 1);
  };

  // Smooth scroll handler from Organogram nodes to department sections
  const handleScrollToDept = (deptName: string) => {
    setActiveWing('ALL');
    setActiveDepartment('All');
    setSearchQuery('');
    setTimeout(() => {
      const targetId = `dept-${deptName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleScrollToCouncil = () => {
    setActiveWing('ALL');
    setActiveDepartment('All');
    setSearchQuery('');
    setTimeout(() => {
      const element = document.getElementById('the-council');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

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

      {/* ======================================================== */}
      {/* 01. SOCIETY ORGANOGRAM & HIERARCHY TREE */}
      {/* Inspired by Sundarbans House hierarchy visual architecture */}
      {/* ======================================================== */}
      <section className="lb-modules" style={{ paddingTop: 0, paddingBottom: 32 }}>
        <div className="border border-[var(--line)] bg-[var(--surface-1)]/70 backdrop-blur-md p-6 sm:p-8 relative overflow-hidden">
          {/* Organogram Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 lb-mono text-xs uppercase text-[var(--c-yellow)] font-bold tracking-widest mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>01 // SOCIETY ORGANOGRAM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
              How The Society Fits Together
            </h2>
            <p className="text-xs sm:text-sm text-[var(--fg-mute)] mt-1.5 leading-relaxed">
              Tap any council officer or department below to jump directly to their roster and dossiers.
            </p>
          </div>

          {/* Tree Diagram Container */}
          <div className="flex flex-col items-center">
            {/* Top Root Node: The Council */}
            <button
              type="button"
              onClick={handleScrollToCouncil}
              className="group relative flex flex-col items-center p-4 px-6 sm:px-8 bg-[var(--surface-0)] border-2 border-[var(--c-yellow)]/70 hover:border-[var(--c-yellow)] rounded-2xl shadow-lg hover:shadow-[0_0_24px_rgba(201,160,46,0.3)] transition-all transform hover:-translate-y-0.5 cursor-pointer max-w-sm"
              title="Click to view The Council"
            >
              {/* Overlapping Avatar Stack of Council Officers */}
              <div className="flex items-center justify-center mb-2.5">
                {councilList.map((c, i) => (
                  <img
                    key={c.id || i}
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[var(--c-yellow)] object-cover -ml-2.5 first:ml-0 shadow-md transition-transform group-hover:scale-105"
                  />
                ))}
              </div>
              <span className="font-bold text-sm sm:text-base text-white group-hover:text-[var(--c-yellow)] uppercase tracking-wide transition-colors">
                The Council
              </span>
              <span className="text-[10px] lb-mono uppercase tracking-wider text-[var(--c-yellow)] font-semibold mt-0.5">
                Executive Governing Body · 4 Officers
              </span>
            </button>

            {/* Tree Branch: Vertical stem down from Council */}
            <div className="w-[2px] h-6 bg-[var(--line)]" />

            {/* Tree Branch: Horizontal Cross-Bar (visible on desktop) */}
            <div className="hidden md:block w-full max-w-3xl h-6 relative">
              {/* Center stem down to split */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[var(--line)]" />
              {/* Horizontal bar */}
              <div className="absolute top-3 left-[25%] right-[25%] h-[2px] bg-[var(--line)]" />
              {/* Left drop stem */}
              <div className="absolute top-3 left-[25%] w-[2px] h-3 bg-[var(--line)]" />
              {/* Right drop stem */}
              <div className="absolute top-3 right-[25%] w-[2px] h-3 bg-[var(--line)]" />
            </div>

            {/* Dual Column Layout: Core Wings (Left) vs Game Wing (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-2 md:mt-0">
              {/* Left Column: Core Wings / Departments */}
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-4 rounded-full border border-[var(--c-yellow)]/30 bg-[var(--c-yellow)]/10 text-[var(--c-yellow)] text-xs lb-mono font-bold uppercase tracking-wider">
                  <span>● CORE WINGS</span>
                </div>

                <div className="w-full space-y-2.5">
                  {CORE_WING_NAMES.map((deptName) => {
                    const leads = getDeptLeads(deptName);
                    return (
                      <button
                        key={deptName}
                        type="button"
                        onClick={() => handleScrollToDept(deptName)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] hover:border-[var(--c-yellow)] transition-all group shadow-sm text-left hover:scale-[1.01] cursor-pointer"
                        title={`View ${deptName}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--c-yellow)] group-hover:shadow-[0_0_8px_var(--c-yellow)] shrink-0 transition-all" />
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--c-yellow)] truncate transition-colors">
                            {deptName}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0">
                          {leads.map((l, idx) => (
                            <img
                              key={l.id || idx}
                              src={l.imageUrl}
                              alt={l.name}
                              title={l.name}
                              className="w-7 h-7 rounded-full border border-[var(--surface-0)] object-cover -ml-2 first:ml-0 shadow-sm"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Game Wing / Titles */}
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-4 rounded-full border border-[var(--c-green)]/30 bg-[var(--c-green)]/10 text-[var(--c-green)] text-xs lb-mono font-bold uppercase tracking-wider">
                  <span>● GAME WINGS</span>
                </div>

                <div className="w-full space-y-2.5">
                  {GAME_WING_NAMES.map((deptName) => {
                    const leads = getDeptLeads(deptName);
                    return (
                      <button
                        key={deptName}
                        type="button"
                        onClick={() => handleScrollToDept(deptName)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] hover:border-[var(--c-green)] transition-all group shadow-sm text-left hover:scale-[1.01] cursor-pointer"
                        title={`View ${deptName}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--c-green)] group-hover:shadow-[0_0_8px_var(--c-green)] shrink-0 transition-all" />
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--c-green)] truncate transition-colors">
                            {deptName}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0">
                          {leads.map((l, idx) => (
                            <img
                              key={l.id || idx}
                              src={l.imageUrl}
                              alt={l.name}
                              title={l.name}
                              className="w-7 h-7 rounded-full border border-[var(--surface-0)] object-cover -ml-2 first:ml-0 shadow-sm"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
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
          {/* Strict single-row 4-column layout on desktop */}
          {/* ======================================================== */}
          {showCouncil && (
            <section id="the-council" className="lb-modules scroll-mt-24" style={{ paddingBottom: 0 }}>
              <div className="lb-sect-head border-b border-[var(--c-yellow)]/40 pb-3 mb-6">
                <div>
                  <div className="lb-kicker text-[var(--c-yellow)] flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5" />
                    <span>// TIER_01 · EXECUTIVE.COUNCIL</span>
                  </div>
                  <h2 className="lb-section-title">THE COUNCIL</h2>
                </div>
                <div className="lb-kicker-right text-[var(--c-yellow)] font-bold">
                  GOVERNING BODY · 4 OFFICERS
                </div>
              </div>

              {/* Council Grid: 4 Prominent Spotlight Cards in the SAME ROW on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {councilList.map((councilMember, idx) => (
                  <MemberCard key={councilMember.id} member={councilMember} index={idx} />
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 2. DEPARTMENTS & WINGS */}
          {/* Row 1: Head & Co-Head */}
          {/* Row 2: Remaining Squad Members */}
          {/* ======================================================== */}
          {groupedDepartments.map(({ department, members }) => {
            const leaders = members.filter((m) => m.tier === 'HEAD' || m.tier === 'CO_HEAD');
            const otherMembers = members.filter((m) => m.tier !== 'HEAD' && m.tier !== 'CO_HEAD');
            const wingLabel = members[0]?.wing || 'Core Wing';
            const deptAnchorId = `dept-${department.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            return (
              <section key={department} id={deptAnchorId} className="lb-modules scroll-mt-24" style={{ paddingBottom: 0 }}>
                {/* Department Header */}
                <div className="lb-sect-head border-b border-[var(--line)] pb-3 mb-6">
                  <div>
                    <div className="lb-kicker">
                      // {wingLabel.toUpperCase()} · {members.length} MEMBERS
                    </div>
                    <h2 className="lb-section-title">{department.toUpperCase()}</h2>
                  </div>
                  <div className="lb-kicker-right">
                    {leaders.length > 0
                      ? `LEAD: ${leaders.map((l) => l.name).join(' & ')}`
                      : department}
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Row 1: Leadership (Head and Co-Head together) */}
                  {leaders.length > 0 && (
                    <div>
                      <div className="text-[9px] lb-mono uppercase tracking-wider text-[var(--c-yellow)] mb-1.5 flex items-center gap-1.5 font-bold">
                        <Crown className="h-3 w-3" />
                        <span>// LEADERSHIP (HEAD &amp; CO-HEAD)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {leaders.map((leader, lIdx) => (
                          <MemberCard key={leader.id} member={leader} index={lIdx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 2: Remaining Team Members */}
                  {otherMembers.length > 0 && (
                    <div>
                      {leaders.length > 0 && (
                        <div className="text-[9px] lb-mono uppercase tracking-wider text-[var(--fg-dim)] mb-1.5 flex items-center gap-1.5 font-bold">
                          <Users className="h-3 w-3" />
                          <span>// TEAM SQUAD</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {otherMembers.map((member, mIdx) => (
                          <MemberCard key={member.id} member={member} index={mIdx + leaders.length} />
                        ))}
                      </div>
                    </div>
                  )}
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
 * Council members retain full-size prominent cards with aspect-square and bio.
 * Department members use compact cards so two rows fit in one screen view.
 */
function MemberCard({ member, index }: { member: ExtendedTeamMember; index: number }) {
  const isCouncil = member.wing === 'Council';
  const isHead = member.tier === 'HEAD';
  const isCoHead = member.tier === 'CO_HEAD';

  // Determine accent color
  let accent: Accent;
  if (isCouncil) {
    accent = index === 0 ? 'yellow' : index === 1 ? 'purple' : 'blue';
  } else if (isHead) {
    accent = 'yellow';
  } else if (isCoHead) {
    accent = 'blue';
  } else {
    accent = TEAM_ACCENTS[index % TEAM_ACCENTS.length];
  }

  const slugOrId = member.slug || member.id;
  const initial = member.name?.charAt(0)?.toUpperCase() || '?';

  // Badge label: Only for Council, Head, and Co-Head (no volunteer badges)
  let badgeLabel: string | null = null;
  if (isCouncil) {
    badgeLabel = member.role.toUpperCase();
  } else if (isHead) {
    badgeLabel = 'HEAD';
  } else if (isCoHead) {
    badgeLabel = 'CO-HEAD';
  }

  // Kicker label: Clean labels, no 'VOLUNTEER' tags
  let kickerLabel: string | null = null;
  if (isCouncil) {
    kickerLabel = 'COUNCIL OFFICER';
  } else if (isHead) {
    kickerLabel = 'DEPARTMENT LEAD';
  } else if (isCoHead) {
    kickerLabel = 'CO-HEAD';
  } else {
    kickerLabel = `#${member.department.toUpperCase().replace(/\s+/g, '_')}`;
  }

  // COUNCIL CARDS: Original full-size prominent spotlight layout
  if (isCouncil) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
        className={`relative group border border-[var(--c-${accent})] shadow-[0_0_16px_rgba(201,160,46,0.15)] bg-[var(--surface-1)] hover:bg-[var(--surface-1)]/90 p-5 flex flex-col justify-between transition-all`}
      >
        <div>
          {/* Full-Size Aspect-Square Avatar (1:1 Orientation) */}
          <div
            className={`relative w-full aspect-square border-2 border-[var(--c-${accent})] bg-[var(--surface-0)] overflow-hidden mb-4`}
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

            {badgeLabel && (
              <div
                className={`absolute top-2 right-2 bg-black/85 border border-[var(--c-${accent})] text-[var(--c-${accent})] text-[10px] font-bold px-2 py-0.5 lb-mono`}
              >
                {badgeLabel}
              </div>
            )}
          </div>

          {/* Member Meta */}
          <div className="space-y-1">
            {kickerLabel && (
              <div
                className={`text-[10px] lb-mono uppercase text-[var(--c-${accent})] tracking-widest font-bold`}
              >
                {kickerLabel}
              </div>
            )}
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

  // DEPARTMENT CARDS: Compact 1:1 orientation layout so two rows fit in one viewport
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
      className={`relative group border ${
        isHead || isCoHead
          ? `border-[var(--c-${accent})] shadow-[0_0_12px_rgba(201,160,46,0.12)]`
          : 'border-[var(--line)] hover:border-white/30'
      } bg-[var(--surface-1)] hover:bg-[var(--surface-1)]/90 p-2.5 flex flex-col justify-between transition-all w-full max-w-[200px]`}
    >
      <div>
        {/* 1:1 Orientation Avatar */}
        <div
          className={`relative w-full aspect-square border-2 ${
            isHead || isCoHead ? `border-[var(--c-${accent})]` : 'border-[var(--line)]'
          } bg-[var(--surface-0)] overflow-hidden mb-2`}
        >
          {member.imageUrl ? (
            <img
              src={member.imageUrl}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center font-display text-3xl text-[var(--c-${accent})]`}
            >
              {initial}
            </div>
          )}

          {/* Tier Badge: Only shown if member has leadership role */}
          {badgeLabel && (
            <div
              className={`absolute top-1 right-1 bg-black/90 border border-[var(--c-${accent})] text-[var(--c-${accent})] text-[8.5px] font-bold px-1.5 py-0.5 lb-mono tracking-wider`}
            >
              {badgeLabel}
            </div>
          )}
        </div>

        {/* Member Meta */}
        <div className="space-y-0.5">
          {kickerLabel && (
            <div
              className={`text-[8.5px] lb-mono uppercase text-[var(--c-${accent})] tracking-widest font-bold truncate`}
            >
              {kickerLabel}
            </div>
          )}
          <h3
            className={`text-xs sm:text-sm font-bold text-white group-hover:text-[var(--c-${accent})] transition-colors truncate`}
            title={member.name}
          >
            {member.name}
          </h3>
          <p className="text-[10px] lb-mono text-[var(--fg-dim)] uppercase truncate">
            {member.role}
          </p>
        </div>
      </div>

      {/* Card Action Link */}
      <div className="mt-2 pt-1.5 border-t border-dashed border-[var(--line)] flex items-center justify-between">
        <span className="text-[8.5px] lb-mono text-[var(--fg-mute)]">
          #{member.department.toLowerCase().replace(/\s+/g, '_')}
        </span>
        <Link
          to={`/team/${slugOrId}`}
          className={`inline-flex items-center gap-1 lb-mono text-[10px] font-semibold text-[var(--c-${accent})] hover:underline`}
        >
          <span>DOSSIER</span>
          <ArrowRight className="h-2 w-2" />
        </Link>
      </div>
    </motion.div>
  );
}
