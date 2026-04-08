import { Router, Response } from 'express';
import { z } from 'zod';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import {
  addProject,
  getProjects,
  findProjectById,
  addMilestone,
  completeProject,
  addCollabRequest,
  getCollabRequestsByProject,
  ProjectStage,
  findUserById,
  saveData,
} from '../data/store';

const router = Router();

// ─── VALIDATION SCHEMAS ──────────────────────────────────────────────────────

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

const collabSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message must be under 500 characters'),
});

// ─── PROJECT FEED ────────────────────────────────────────────────────────────

// GET /api/projects — Get all projects (Sorted by newest)
router.get('/', (_req, res: Response) => {
  const allProjects = getProjects()
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.status(200).json({ projects: allProjects });
});

// GET /api/projects/:id — Get specific project details
router.get('/:id', (req, res: Response) => {
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.status(200).json(project);
});

// ─── PROJECT ACTIONS (PROTECTED) ─────────────────────────────────────────────

// POST /api/projects — Create a new project
router.post('/', protect, (req: AuthRequest, res: Response) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
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

// PATCH /api/projects/:id — Update project info
router.patch('/:id', protect, (req: AuthRequest, res: Response) => {
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
      (project as any)[field] = req.body[field];
    }
  });

  saveData();

  res.status(200).json(project);
});

// POST /api/projects/:id/milestones — Add a milestone
router.post('/:id/milestones', protect, (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const project = findProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const result = milestoneSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Validation error' });
    return;
  }

  const milestone = addMilestone(id, result.data);
  res.status(201).json(milestone);
});

// POST /api/projects/:id/complete — Mark as finished
router.post('/:id/complete', protect, (req: AuthRequest, res: Response) => {
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

// ─── COLLABORATION SYSTEM ────────────────────────────────────────────────────

// GET /api/projects/:id/collab — See who wants to help
router.get('/:id/collab', (req, res: Response) => {
  const id = req.params['id'] as string;
  const requests = getCollabRequestsByProject(id);
  res.status(200).json(requests);
});

// POST /api/projects/:id/collab — Raise your hand to help
router.post('/:id/collab', protect, (req: AuthRequest, res: Response) => {
  const projectId = req.params['id'] as string;

  // 1. Check if user exists
  const user = findUserById(req.developerId as string);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // 2. Validate message body
  const result = collabSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid message' });
    return;
  }

  // 3. Prevent project owners from requesting to help their own project (Optional but logical)
  const project = findProjectById(projectId);
  if (project?.developerId === user.id) {
    res.status(400).json({ error: 'You cannot join your own project as a collaborator!' });
    return;
  }

  // 4. Save the request
  const collab = addCollabRequest({
    projectId: projectId,
    userId: user.id,
    username: user.username,
    message: result.data.message,
  });

  res.status(201).json(collab);
});

export default router;
