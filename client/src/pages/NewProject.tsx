import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { projectsApi, type ProjectStage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './NewProject.css';

const STAGES: { value: ProjectStage; label: string; desc: string }[] = [
  { value: 'planning', label: 'Planning', desc: 'Defining scope and requirements' },
  { value: 'building', label: 'Building', desc: 'Actively writing code' },
  { value: 'testing', label: 'Testing', desc: 'QA and bug fixing' },
  { value: 'launched', label: 'Launched', desc: 'Live and in production' },
];

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [stage, setStage] = useState<ProjectStage>('building');
  const [supportRequired, setSupportRequired] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="new-project-guard">
        <h2>You need to be logged in</h2>
        <p>
          Please <Link to="/login">sign in</Link> or <Link to="/register">join MzansiBuilds</Link>{' '}
          to log a project.
        </p>
      </div>
    );
  }

  const addTech = () => {
    const t = techInput.trim();
    if (t && !techStack.includes(t)) {
      setTechStack((prev) => [...prev, t]);
    }
    setTechInput('');
  };

  const removeTech = (tech: string) => {
    setTechStack((prev) => prev.filter((t) => t !== tech));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTech();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (techStack.length === 0) {
      setError('Please add at least one technology to your stack.');
      return;
    }

    setLoading(true);
    try {
      await projectsApi.create({ title, description, techStack, stage, supportRequired });
      navigate('/feed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create project. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="new-project-page">
      <div className="new-project-inner">
        {/* Sidebar info */}
        <div className="new-project-sidebar">
          <h1 className="new-project-heading">Log Your Build</h1>
          <p className="new-project-intro">
            Document your project publicly so the Mzansi community can follow along, collaborate,
            and celebrate your milestones.
          </p>
          <div className="sidebar-tips">
            <h4>Tips for a great build log</h4>
            <ul>
              <li>Be specific about what you're building</li>
              <li>Mention the tech so collaborators can find you</li>
              <li>State what support you're looking for</li>
              <li>Update your stage as you progress</li>
            </ul>
          </div>
        </div>

        {/* Form */}
        <form className="new-project-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Project Title *
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="e.g. Open Source SA Jobs Board"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              className="form-input form-textarea"
              placeholder="What are you building? What problem does it solve? Who is it for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={4}
            />
          </div>

          {/* Tech Stack */}
          <div className="form-group">
            <label className="form-label">Technologies *</label>
            <div className="tech-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="e.g. React, Node.js, PostgreSQL"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="button" className="tech-add-btn" onClick={addTech}>
                Add
              </button>
            </div>
            <p className="form-hint">Press Enter or comma to add each item</p>
            {techStack.length > 0 && (
              <div className="tech-tags">
                {techStack.map((tech) => (
                  <span key={tech} className="tech-tag">
                    {tech}
                    <button type="button" onClick={() => removeTech(tech)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stage */}
          <div className="form-group">
            <label className="form-label">Current Stage *</label>
            <div className="stage-grid">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`stage-option ${stage === s.value ? 'active' : ''}`}
                  onClick={() => setStage(s.value)}
                >
                  <span className="stage-option-label">{s.label}</span>
                  <span className="stage-option-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="support">
              Support Required
            </label>
            <input
              id="support"
              type="text"
              className="form-input"
              placeholder="e.g. Looking for a UI/UX designer and backend dev"
              value={supportRequired}
              onChange={(e) => setSupportRequired(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={() => navigate('/feed')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging build...' : 'Log My Build →'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
