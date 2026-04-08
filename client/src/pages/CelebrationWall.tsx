import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, type Project } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CelebrationWall.css';

type FilterCategory = 'ALL' | 'FULL STACK' | 'MOBILE' | 'AI/ML' | 'DEVTOOLS';

const FILTERS: FilterCategory[] = ['ALL', 'FULL STACK', 'MOBILE', 'AI/ML', 'DEVTOOLS'];

function getCategoryFromStack(stack: string[]): FilterCategory {
  const n = stack.map((s) => s.toLowerCase());
  if (n.some((s) => ['react native', 'flutter', 'swift', 'kotlin', 'expo'].includes(s)))
    return 'MOBILE';
  if (n.some((s) => ['tensorflow', 'pytorch', 'ml', 'ai', 'langchain', 'openai'].includes(s)))
    return 'AI/ML';
  if (n.some((s) => ['vscode', 'cli', 'extension', 'plugin', 'devtools'].includes(s)))
    return 'DEVTOOLS';
  return 'FULL STACK';
}

const GRADIENTS = [
  'linear-gradient(135deg, #0a0a24 0%, #1a1050 100%)',
  'linear-gradient(135deg, #001520 0%, #003040 100%)',
  'linear-gradient(135deg, #200a00 0%, #401500 100%)',
  'linear-gradient(135deg, #0a2000 0%, #143500 100%)',
  'linear-gradient(135deg, #200010 0%, #380020 100%)',
  'linear-gradient(135deg, #00101a 0%, #001830 100%)',
];

function getGradient(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

function WallCard({ project }: { project: Project }) {
  const category = getCategoryFromStack(project.techStack);
  const gradient = getGradient(project.id);

  return (
    <div className="wall-card">
      <div className="wall-card-image" style={{ background: gradient }}>
        <div className="wall-card-image-content">
          {project.techStack.slice(0, 3).map((tech) => (
            <span key={tech} className="wall-tech-pill">
              {tech}
            </span>
          ))}
        </div>
        <div className="wall-shipped-badge">
          <span>✓</span> Shipped
        </div>
      </div>
      <div className="wall-card-body">
        <span className="wall-category-tag">{category}</span>
        <h3 className="wall-card-title">{project.title}</h3>
        <p className="wall-card-desc">{project.description}</p>
        <div className="wall-card-footer">
          <span className="wall-milestones-count">
            {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''}
          </span>
          <span className="wall-date">
            {new Date(project.createdAt).toLocaleDateString('en-ZA', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CelebrationWall() {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');

  useEffect(() => {
    projectsApi
      .getAll()
      .then((data) => {
        // Show completed projects; if none, show all (good for dev/demo)
        const completed = data.filter((p) => p.isCompleted);
        setAllProjects(completed.length > 0 ? completed : data);
      })
      .catch(() => setAllProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeFilter === 'ALL'
      ? allProjects
      : allProjects.filter((p) => getCategoryFromStack(p.techStack) === activeFilter);

  return (
    <main className="wall-page">
      {/* Header */}
      <section className="wall-header">
        <div className="wall-header-inner">
          <h1 className="wall-title">The Celebration Wall</h1>
          <p className="wall-subtitle">
            Witness the shipping. A curated hall of fame for developers who turned ideas into
            reality under the Mzansi sun. Built in public, celebrated together.
          </p>

          {/* Filters */}
          <div className="wall-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`wall-filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="wall-grid-section">
        <div className="wall-grid-inner">
          {loading && (
            <div className="wall-state">
              <div className="wall-spinner" />
              <p>Loading the wall...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="wall-state">
              <p className="wall-empty-icon">🏗️</p>
              <p className="wall-empty-title">Nothing here yet</p>
              <p className="wall-empty-sub">
                {activeFilter === 'ALL'
                  ? 'Complete a project to be the first on the wall!'
                  : `No ${activeFilter} projects shipped yet.`}
              </p>
              {user && (
                <Link to="/projects/new" className="btn-primary" style={{ marginTop: 20 }}>
                  Start Building
                </Link>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="wall-grid">
              {filtered.map((p) => (
                <WallCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats banner */}
      {!loading && allProjects.length > 0 && (
        <section className="wall-stats">
          <div className="wall-stats-inner">
            <div className="wall-stat">
              <span className="wall-stat-num">{allProjects.length}</span>
              <span className="wall-stat-label">Projects on the wall</span>
            </div>
            <div className="wall-stat-divider" />
            <div className="wall-stat">
              <span className="wall-stat-num">
                {allProjects.reduce((sum, p) => sum + p.milestones.length, 0)}
              </span>
              <span className="wall-stat-label">Milestones achieved</span>
            </div>
            <div className="wall-stat-divider" />
            <div className="wall-stat">
              <span className="wall-stat-num">
                {[...new Set(allProjects.flatMap((p) => p.techStack))].length}
              </span>
              <span className="wall-stat-label">Technologies used</span>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {!user && (
        <section className="wall-cta">
          <div className="wall-cta-inner">
            <h2 className="wall-cta-title">Ready to get on the wall?</h2>
            <p className="wall-cta-sub">
              Join thousands of SA developers building in public. Ship your project and earn your
              place here.
            </p>
            <div className="wall-cta-btns">
              <Link to="/register" className="btn-primary">
                Join the Movement
              </Link>
              <Link to="/feed" className="btn-outline">
                Explore the Feed
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
