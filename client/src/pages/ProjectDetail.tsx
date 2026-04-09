import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  projectsApi,
  collabApi,
  type Project,
  type CollabRequest,
  type ProjectStage,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ProjectDetail.css';

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  building: 'Building',
  testing: 'Testing',
  launched: 'Launched',
  completed: 'Completed',
};

const STAGE_COLORS: Record<string, string> = {
  planning: 'stage--planning',
  building: 'stage--building',
  testing: 'stage--testing',
  launched: 'stage--launched',
  completed: 'stage--completed',
};

const EDITABLE_STAGES: { value: ProjectStage; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'building', label: 'Building' },
  { value: 'testing', label: 'Testing' },
  { value: 'launched', label: 'Launched' },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Global Page State (Fatal errors only)
  const [project, setProject] = useState<Project | null>(null);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Milestone form state
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState('');
  const [milestoneSuccess, setMilestoneSuccess] = useState('');

  // Edit project state
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStage, setEditStage] = useState<ProjectStage>('building');
  const [editSupportRequired, setEditSupportRequired] = useState('');
  const [editTechInput, setEditTechInput] = useState('');
  const [editTechStack, setEditTechStack] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Collab form state
  const [collabMessage, setCollabMessage] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState('');
  const [collabSuccess, setCollabSuccess] = useState('');

  // Project completion state
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const isOwner = user && project && user.id === project.developerId;

  useEffect(() => {
    if (!id) return;

    Promise.all([projectsApi.getById(id), collabApi.getForProject(id)])
      .then(([proj, collabs]) => {
        setProject(proj);
        setCollabRequests(collabs);
      })
      .catch(() => setError('Project not found or server unavailable.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Populate edit form whenever the user opens it
  const openEditForm = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDescription(project.description);
    setEditStage(project.stage);
    setEditSupportRequired(project.supportRequired ?? '');
    setEditTechStack([...project.techStack]);
    setEditTechInput('');
    setEditError('');
    setEditSuccess('');
    setShowEdit(true);
  };

  const addEditTech = () => {
    const t = editTechInput.trim();
    if (t && !editTechStack.includes(t)) {
      setEditTechStack((prev) => [...prev, t]);
    }
    setEditTechInput('');
  };

  const removeEditTech = (tech: string) => {
    setEditTechStack((prev) => prev.filter((t) => t !== tech));
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEditTech();
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setEditError('');
    setEditSuccess('');

    if (editTechStack.length === 0) {
      setEditError('Please add at least one technology.');
      return;
    }

    setEditLoading(true);
    try {
      const updated = await projectsApi.update(id, {
        title: editTitle,
        description: editDescription,
        stage: editStage,
        supportRequired: editSupportRequired,
        techStack: editTechStack,
      });
      setProject(updated);
      setEditSuccess('Project updated!');
      setTimeout(() => {
        setShowEdit(false);
        setEditSuccess('');
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to update project.';
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddMilestone = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !milestoneTitle.trim()) return;

    setMilestoneError('');
    setMilestoneSuccess('');
    setMilestoneLoading(true);

    try {
      const milestone = await projectsApi.addMilestone(id, milestoneTitle, milestoneDesc);
      setProject((prev) =>
        prev ? { ...prev, milestones: [...prev.milestones, milestone] } : prev,
      );
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneSuccess('Milestone logged!');
      setTimeout(() => setMilestoneSuccess(''), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to add milestone.';
      setMilestoneError(msg);
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setCompleteLoading(true);
    setCompleteError('');
    try {
      const updated = await projectsApi.complete(id);
      setProject(updated);
      setShowCompleteConfirm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to complete project.';
      setCompleteError(msg);
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleRaiseHand = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setCollabLoading(true);
    setCollabError('');
    setCollabSuccess('');

    try {
      const req = await collabApi.raise(id, collabMessage);
      setCollabRequests((prev) => [...prev, req]);
      setCollabMessage('');
      setCollabSuccess('Your hand is raised! The developer will see your request.');
      setTimeout(() => setCollabSuccess(''), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to send collaboration request.';
      setCollabError(msg);
    } finally {
      setCollabLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-state">
        <div className="detail-spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="detail-state detail-state--error">
        <p>{error || 'Project not found.'}</p>
        <Link to="/feed" className="btn-outline">
          ← Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <main className="detail-page">
      {/* ── Hero ── */}
      <div className="detail-hero">
        <div className="detail-hero-inner">
          <Link to="/feed" className="detail-back">
            ← Feed
          </Link>

          <div className="detail-hero-top">
            <div className="detail-tags">
              <span className={`detail-stage ${STAGE_COLORS[project.stage] ?? ''}`}>
                {STAGE_LABELS[project.stage] ?? project.stage}
              </span>
              {project.isCompleted && <span className="detail-shipped">🎉 Shipped</span>}
            </div>
            <h1 className="detail-title">{project.title}</h1>
            <p className="detail-description">{project.description}</p>
          </div>

          <div className="detail-stack">
            {project.techStack.map((t) => (
              <span key={t} className="detail-tech-pill">
                {t}
              </span>
            ))}
          </div>

          <p className="detail-meta">
            Posted{' '}
            {new Date(project.createdAt).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-main">
          {/* ── Milestones ── */}
          <section className="detail-section">
            <h2 className="detail-section-title">
              Milestones <span className="detail-section-count">{project.milestones.length}</span>
            </h2>

            {project.milestones.length === 0 ? (
              <p className="detail-empty">No milestones logged yet.</p>
            ) : (
              <ol className="milestone-list">
                {project.milestones.map((m, i) => (
                  <li key={m.id} className="milestone-item">
                    <div className="milestone-number">{i + 1}</div>
                    <div className="milestone-content">
                      <h3 className="milestone-title">{m.title}</h3>
                      {m.description && <p className="milestone-desc">{m.description}</p>}
                      <span className="milestone-date">
                        {new Date(m.achievedAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {isOwner && !project.isCompleted && (
              <form className="milestone-form" onSubmit={handleAddMilestone}>
                <h3 className="milestone-form-title">Log a milestone</h3>
                {milestoneError && <div className="form-error">{milestoneError}</div>}
                {milestoneSuccess && <div className="form-success">{milestoneSuccess}</div>}
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Milestone title"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Details of what was achieved..."
                    value={milestoneDesc}
                    onChange={(e) => setMilestoneDesc(e.target.value)}
                    rows={2}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={milestoneLoading}>
                  {milestoneLoading ? 'Logging...' : '+ Log Milestone'}
                </button>
              </form>
            )}
          </section>

          {/* ── Collaboration ── */}
          <section className="detail-section">
            <h2 className="detail-section-title">
              Collaboration Requests{' '}
              <span className="detail-section-count">{collabRequests.length}</span>
            </h2>

            {collabRequests.length === 0 ? (
              <p className="detail-empty">No collaboration requests yet.</p>
            ) : (
              <ul className="collab-list">
                {collabRequests.map((r) => (
                  <li key={r.id} className="collab-item">
                    <div className="collab-avatar">{r.username.charAt(0).toUpperCase()}</div>
                    <div className="collab-content">
                      <span className="collab-username">{r.username}</span>
                      <p className="collab-message">{r.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {user && !isOwner && (
              <form className="collab-form" onSubmit={handleRaiseHand}>
                <h3 className="milestone-form-title">✋ Raise your hand</h3>
                {collabError && <div className="form-error">{collabError}</div>}
                {collabSuccess && <div className="form-success">{collabSuccess}</div>}
                <div className="form-group">
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Tell the developer what you can contribute..."
                    value={collabMessage}
                    onChange={(e) => setCollabMessage(e.target.value)}
                    required
                    rows={2}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={collabLoading}>
                  {collabLoading ? 'Sending...' : 'Raise Hand'}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="detail-sidebar">
          {isOwner && !project.isCompleted && (
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Owner Actions</h3>

              {/* ── Edit Project ── */}
              <button
                className="btn-outline"
                style={{ width: '100%', marginBottom: '12px' }}
                onClick={openEditForm}
              >
                ✏️ Edit Project
              </button>

              {completeError && <div className="form-error">{completeError}</div>}
              {!showCompleteConfirm ? (
                <button className="btn-complete" onClick={() => setShowCompleteConfirm(true)}>
                  Mark as Complete 🎉
                </button>
              ) : (
                <div className="complete-confirm">
                  <p>Ready to ship? This cannot be undone.</p>
                  <div className="complete-confirm-btns">
                    <button
                      className="btn-primary"
                      onClick={handleComplete}
                      disabled={completeLoading}
                    >
                      {completeLoading ? 'Completing...' : 'Yes, ship it!'}
                    </button>
                    <button className="btn-outline" onClick={() => setShowCompleteConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {project.isCompleted && (
            <div className="sidebar-card sidebar-card--shipped">
              <p className="sidebar-shipped-icon">🎉</p>
              <h3 className="sidebar-card-title">Shipped!</h3>
              <Link to="/celebration" className="btn-primary">
                View Celebration Wall
              </Link>
            </div>
          )}

          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Stats</h3>
            <ul className="sidebar-stats">
              <li>
                <span>Milestones</span> <span>{project.milestones.length}</span>
              </li>
              <li>
                <span>Collaborators</span> <span>{collabRequests.length}</span>
              </li>
              <li>
                <span>Stage</span> <span>{STAGE_LABELS[project.stage] ?? project.stage}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ── Edit Project Modal ── */}
      {showEdit && (
        <div className="card-modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="card-modal card-modal--edit" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <span>✏️ Edit Project</span>
              <button className="card-modal-close" onClick={() => setShowEdit(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="edit-project-form">
              {editError && <div className="form-error">{editError}</div>}
              {editSuccess && <div className="form-success">{editSuccess}</div>}

              <div className="form-group">
                <label className="form-label">Project Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technologies *</label>
                <div className="tech-input-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add a technology..."
                    value={editTechInput}
                    onChange={(e) => setEditTechInput(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                  />
                  <button type="button" className="tech-add-btn" onClick={addEditTech}>
                    Add
                  </button>
                </div>
                <p className="form-hint">Press Enter or comma to add</p>
                {editTechStack.length > 0 && (
                  <div className="tech-tags">
                    {editTechStack.map((tech) => (
                      <span key={tech} className="tech-tag">
                        {tech}
                        <button type="button" onClick={() => removeEditTech(tech)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Current Stage *</label>
                <div className="stage-grid stage-grid--compact">
                  {EDITABLE_STAGES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`stage-option ${editStage === s.value ? 'active' : ''}`}
                      onClick={() => setEditStage(s.value)}
                    >
                      <span className="stage-option-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Support Required</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Looking for a UI/UX designer"
                  value={editSupportRequired}
                  onChange={(e) => setEditSupportRequired(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={() => setShowEdit(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
