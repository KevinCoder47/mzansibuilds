import { v4 as uuidv4 } from 'uuid';
import { MongoClient, Collection, Db } from 'mongodb';

// ─── Types & Interfaces ───────────────────────────────────────────────────────

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

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  body: string;
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

// ─── MongoDB Connection ───────────────────────────────────────────────────────

let client: MongoClient;
let db: Db;

let users: Collection<Developer>;
let projects: Collection<Project>;
let collabRequests: Collection<CollabRequest>;
let comments: Collection<Comment>;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db('mzansibuilds');

  users = db.collection<Developer>('users');
  projects = db.collection<Project>('projects');
  collabRequests = db.collection<CollabRequest>('collabRequests');
  comments = db.collection<Comment>('comments');

  // Indexes for fast lookups
  await users.createIndex({ email: 1 }, { unique: true });
  await projects.createIndex({ createdAt: -1 });
  await comments.createIndex({ projectId: 1, createdAt: 1 });
  await collabRequests.createIndex({ projectId: 1 });

  console.log('Connected to MongoDB');
};

// ─── saveData (no-op — kept so projects.ts PATCH route compiles without changes) ──

export const saveData = async (): Promise<void> => {
  // MongoDB writes are immediate — nothing to flush
};

// ─── Developer Helpers ────────────────────────────────────────────────────────

export const getUsers = async (): Promise<Developer[]> => {
  return users.find().toArray();
};

export const addUser = async (user: Developer): Promise<void> => {
  await users.insertOne(user);
};

export const findUserByEmail = async (email: string): Promise<Developer | null> => {
  return users.findOne({ email });
};

export const findUserById = async (id: string): Promise<Developer | null> => {
  return users.findOne({ id });
};

// ─── Project Helpers ──────────────────────────────────────────────────────────

export const getProjects = async (): Promise<Project[]> => {
  return projects.find().toArray();
};

export const findProjectById = async (id: string): Promise<Project | null> => {
  return projects.findOne({ id });
};

export const addProject = async (
  projectData: Omit<Project, 'id' | 'milestones' | 'isCompleted' | 'createdAt'>,
): Promise<Project> => {
  const newProject: Project = {
    ...projectData,
    id: uuidv4(),
    milestones: [],
    isCompleted: false,
    createdAt: new Date().toISOString(),
  };
  await projects.insertOne(newProject);
  return newProject;
};

export const addMilestone = async (
  projectId: string,
  data: { title: string; description: string },
): Promise<Milestone | null> => {
  const milestone: Milestone = {
    id: uuidv4(),
    projectId,
    title: data.title,
    description: data.description,
    achievedAt: new Date().toISOString(),
  };
  const result = await projects.findOneAndUpdate(
    { id: projectId },
    { $push: { milestones: milestone } },
    { returnDocument: 'after' },
  );
  if (!result) return null;
  return milestone;
};

export const completeProject = async (projectId: string): Promise<Project | null> => {
  const result = await projects.findOneAndUpdate(
    { id: projectId },
    { $set: { isCompleted: true, stage: 'completed' as ProjectStage } },
    { returnDocument: 'after' },
  );
  return result ?? null;
};

// ─── Collaboration Helpers ────────────────────────────────────────────────────

export const addCollabRequest = async (
  req: Omit<CollabRequest, 'id' | 'createdAt'>,
): Promise<CollabRequest> => {
  const newRequest: CollabRequest = {
    ...req,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  await collabRequests.insertOne(newRequest);
  return newRequest;
};

export const getCollabRequestsByProject = async (projectId: string): Promise<CollabRequest[]> => {
  return collabRequests.find({ projectId }).toArray();
};

// ─── Comment Helpers ──────────────────────────────────────────────────────────

export const addComment = async (data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
  const comment: Comment = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  await comments.insertOne(comment);
  return comment;
};

export const getCommentsByProject = async (projectId: string): Promise<Comment[]> => {
  return comments.find({ projectId }).sort({ createdAt: 1 }).toArray();
};

// ─── System Helpers ───────────────────────────────────────────────────────────

export const clearAll = async (): Promise<void> => {
  await users.deleteMany({});
  await projects.deleteMany({});
  await collabRequests.deleteMany({});
  await comments.deleteMany({});
};
