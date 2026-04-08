import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';
import type { Project } from '../../services/api';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseProject: Project = {
  id: 'proj-1',
  developerId: 'dev-1',
  title: 'Mzansi Market',
  description: 'An e-commerce platform for local vendors.',
  techStack: ['React', 'Node'],
  stage: 'building',
  supportRequired: 'Need a designer',
  milestones: [],
  isCompleted: false,
  createdAt: '2024-01-15T10:00:00.000Z',
};

const renderCard = (overrides: Partial<Project> = {}, variant?: 'feed' | 'wall') =>
  render(
    <MemoryRouter>
      <ProjectCard project={{ ...baseProject, ...overrides }} variant={variant} />
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectCard – rendering', () => {
  it('displays the project title', () => {
    renderCard();
    expect(screen.getByText('Mzansi Market')).toBeInTheDocument();
  });

  it('displays the project description', () => {
    renderCard();
    expect(screen.getByText(/e-commerce platform/i)).toBeInTheDocument();
  });

  it('renders each tech stack item as a pill', () => {
    renderCard();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
  });

  it('shows the stage label in the footer', () => {
    renderCard({ stage: 'launched' });
    expect(screen.getByText(/launched/i)).toBeInTheDocument();
  });

  it('renders a link that navigates to /projects/:id', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/proj-1');
  });
});

describe('ProjectCard – isCompleted', () => {
  it('shows the "Shipped" badge when isCompleted is true', () => {
    renderCard({ isCompleted: true });
    expect(screen.getByText(/shipped/i)).toBeInTheDocument();
  });

  it('does not show the "Shipped" badge when isCompleted is false', () => {
    renderCard({ isCompleted: false });
    expect(screen.queryByText(/shipped/i)).not.toBeInTheDocument();
  });
});

describe('ProjectCard – milestones', () => {
  it('shows milestone count when milestones are present', () => {
    const milestones = [
      {
        id: 'm1',
        projectId: 'proj-1',
        title: 'v1.0',
        description: 'First release',
        achievedAt: '2024-02-01T00:00:00.000Z',
      },
      {
        id: 'm2',
        projectId: 'proj-1',
        title: 'v1.1',
        description: 'Bug fixes',
        achievedAt: '2024-03-01T00:00:00.000Z',
      },
    ];
    renderCard({ milestones });
    expect(screen.getByText(/2 milestone/i)).toBeInTheDocument();
  });

  it('hides the milestone count when there are no milestones', () => {
    renderCard({ milestones: [] });
    expect(screen.queryByText(/milestone/i)).not.toBeInTheDocument();
  });

  it('uses singular "milestone" for exactly one milestone', () => {
    const milestones = [
      { id: 'm1', projectId: 'proj-1', title: 'v1.0', description: 'Launch', achievedAt: '' },
    ];
    renderCard({ milestones });
    expect(screen.getByText('1 milestone')).toBeInTheDocument();
  });
});

describe('ProjectCard – category derivation from techStack', () => {
  it('shows MOBILE category for React Native projects', () => {
    renderCard({ techStack: ['React Native', 'Expo'] });
    expect(screen.getByText('MOBILE')).toBeInTheDocument();
  });

  it('shows AI/ML category for ML projects', () => {
    renderCard({ techStack: ['TensorFlow', 'Python'] });
    expect(screen.getByText('AI/ML')).toBeInTheDocument();
  });

  it('defaults to FULL STACK when no specialised tech is detected', () => {
    renderCard({ techStack: ['React', 'Node', 'PostgreSQL'] });
    expect(screen.getByText('FULL STACK')).toBeInTheDocument();
  });
});

describe('ProjectCard – variant prop', () => {
  it('applies the "feed" CSS modifier class by default', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveClass('project-card--feed');
  });

  it('applies the "wall" CSS modifier class when variant="wall"', () => {
    renderCard({}, 'wall');
    expect(screen.getByRole('link')).toHaveClass('project-card--wall');
  });
});

describe('ProjectCard – edge cases', () => {
  it('renders gracefully with an empty techStack array', () => {
    renderCard({ techStack: [] });
    expect(screen.getByText('Mzansi Market')).toBeInTheDocument();
  });

  it('only shows the first 3 tech stack items', () => {
    renderCard({ techStack: ['React', 'Node', 'PostgreSQL', 'Redis', 'Docker'] });
    // The first 3 should be visible
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    // 4th and 5th should not appear
    expect(screen.queryByText('Redis')).not.toBeInTheDocument();
    expect(screen.queryByText('Docker')).not.toBeInTheDocument();
  });

  it('handles all stage values without crashing', () => {
    const stages = ['planning', 'building', 'testing', 'launched', 'completed'] as const;
    for (const stage of stages) {
      const { unmount } = renderCard({ stage });
      expect(screen.getByText('Mzansi Market')).toBeInTheDocument();
      unmount();
    }
  });
});
