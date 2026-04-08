import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Comment } from '../services/api';
import { collabApi, commentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ProjectCard.css';

interface Props {
  project: Project;
  variant?: 'feed' | 'wall';
}

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  building: 'Building',
  testing: 'Testing',
  launched: 'Launched',
  completed: 'Completed',
};

const GRADIENT_PALETTES = [
  'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)',
  'linear-gradient(135deg, #001a0a 0%, #0a2e1a 100%)',
  'linear-gradient(135deg, #1a0a00 0%, #2e1a0a 100%)',
  'linear-gradient(135deg, #00101a 0%, #001a2e 100%)',
  'linear-gradient(135deg, #0a001a 0%, #1a002e 100%)',
];

function getGradient(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length];
}

function getCategoryFromStack(stack: string[]): string {
  const normalized = stack.map((s) => s.toLowerCase());
  if (normalized.some((s) => ['react native', 'flutter', 'swift', 'kotlin', 'expo'].includes(s)))
    return 'MOBILE';
  if (
    normalized.some((s) => ['tensorflow', 'pytorch', 'ml', 'ai', 'langchain', 'openai'].includes(s))
  )
    return 'AI/ML';
  if (normalized.some((s) => ['vscode', 'cli', 'extension', 'plugin', 'devtools'].includes(s)))
    return 'DEVTOOLS';
  return 'FULL STACK';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProjectCard({ project, variant = 'feed' }: Props) {
  const { user } = useAuth();
  const category = getCategoryFromStack(project.techStack);
  const gradient = getGradient(project.id);

  // ── Raise Hand modal ──
  const [showCollab, setShowCollab] = useState(false);
  const [collabMsg, setCollabMsg] = useState('');
  const [collabSending, setCollabSending] = useState(false);
  const [collabDone, setCollabDone] = useState(false);
  const [collabError, setCollabError] = useState('');

  // ── Comments panel ──
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handleRaiseHand = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!collabMsg.trim()) return;
    setCollabSending(true);
    setCollabError('');
    try {
      await collabApi.raise(project.id, collabMsg.trim());
      setCollabDone(true);
      setCollabMsg('');
    } catch (err: any) {
      setCollabError(err?.response?.data?.error ?? 'Something went wrong. Try again.');
    } finally {
      setCollabSending(false);
    }
  };

  const openComments = async (e: React.MouseEvent) => {
    e.preventDefault();
    setShowComments(true);
    if (comments.length === 0) {
      setCommentsLoading(true);
      try {
        const data = await commentsApi.getForProject(project.id);
        setComments(data);
      } catch {
        /* fail silently */
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const handlePostComment = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setCommentSending(true);
    setCommentError('');
    try {
      const newComment = await commentsApi.post(project.id, commentBody.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentBody('');
    } catch (err: any) {
      setCommentError(err?.response?.data?.error ?? 'Could not post comment.');
    } finally {
      setCommentSending(false);
    }
  };

  // Extract recent milestones for display
  const recentMilestones = [...project.milestones]
    .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
    .slice(0, 2);

  return (
    <div className={`project-card project-card--${variant}`}>
      <Link to={`/projects/${project.id}`} className="project-card-link">
        <div className="project-card-image" style={{ background: gradient }}>
          <div className="project-card-image-overlay">
            {project.techStack.slice(0, 3).map((tech) => (
              <span key={tech} className="tech-pill">
                {tech}
              </span>
            ))}
          </div>
          {project.isCompleted && <div className="project-card-completed-badge">🎉 Shipped</div>}
        </div>

        <div className="project-card-body">
          <div className="project-card-meta">
            <span className="project-category-tag">{category}</span>
          </div>
          <h3 className="project-card-title">{project.title}</h3>
          <p className="project-card-desc">{project.description}</p>

          {/* Live Milestone Content */}
          {project.milestones.length > 0 && (
            <div className="project-card-milestones-preview">
              <h4 className="milestone-preview-title">Recent Updates</h4>
              <div className="milestone-preview-list">
                {recentMilestones.map((m) => (
                  <div key={m.id} className="milestone-preview-item">
                    <span className="milestone-icon">✅</span>
                    <div className="milestone-info">
                      <p className="milestone-text">{m.title}</p>
                      <span className="milestone-date">{timeAgo(m.achievedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="project-card-footer">
            <span className="project-stage-badge">
              STAGE: {STAGE_LABELS[project.stage] ?? project.stage}
            </span>
            <span className="project-milestones-count">
              {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </Link>

      <div className="project-card-actions">
        <button className="card-action-btn" onClick={openComments}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comment
        </button>

        {user && user.id !== project.developerId && !project.isCompleted && (
          <button
            className="card-action-btn card-action-btn--raise"
            onClick={(e) => {
              e.preventDefault();
              setShowCollab(true);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
            Raise Hand
          </button>
        )}
      </div>

      {/* --- MODALS --- */}
      {showCollab && (
        <div className="card-modal-backdrop" onClick={() => setShowCollab(false)}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <span>✋ Raise Your Hand</span>
              <button className="card-modal-close" onClick={() => setShowCollab(false)}>
                ✕
              </button>
            </div>
            {collabDone ? (
              <div className="card-modal-success">
                <p>Request sent! The developer will be in touch.</p>
                <button className="card-modal-btn" onClick={() => setShowCollab(false)}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className="card-modal-textarea"
                  placeholder="How can you help?"
                  value={collabMsg}
                  onChange={(e) => setCollabMsg(e.target.value)}
                />
                <div className="card-modal-footer">
                  <button
                    className="card-modal-btn card-modal-btn--primary"
                    onClick={handleRaiseHand}
                    disabled={collabSending || !collabMsg.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showComments && (
        <div className="card-modal-backdrop" onClick={() => setShowComments(false)}>
          <div className="card-modal card-modal--comments" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <span>💬 Comments</span>
              <button className="card-modal-close" onClick={() => setShowComments(false)}>
                ✕
              </button>
            </div>
            <div className="card-comments-list">
              {comments.map((c) => (
                <div key={c.id} className="card-comment">
                  <span className="card-comment-author">{c.username}</span>
                  <p className="card-comment-body">{c.body}</p>
                </div>
              ))}
            </div>
            {user && (
              <div className="card-comment-form">
                <textarea
                  className="card-modal-textarea"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add comment..."
                />
                <button
                  className="card-modal-btn"
                  onClick={handlePostComment}
                  disabled={commentSending}
                >
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
