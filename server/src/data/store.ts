import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// ─── Types & Interfaces (Keep these exactly as you had them) ──────────────────
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
export interface CollabRequest {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
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

// ─── Persistence Logic ────────────────────────────────────────────────────────

const DB_PATH = path.join(__dirname, '../../data.json');

interface Schema {
  users: Developer[];
  projects: Project[];
  collabRequests: CollabRequest[];
}

// Internal state
let db: Schema = {
  users: [],
  projects: [],
  collabRequests: [],
};

// Load data from file on startup
const loadData = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    } else {
      saveData(); // Create the file if it doesn't exist
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
};

// Save data to file
export const saveData = () => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Initialize
loadData();

// ─── Developer Helpers ────────────────────────────────────────────────────────

export const getUsers = (): Developer[] => db.users;

export const addUser = (user: Developer): void => {
  db.users.push(user);
  saveData();
};

export const findUserByEmail = (email: string): Developer | undefined =>
  db.users.find((u) => u.email === email);

export const findUserById = (id: string): Developer | undefined =>
  db.users.find((u) => u.id === id);

// ─── Project Helpers ──────────────────────────────────────────────────────────

export const getProjects = (): Project[] => db.projects;

export const findProjectById = (id: string): Project | undefined =>
  db.projects.find((p) => p.id === id);

export const addProject = (
  projectData: Omit<Project, 'id' | 'milestones' | 'isCompleted' | 'createdAt'>,
): Project => {
  const newProject: Project = {
    ...projectData,
    id: uuidv4(),
    milestones: [],
    isCompleted: false,
    createdAt: new Date().toISOString(),
  };
  db.projects.push(newProject);
  saveData();
  return newProject;
};

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
  saveData();
  return milestone;
};

export const completeProject = (projectId: string): Project | null => {
  const project = findProjectById(projectId);
  if (!project) return null;

  project.isCompleted = true;
  project.stage = 'completed';
  saveData();
  return project;
};

// ─── Collaboration Helpers ────────────────────────────────────────────────────

export const addCollabRequest = (req: Omit<CollabRequest, 'id' | 'createdAt'>): CollabRequest => {
  const newRequest: CollabRequest = {
    ...req,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  db.collabRequests.push(newRequest);
  saveData();
  return newRequest;
};

export const getCollabRequestsByProject = (projectId: string): CollabRequest[] =>
  db.collabRequests.filter((r) => r.projectId === projectId);

// ─── System Helpers ───────────────────────────────────────────────────────────

export const clearAll = (): void => {
  db = { users: [], projects: [], collabRequests: [] };
  saveData();
};
