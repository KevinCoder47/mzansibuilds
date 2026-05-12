import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { protect, AuthRequest } from '../middleware/auth.middleware.js';
import {
  addProject,
  getProjects,
  findProjectById,
  addMilestone,
  completeProject,
  addCollabRequest,
  getCollabRequestsByProject,
  addComment,
  getCommentsByProject,
  ProjectStage,
  findUserById,
  saveData,
} from '../data/store.js';
import { subscribe, unsubscribe, broadcast } from '../lib/sseBroker.js';

const router = Router();

// ─── VALIDATION SCHEMAS ───────────────────────────────────────────────────────

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

const commentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be under 1000 characters'),
});

// ─── PROJECT FEED ─────────────────────────────────────────────────────────────

// GET /api/projects — Get all projects (sorted by newest)
router.get('/', async (_req, res: Response) => {
  const allProjects = (await getProjects())
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.status(200).json({ projects: allProjects });
});

// GET /api/projects/:id — Get specific project details
router.get('/:id', async (req, res: Response) => {
  const id = req.params['id'] as string;
  const project = await findProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.status(200).json(project);
});

// ─── REAL-TIME SSE STREAM ─────────────────────────────────────────────────────

router.get('/:id/events', async (req: Request, res: Response) => {
  const projectId = req.params['id'] as string;

  if (!(await findProjectById(projectId))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: {"projectId":"${projectId}"}\n\n`);

  const client = subscribe(projectId, res);

  req.on('close', () => {
    unsubscribe(client);
  });
});

// ─── PROJECT ACTIONS (PROTECTED) ─────────────────────────────────────────────

// POST /api/projects — Create a new project
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? 'Validation error';
    res.status(400).json({ error: firstError });
    return;
  }
  const newProject = await addProject({
    ...result.data,
    stage: result.data.stage as ProjectStage,
    developerId: req.developerId as string,
  });
  res.status(201).json(newProject);
});

// PATCH /api/projects/:id — Update project info
router.patch('/:id', protect, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const project = await findProjectById(id);
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
  await saveData();
  res.status(200).json(project);
});

// POST /api/projects/:id/milestones — Add a milestone
router.post('/:id/milestones', protect, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const project = await findProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const result = milestoneSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Validation error' });
    return;
  }
  const milestone = await addMilestone(id, result.data);
  res.status(201).json(milestone);
});

// POST /api/projects/:id/complete — Mark as finished
router.post('/:id/complete', protect, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const project = await findProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  if (project.developerId !== req.developerId) {
    res.status(403).json({ error: 'You can only complete your own projects' });
    return;
  }
  const completed = await completeProject(id);
  res.status(200).json({
    message: 'Congratulations! Your project has been completed 🎉',
    project: completed,
  });
});

// ─── COLLABORATION SYSTEM ─────────────────────────────────────────────────────

// GET /api/projects/:id/collab — See who wants to help
router.get('/:id/collab', async (req, res: Response) => {
  const id = req.params['id'] as string;
  const requests = await getCollabRequestsByProject(id);
  res.status(200).json(requests);
});

// POST /api/projects/:id/collab — Raise your hand to help
router.post('/:id/collab', protect, async (req: AuthRequest, res: Response) => {
  const projectId = req.params['id'] as string;
  const user = await findUserById(req.developerId as string);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const result = collabSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid message' });
    return;
  }
  const project = await findProjectById(projectId);
  if (project?.developerId === user.id) {
    res.status(400).json({ error: 'You cannot join your own project as a collaborator!' });
    return;
  }
  const collab = await addCollabRequest({
    projectId: projectId,
    userId: user.id,
    username: user.username,
    message: result.data.message,
  });

  broadcast(projectId, 'collab', collab);

  res.status(201).json(collab);
});

// ─── COMMENTS SYSTEM ──────────────────────────────────────────────────────────

// GET /api/projects/:id/comments — Get all comments for a project
router.get('/:id/comments', async (req, res: Response) => {
  const projectId = req.params['id'] as string;
  const project = await findProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const comments = await getCommentsByProject(projectId);
  res.status(200).json(comments);
});

// POST /api/projects/:id/comments — Post a comment (authenticated)
router.post('/:id/comments', protect, async (req: AuthRequest, res: Response) => {
  const projectId = req.params['id'] as string;
  const project = await findProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const user = await findUserById(req.developerId as string);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const result = commentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid comment' });
    return;
  }
  const comment = await addComment({
    projectId,
    userId: user.id,
    username: user.username,
    body: result.data.body,
  });

  broadcast(projectId, 'comment', comment);

  res.status(201).json(comment);
});

export default router;
