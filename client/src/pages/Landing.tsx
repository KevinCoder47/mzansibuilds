import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, type Project } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import './Landing.css';

const STATS = [
  { label: 'Builders', value: '500+' },
  { label: 'Projects Shipped', value: '1.2K' },
  { label: 'Milestones Logged', value: '8.4K' },
  { label: 'Cities', value: '23' },
];

const HOW_STEPS = [
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Initialize Profile',
    desc: 'Create your developer account and link your repositories to start building in public.',
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: 'Launch Project',
    desc: 'Define your project scope, tech stack, and specific collaboration support required.',
    active: true,
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
    title: 'Build & Update',
    desc: 'Share milestones in the live feed and raise hands for peer collaboration.',
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
    title: 'Celebration Wall',
    desc: "Complete your build to be immortalized among the community's top developers.",
  },
];

export default function Landing() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    projectsApi
      .getAll()
      .then((data) => setProjects(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <main className="landing">
      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Build in Public.
            <br />
            <span className="hero-title-fade">Together.</span>
          </h1>
          <p className="hero-subtitle">
            Join Mzansi's developer collective. Document your build journey, collaborate with peers
            in real-time, and celebrate every milestone on the wall.
          </p>
          <div className="hero-ctas">
            <Link to="/register" className="btn-primary hero-btn-primary">
              Start Building →
            </Link>
            <Link to="/feed" className="btn-outline">
              View Live Feed
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-frame">
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80"
              alt="Developer community"
              className="hero-image"
            />
            <div className="hero-image-overlay" />
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────────────────── */}
      <section className="stats-bar">
        <div className="stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Live Developer Feed ──────────────────────────────────────────────── */}
      <section className="section feed-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">Live Developer Feed</h2>
            <p className="section-subtitle">
              Track real-time project updates, milestones, and collaboration requests from the
              Mzansi building community.
            </p>
          </div>

          {projects.length > 0 ? (
            <div className="feed-grid">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="feed-grid feed-demo-grid">
              {DEMO_CARDS.map((card, i) => (
                <div key={i} className="demo-card">
                  <div className="demo-card-img" style={{ background: card.bg }} />
                  <div className="demo-card-body">
                    <span className="project-category-tag">{card.cat}</span>
                    <h3 className="project-card-title">{card.title}</h3>
                    <p className="project-card-desc">{card.desc}</p>
                    <div className="project-card-footer">
                      <span className="project-stage-badge">STAGE: MVP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="section-cta">
            <Link to="/feed" className="btn-outline">
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Celebration Wall Preview ─────────────────────────────────────────── */}
      <section className="section celebration-preview">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">The Celebration Wall</h2>
            <p className="section-subtitle">
              Witness the shipping. A curated hall of fame for developers who turned ideas into
              reality under the Mzansi sun. Built in public, celebrated together.
            </p>
          </div>
          <div className="wall-preview-grid">
            {WALL_IMAGES.map((img, i) => (
              <div key={i} className="wall-preview-item" style={{ background: img.bg }}>
                <div className="wall-preview-overlay" />
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/celebration" className="btn-outline">
              Explore the Wall →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────────── */}
      <section className="section how-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">How MzansiBuilds Works</h2>
            <p className="section-subtitle">
              A structured journey for developers to ship software, gather feedback, and grow within
              a global community.
            </p>
          </div>
          <div className="how-steps">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className={`how-step ${step.active ? 'how-step--active' : ''}`}>
                <div className="how-step-icon">{step.icon}</div>
                {i < HOW_STEPS.length - 1 && <div className="how-step-connector" />}
                <h4 className="how-step-title">{step.title}</h4>
                <p className="how-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Community Pulse ──────────────────────────────────────────────────── */}
      <section className="section pulse-section">
        <div className="section-inner">
          <h2 className="pulse-title">
            COMMUNITY
            <br />
            PULSE
          </h2>
          <p className="section-subtitle">
            Quantifying the collective energy of developers building in public, collaborating on
            features, and celebrating major milestones.
          </p>
          <div className="pulse-grid">
            {PULSE_ITEMS.map((item, i) => (
              <div key={i} className="pulse-item">
                <span className="pulse-num">{item.num}</span>
                <span className="pulse-label">{item.label}</span>
                <div className="pulse-bar">
                  <div className="pulse-bar-fill" style={{ width: item.fill }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="section cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">
            Ready to ship? Join 500+
            <br />
            <span className="cta-title-fade">SA devs building the future.</span>
          </h2>
          <Link to="/register" className="cta-btn">
            <span>🚀</span>
            Start Your Build
          </Link>
        </div>
      </section>
    </main>
  );
}

const DEMO_CARDS = [
  {
    bg: 'linear-gradient(135deg, #0f0a2e 0%, #1a0050 100%)',
    cat: 'COLLABORATION TOOLS',
    title: 'Best Practices for Managing Project Stages on a Public Platform',
    desc: 'An open-source tool for developers to track their build journey with peers.',
  },
  {
    bg: 'linear-gradient(135deg, #0a2e0a 0%, #003300 100%)',
    cat: 'COMMUNITY BUILDING',
    title: 'Celebration Wall Recognising Public Builders',
    desc: 'A dedicated space honouring developers who shipped projects in the community.',
  },
  {
    bg: 'linear-gradient(135deg, #1a0a00 0%, #2e1500 100%)',
    cat: 'DEVELOPER PRODUCTIVITY',
    title: 'Tracking Milestones Effectively with MzansiBuilds',
    desc: 'Dashboard for quantifying your build journey and celebrating progress.',
  },
];

const WALL_IMAGES = [
  { bg: 'linear-gradient(135deg, #0a0a20 0%, #1a1040 100%)' },
  { bg: 'linear-gradient(135deg, #001520 0%, #002040 100%)' },
  { bg: 'linear-gradient(135deg, #100a00 0%, #201500 100%)' },
  { bg: 'linear-gradient(135deg, #0a2000 0%, #143000 100%)' },
  { bg: 'linear-gradient(135deg, #20000a 0%, #300010 100%)' },
  { bg: 'linear-gradient(135deg, #000a20 0%, #001030 100%)' },
];

const PULSE_ITEMS = [
  { num: '847', label: 'Active Builders This Week', fill: '84%' },
  { num: '2.3K', label: 'Collaboration Requests', fill: '71%' },
  { num: '156', label: 'Projects Shipped This Month', fill: '56%' },
  { num: '94%', label: 'Builder Satisfaction Rate', fill: '94%' },
];
