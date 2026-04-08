import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, type Project, type ProjectStage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../components/ProjectCard';
import './Feed.css';

const STAGE_FILTERS: { label: string; value: ProjectStage | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'Building', value: 'building' },
  { label: 'Testing', value: 'testing' },
  { label: 'Launched', value: 'launched' },
  { label: 'Completed', value: 'completed' },
];

const POLL_INTERVAL = 30_000; // 30 seconds

export default function Feed() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ProjectStage | 'all'>('all');

  // Live feed state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [isLive, setIsLive] = useState(true);

  // Refs for change detection
  const projectIdsRef = useRef<Set<string>>(new Set());
  const milestonesHashRef = useRef<string>('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProjects = async (isInitial = false) => {
    try {
      const data = await projectsApi.getAll();

      // Create a "fingerprint" of the milestones to detect content updates
      const currentMilestonesHash = data.map((p) => p.milestones.length).join(',');

      if (isInitial) {
        // On first load, seed the known IDs and fingerprint
        projectIdsRef.current = new Set(data.map((p) => p.id));
        milestonesHashRef.current = currentMilestonesHash;
        setProjects(data);
        setNewCount(0);
      } else {
        // Detect genuinely new projects or content changes
        const added = data.filter((p) => !projectIdsRef.current.has(p.id));
        const milestonesChanged = currentMilestonesHash !== milestonesHashRef.current;

        // If something meaningful changed, update the UI and refs
        if (added.length > 0 || milestonesChanged) {
          projectIdsRef.current = new Set(data.map((p) => p.id));
          milestonesHashRef.current = currentMilestonesHash;
          setProjects(data);

          if (added.length > 0) {
            setNewCount((prev) => prev + added.length);
          }
        }
      }

      setLastUpdated(new Date());
      setIsLive(true);
      if (isInitial) {
        setError('');
        setLoading(false);
      }
    } catch (err) {
      if (isInitial) {
        setError('Failed to load projects. Is the server running?');
        setLoading(false);
      }
      setIsLive(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProjects(true);
  }, []);

  // Polling — runs every 30s
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      fetchProjects(false);
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Refresh when user returns to the tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchProjects(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.stage === filter);

  const formatLastUpdated = (d: Date) => {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <main className="feed-page">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-header-inner">
          <div className="feed-header-text">
            <h1 className="feed-title">
              Live Developer Feed
              <span
                className={`feed-live-dot ${isLive ? 'feed-live-dot--on' : 'feed-live-dot--off'}`}
                title={isLive ? 'Live' : 'Connection lost'}
              />
            </h1>
            <p className="feed-subtitle">
              Real-time project updates, milestones, and collaboration requests from the Mzansi
              building community.
            </p>
            {lastUpdated && (
              <p className="feed-last-updated">
                Updated {formatLastUpdated(lastUpdated)} · auto-refreshes every 30s
              </p>
            )}
          </div>
          {user && (
            <Link to="/projects/new" className="btn-primary">
              + Log My Build
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="feed-filters-bar">
        <div className="feed-filters-inner">
          <div className="feed-filters">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-btn ${filter === f.value ? 'active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="feed-filter-right">
            {newCount > 0 && (
              <button
                className="feed-new-badge"
                onClick={() => {
                  setNewCount(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ↑ {newCount} new project{newCount !== 1 ? 's' : ''}
              </button>
            )}
            <span className="feed-count">
              {filtered.length} project{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="feed-content">
        {loading && (
          <div className="feed-state">
            <div className="feed-spinner" />
            <p>Loading projects...</p>
          </div>
        )}

        {error && !loading && (
          <div className="feed-state feed-error">
            <p>{error}</p>
            {!user && (
              <p className="feed-state-hint">
                <Link to="/register">Join MzansiBuilds</Link> to be the first to log a project!
              </p>
            )}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="feed-state">
            <p className="feed-empty-icon">🔨</p>
            <p>
              {filter === 'all' ? 'No projects yet.' : `No projects in the "${filter}" stage yet.`}
            </p>
            {user && (
              <Link to="/projects/new" className="btn-primary" style={{ marginTop: 16 }}>
                Log your first build!
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="feed-grid-full">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="feed-join-banner">
          <div className="feed-join-inner">
            <p>Join MzansiBuilds to start logging your own builds and collaborating with peers.</p>
            <Link to="/register" className="btn-primary">
              Join the Movement
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
