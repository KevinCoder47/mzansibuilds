import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Developer {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
}

export type ProjectStage = 'planning' | 'building' | 'testing' | 'launched' | 'completed';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  achievedAt: string;
}

export interface Project {
  id: string;
  developerId: string;
  title: string;
  description: string;
  techStack: string[];
  stage: ProjectStage;
  supportRequired: string;
  milestones: Milestone[];
  isCompleted: boolean;
  createdAt: string;
}

// ─── In-memory "database" ─────────────────────────────────────────────────────

let users: Developer[] = [];
let projects: Project[] = [];

// ─── Developer helpers ────────────────────────────────────────────────────────

export const getUsers = (): Developer[] => users;
export const addUser = (user: Developer): void => {
  users.push(user);
};
export const findUserByEmail = (email: string): Developer | undefined =>
  users.find((u) => u.email === email);
export const findUserById = (id: string): Developer | undefined => users.find((u) => u.id === id);
export const clearUsers = (): void => {
  users = [];
};

// ─── Project helpers ──────────────────────────────────────────────────────────

export const getProjects = (): Project[] => projects;

export const addProject = (
  project: Omit<Project, 'id' | 'milestones' | 'isCompleted' | 'createdAt'>,
): Project => {
  const newProject: Project = {
    ...project,
    id: uuidv4(),
    milestones: [],
    isCompleted: false,
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  return newProject;
};

export const findProjectById = (id: string): Project | undefined =>
  projects.find((p) => p.id === id);

export const addMilestone = (
  projectId: string,
  data: { title: string; description: string },
): Milestone | null => {
  const project = findProjectById(projectId);
  if (!project) return null;

  const milestone: Milestone = {
    id: uuidv4(),
    projectId,
    title: data.title,
    description: data.description,
    achievedAt: new Date().toISOString(),
  };

  project.milestones.push(milestone);
  return milestone;
};

export const completeProject = (projectId: string): Project | null => {
  const project = findProjectById(projectId);
  if (!project) return null;
  project.isCompleted = true;
  project.stage = 'completed';
  return project;
};

export const clearProjects = (): void => {
  projects = [];
};
