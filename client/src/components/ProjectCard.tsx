import { Link } from 'react-router-dom';
import type { Project } from '../services/api';
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

export default function ProjectCard({ project, variant = 'feed' }: Props) {
  const category = getCategoryFromStack(project.techStack);
  const gradient = getGradient(project.id);

  return (
    <Link to={`/projects/${project.id}`} className={`project-card project-card--${variant}`}>
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

        <div className="project-card-footer">
          <span className="project-stage-badge">
            STAGE: {STAGE_LABELS[project.stage] ?? project.stage}
          </span>
          {project.milestones.length > 0 && (
            <span className="project-milestones">
              {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
