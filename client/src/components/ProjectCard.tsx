import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Comment, CollabRequest } from '../services/api';
import { collabApi, commentsApi, openProjectStream } from '../services/api';
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
  const isOwner = user?.id === project.developerId;

  // ── Raise Hand modal (Non-owners) ────────────────────────────────────────
  const [showCollab, setShowCollab] = useState(false);
  const [collabMsg, setCollabMsg] = useState('');
  const [collabSending, setCollabSending] = useState(false);
  const [collabDone, setCollabDone] = useState(false);
  const [collabError, setCollabError] = useState('');

  // ── Inbox Modal (Owner Only) ──────────────────────────────────────────────
  const [showInbox, setShowInbox] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<CollabRequest[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxHasNew, setInboxHasNew] = useState(false);

  // ── Comments panel ────────────────────────────────────────────────────────
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  // Auto-scroll ref for comment list
  const commentsBottomRef = useRef<HTMLDivElement>(null);

  // ── SSE stream — opened only while a modal is active ─────────────────────
  //
  // We open ONE stream per card, shared between the comment and inbox panels.
  // The stream is opened when either modal opens and closed when both close.
  // This avoids N idle connections when no panel is visible.
  const streamCloseRef = useRef<(() => void) | null>(null);
  const anyModalOpen = showComments || showInbox;

  useEffect(() => {
    if (!anyModalOpen) {
      // Both modals closed — tear down the stream
      if (streamCloseRef.current) {
        streamCloseRef.current();
        streamCloseRef.current = null;
      }
      return;
    }

    // Open the SSE stream for this project
    const close = openProjectStream(project.id, {
      onComment: (newComment) => {
        // Append to the comment list, deduplicating by id
        setComments((prev) =>
          prev.some((c) => c.id === newComment.id) ? prev : [...prev, newComment],
        );
      },
      onCollab: (newCollab) => {
        // Append to the owner's inbox, deduplicating by id
        setIncomingRequests((prev) =>
          prev.some((r) => r.id === newCollab.id) ? prev : [...prev, newCollab],
        );
        // Flag new requests even if the inbox modal isn't open yet
        if (!showInbox) setInboxHasNew(true);
      },
    });

    streamCloseRef.current = close;

    return () => {
      close();
      streamCloseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyModalOpen, project.id]);

  // Auto-scroll the comment list to the bottom when new messages arrive
  useEffect(() => {
    if (showComments) {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, showComments]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openInbox = async (e: React.MouseEvent) => {
    e.preventDefault();
    setShowInbox(true);
    setInboxHasNew(false);
    setInboxLoading(true);
    try {
      const data = await collabApi.getForProject(project.id);
      setIncomingRequests(data);
    } catch (err) {
      console.error('Failed to fetch collaboration requests', err);
    } finally {
      setInboxLoading(false);
    }
  };

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
    try {
      // The REST POST response is the authoritative copy; SSE will also broadcast
      // it to other open clients. We optimistically append here so the poster
      // sees their comment immediately without waiting for the SSE echo.
      const newComment = await commentsApi.post(project.id, commentBody.trim());
      setComments((prev) =>
        prev.some((c) => c.id === newComment.id) ? prev : [...prev, newComment],
      );
      setCommentBody('');
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Could not post comment.');
    } finally {
      setCommentSending(false);
    }
  };

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

      {/* ── Action bar ──────────────────────────────────────────────────── */}
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

        {isOwner && (
          <button
            className={`card-action-btn card-action-btn--inbox ${inboxHasNew ? 'card-action-btn--inbox-new' : ''}`}
            onClick={openInbox}
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Review Requests
            {inboxHasNew && <span className="inbox-new-dot" aria-label="New requests" />}
          </button>
        )}

        {user && !isOwner && !project.isCompleted && (
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

      {/* ── Incoming Requests Modal (Owner) ──────────────────────────────── */}
      {showInbox && (
        <div className="card-modal-backdrop" onClick={() => setShowInbox(false)}>
          <div className="card-modal card-modal--inbox" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <span>
                📩 Collaboration Requests
                <span className="modal-live-badge" title="Live — new requests appear instantly">
                  ● LIVE
                </span>
              </span>
              <button className="card-modal-close" onClick={() => setShowInbox(false)}>
                ✕
              </button>
            </div>
            <div className="card-inbox-list">
              {inboxLoading ? (
                <p className="modal-status-text">Loading requests...</p>
              ) : incomingRequests.length === 0 ? (
                <p className="modal-status-text">No requests yet. Build something they'll love!</p>
              ) : (
                incomingRequests.map((req) => (
                  <div key={req.id} className="card-inbox-item">
                    <div className="inbox-item-header">
                      <span className="inbox-item-author">@{req.username}</span>
                      <span className="inbox-item-date">{timeAgo(req.createdAt)}</span>
                    </div>
                    <p className="inbox-item-msg">{req.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Comments Modal ───────────────────────────────────────────────── */}
      {showComments && (
        <div className="card-modal-backdrop" onClick={() => setShowComments(false)}>
          <div className="card-modal card-modal--comments" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <span>
                💬 Comments
                <span className="modal-live-badge" title="Live — new comments appear instantly">
                  ● LIVE
                </span>
              </span>
              <button className="card-modal-close" onClick={() => setShowComments(false)}>
                ✕
              </button>
            </div>
            <div className="card-comments-list">
              {commentsLoading ? (
                <p className="modal-status-text">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="modal-status-text">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="card-comment">
                    <div className="card-comment-header">
                      <span className="card-comment-author">{c.username}</span>
                      <span className="card-comment-date">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="card-comment-body">{c.body}</p>
                  </div>
                ))
              )}
              {/* Sentinel element — scrolled into view when new comments arrive */}
              <div ref={commentsBottomRef} />
            </div>
            {user && (
              <div className="card-comment-form">
                <textarea
                  className="card-modal-textarea"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add comment..."
                  onKeyDown={(e) => {
                    // Cmd/Ctrl + Enter submits
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      handlePostComment(e as any);
                    }
                  }}
                />
                <button
                  className="card-modal-btn card-modal-btn--primary"
                  onClick={handlePostComment}
                  disabled={commentSending || !commentBody.trim()}
                >
                  {commentSending ? 'Posting…' : 'Post'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Raise Hand Modal (Non-owner) ─────────────────────────────────── */}
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
                {collabError && <p className="modal-error-text">{collabError}</p>}
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
    </div>
  );
}
