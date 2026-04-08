import { useEffect, useState } from 'react';
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

export default function Feed() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ProjectStage | 'all'>('all');

  useEffect(() => {
    projectsApi
      .getAll()
      .then(setProjects)
      .catch(() => setError('Failed to load projects. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.stage === filter);

  return (
    <main className="feed-page">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-header-inner">
          <div className="feed-header-text">
            <h1 className="feed-title">Live Developer Feed</h1>
            <p className="feed-subtitle">
              Real-time project updates, milestones, and collaboration requests from the Mzansi
              building community.
            </p>
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
          <span className="feed-count">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
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
