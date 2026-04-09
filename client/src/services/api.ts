import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Interceptor: attach token on every request ───────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor: handle expired/invalid token globally ───────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mb_token');
      localStorage.removeItem('mb_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (username: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  },
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
};

// ── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const { data } = await api.get('/projects');
    return data.projects;
  },
  getById: async (id: string): Promise<Project> => {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },
  create: async (payload: {
    title: string;
    description: string;
    techStack: string[];
    stage: ProjectStage;
    supportRequired: string;
  }): Promise<Project> => {
    const { data } = await api.post('/projects', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Project>): Promise<Project> => {
    const { data } = await api.patch(`/projects/${id}`, payload);
    return data;
  },
  addMilestone: async (
    projectId: string,
    title: string,
    description: string,
  ): Promise<Milestone> => {
    const { data } = await api.post(`/projects/${projectId}/milestones`, { title, description });
    return data;
  },
  complete: async (id: string): Promise<Project> => {
    const { data } = await api.post(`/projects/${id}/complete`);
    return data.project;
  },
};

// ── Collaboration requests ────────────────────────────────────────────────────

export const collabApi = {
  getForProject: async (projectId: string): Promise<CollabRequest[]> => {
    const { data } = await api.get(`/projects/${projectId}/collab`);
    return data;
  },
  raise: async (projectId: string, message: string): Promise<CollabRequest> => {
    const { data } = await api.post(`/projects/${projectId}/collab`, { message });
    return data;
  },
};

// ── Comments ──────────────────────────────────────────────────────────────────

export const commentsApi = {
  getForProject: async (projectId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/projects/${projectId}/comments`);
    return data;
  },
  post: async (projectId: string, body: string): Promise<Comment> => {
    const { data } = await api.post(`/projects/${projectId}/comments`, { body });
    return data;
  },
};

// ── SSE stream helper ─────────────────────────────────────────────────────────

export type SSEEventType = 'comment' | 'collab' | 'ping' | 'connected';

export interface SSEStreamOptions {
  /** Called when a `comment` event arrives */
  onComment?: (comment: Comment) => void;
  /** Called when a `collab` event arrives */
  onCollab?: (collab: CollabRequest) => void;
  /** Called once the stream is confirmed live */
  onConnected?: () => void;
  /** Called when the stream closes unexpectedly (network error / server restart) */
  onError?: () => void;
}

/**
 * Opens an SSE stream for a project and returns a cleanup function.
 *
 * Usage:
 *   const close = openProjectStream(projectId, { onComment: (c) => ... });
 *   // call close() when you no longer need the stream (e.g. in useEffect cleanup)
 */
export function openProjectStream(projectId: string, opts: SSEStreamOptions): () => void {
  const base = import.meta.env.VITE_API_URL || '/api';
  const url = `${base}/projects/${projectId}/events`;

  const es = new EventSource(url);

  es.addEventListener('connected', () => {
    opts.onConnected?.();
  });

  es.addEventListener('comment', (e: MessageEvent) => {
    try {
      const comment: Comment = JSON.parse(e.data);
      opts.onComment?.(comment);
    } catch {
      /* malformed frame — ignore */
    }
  });

  es.addEventListener('collab', (e: MessageEvent) => {
    try {
      const collab: CollabRequest = JSON.parse(e.data);
      opts.onCollab?.(collab);
    } catch {
      /* malformed frame — ignore */
    }
  });

  es.onerror = () => {
    opts.onError?.();
    // EventSource auto-reconnects; we just surface the signal to the caller
  };

  // Return a teardown function
  return () => es.close();
}
