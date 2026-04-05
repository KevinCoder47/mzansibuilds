import { Router, Response } from 'express';
import { z } from 'zod';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import {
  addProject,
  getProjects,
  findProjectById,
  addMilestone,
  completeProject,
  ProjectStage,
} from '../data/store';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  techStack: z.array(z.string()),
  stage: z.enum(['planning', 'building', 'testing', 'launched']),
  supportRequired: z.string(),
});

const milestoneSchema = z.object({
  title: z.string().min(3, 'Milestone title is required'),
  description: z.string(),
});

// ─── GET /api/projects — public live feed ─────────────────────────────────────

router.get('/', (_req, res: Response) => {
  const allProjects = getProjects()
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.status(200).json({ projects: allProjects });
});

// ─── GET /api/projects/:id — single project ───────────────────────────────────

router.get('/:id', (req, res: Response) => {
  // noUncheckedIndexedAccess: params are typed as string | undefined; assert since route guarantees it
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.status(200).json(project);
});

// ─── POST /api/projects — create a project (login required) ──────────────────

router.post('/', protect, (req: AuthRequest, res: Response) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    // noUncheckedIndexedAccess: issues[0] may be undefined, fall back to a safe message
    const firstError = result.error.issues[0]?.message ?? 'Validation error';
    res.status(400).json({ error: firstError });
    return;
  }

  const newProject = addProject({
    ...result.data,
    stage: result.data.stage as ProjectStage,
    developerId: req.developerId as string,
  });

  res.status(201).json(newProject);
});

// ─── PATCH /api/projects/:id — update a project (login required) ──────────────

router.patch('/:id', protect, (req: AuthRequest, res: Response) => {
  // noUncheckedIndexedAccess: params are typed as string | undefined; assert since route guarantees it
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.developerId !== req.developerId) {
    res.status(403).json({ error: 'You can only update your own projects' });
    return;
  }

  const allowedUpdates = ['title', 'description', 'techStack', 'stage', 'supportRequired'];
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      // Double-cast via `unknown` because Project has no index signature
      (project as unknown as Record<string, unknown>)[field] = req.body[field];
    }
  });

  res.status(200).json(project);
});

// ─── POST /api/projects/:id/milestones — add a milestone (login required) ────

router.post('/:id/milestones', protect, (req: AuthRequest, res: Response) => {
  // noUncheckedIndexedAccess: params are typed as string | undefined; assert since route guarantees it
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const result = milestoneSchema.safeParse(req.body);
  if (!result.success) {
    // noUncheckedIndexedAccess: issues[0] may be undefined, fall back to a safe message
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Validation error' });
    return;
  }

  const milestone = addMilestone(id, result.data);
  res.status(201).json(milestone);
});

// ─── POST /api/projects/:id/complete — mark project as done (login required) ──

router.post('/:id/complete', protect, (req: AuthRequest, res: Response) => {
  // noUncheckedIndexedAccess: params are typed as string | undefined; assert since route guarantees it
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.developerId !== req.developerId) {
    res.status(403).json({ error: 'You can only complete your own projects' });
    return;
  }

  const completed = completeProject(id);
  res.status(200).json({
    message: 'Congratulations! Your project has been completed 🎉',
    project: completed,
  });
});

export default router;
