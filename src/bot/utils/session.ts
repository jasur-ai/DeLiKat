interface UserSession {
  userId: number;
  name?: string;
  phone?: string;
  role?: string;
  lang: string;
  isAuthenticated: boolean;
  state: string;
  data: Record<string, any>;
  createdAt: number;
}

class SessionManager {
  private sessions: Map<number, UserSession> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  getOrCreate(userId: number): UserSession {
    let session = this.sessions.get(userId);
    if (!session || Date.now() - session.createdAt > this.TTL) {
      session = {
        userId,
        lang: 'uz',
        isAuthenticated: false,
        state: 'idle',
        data: {},
        createdAt: Date.now(),
      };
      this.sessions.set(userId, session);
    }
    return session;
  }

  get(userId: number): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (session && Date.now() - session.createdAt > this.TTL) {
      this.sessions.delete(userId);
      return undefined;
    }
    return session;
  }

  set(userId: number, session: UserSession): void {
    this.sessions.set(userId, session);
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > this.TTL) this.sessions.delete(id);
    }
  }
}

export const sessionManager = new SessionManager();
