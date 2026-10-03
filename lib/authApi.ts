const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/* ─── Module-level auth session (auto-refresh interceptor) ── */
interface AuthSession {
  tokens: TokenResponse;
  onNewTokens: (t: TokenResponse) => void;
  onExpired: () => void;
}
let _session: AuthSession | null = null;

export function setAuthSession(
  tokens: TokenResponse,
  onNewTokens: (t: TokenResponse) => void,
  onExpired: () => void
) {
  _session = { tokens, onNewTokens, onExpired };
}

export function clearAuthSession() {
  _session = null;
}

function isTokenExpiredError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('token') &&
    (m.includes('hết hạn') || m.includes('không hợp lệ') || m.includes('expired') || m.includes('invalid') || m.includes('unauthorized'))
  );
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  avatarFrame?: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  gender?: 'male' | 'female' | 'other';
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

interface ApiResult<T> {
  status: boolean;
  message: string;
  data: T;
  statusCode: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Đã xảy ra lỗi');
  }
  return json;
}

// Authenticated request with auto-refresh on token expiry
async function authRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  if (!_session) throw new Error('Chưa đăng nhập');

  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  });

  try {
    return await request<T>(path, { ...options, headers: authHeaders(_session.tokens.accessToken) });
  } catch (e: any) {
    if (isTokenExpiredError(e?.message || '') && _session) {
      try {
        const newTokens = await apiRefreshToken(_session.tokens.refreshToken);
        _session.tokens = newTokens;
        _session.onNewTokens(newTokens);
        return await request<T>(path, { ...options, headers: authHeaders(newTokens.accessToken) });
      } catch {
        _session.onExpired();
        _session = null;
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      }
    }
    throw e;
  }
}

export async function apiRegister(payload: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function apiLogin(payload: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function apiLogout(accessToken: string): Promise<void> {
  await request<null>('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function apiGetProfile(accessToken: string): Promise<User> {
  const res = await request<User>('/api/v1/auth/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

export async function apiUpdateProfile(payload: {
  displayName?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other';
}): Promise<User> {
  const res = await authRequest<User>('/api/v1/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function apiChangePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await authRequest<null>('/api/v1/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function apiRefreshToken(refreshToken: string): Promise<TokenResponse> {
  const res = await request<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return res.data;
}

/* ─── Movie lookup ────────────────────────────────────────── */
export async function apiGetGtavnMovieId(slug: string): Promise<string | null> {
  try {
    const res = await request<any>(`/api/v1/phim/${encodeURIComponent(slug)}`);
    return res.data?.item?._id ?? null;
  } catch {
    return null;
  }
}

/* ─── Favorites ───────────────────────────────────────────── */
export interface FavoriteMovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster: Record<string, string>;
  thumb: Record<string, string>;
  episode_current?: string | Record<string, string>;
  quality?: string;
  lang?: string;
  year?: number;
}

export interface FavoriteItem {
  id: string;
  movie: FavoriteMovieItem;
  createdAt?: string;
}

export async function apiToggleFavorite(
  movieId: string
): Promise<boolean> {
  const res = await authRequest<{ isFavorited: boolean }>('/api/v1/favorite/toggle', {
    method: 'POST',
    body: JSON.stringify({ movieId }),
  });
  return res.data.isFavorited;
}

export async function apiCheckFavorite(
  movieId: string
): Promise<boolean> {
  const res = await authRequest<{ isFavorited: boolean }>(
    `/api/v1/favorite/check/${movieId}`
  );
  return res.data.isFavorited;
}

export async function apiGetFavorites(
  page = 1
): Promise<{ items: FavoriteItem[]; totalPages: number; totalItems: number }> {
  const res = await authRequest<any>(
    `/api/v1/favorite/list?page=${page}&limit=24`
  );
  const pagination = res.data?.pagination;
  return {
    items: res.data?.items ?? [],
    totalPages: pagination?.totalPages ?? 1,
    totalItems: pagination?.totalItems ?? 0,
  };
}

export async function apiRemoveFavorite(
  movieId: string
): Promise<void> {
  await authRequest<null>('/api/v1/favorite/remove', {
    method: 'POST',
    body: JSON.stringify({ movieId }),
  });
}

/* ─── Watch History ───────────────────────────────────────── */
export interface WatchHistoryPayload {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  episodeName: string;
  serverLabel: string;
  time: number;
  duration: number;
}

export async function apiSaveWatchProgress(
  payload: WatchHistoryPayload
): Promise<void> {
  await authRequest<null>('/api/v1/watch-history/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetWatchHistory(
  limit = 50
): Promise<WatchHistoryPayload[]> {
  const res = await authRequest<WatchHistoryPayload[]>(
    `/api/v1/watch-history?limit=${limit}`
  );
  return res.data ?? [];
}

export async function apiRemoveWatchEntry(
  movieId: string,
  episodeName?: string
): Promise<void> {
  await authRequest<null>('/api/v1/watch-history/remove', {
    method: 'POST',
    body: JSON.stringify({ movieId, episodeName }),
  });
}

export async function apiClearWatchHistory(): Promise<void> {
  await authRequest<null>('/api/v1/watch-history/clear', {
    method: 'POST',
  });
}
