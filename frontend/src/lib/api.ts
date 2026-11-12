import {
  SearchRequest,
  SearchResponse,
  GeocodeRequest,
  GeocodeResponse,
  RouteRequest,
  RouteResponse,
  TransitRequest,
  TransitResponse,
  ApiErrorResponse,
} from '../types/api';

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 70000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (data && typeof data === 'object' && 'error' in data) {
        const errObj = (data as ApiErrorResponse).error;
        throw new ApiError(errObj.code || 'UNKNOWN_ERROR', errObj.message || '요청 처리에 실패했습니다.');
      }
      throw new ApiError('HTTP_ERROR', `서버 오류가 발생했습니다. (${response.status})`);
    }

    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError('TIMEOUT', '요청 시간이 초과되었습니다.');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('NETWORK_ERROR', error.message || '네트워크 연결 상태를 확인해 주세요.');
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  search: (req: SearchRequest): Promise<SearchResponse> =>
    request<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  geocode: (req: GeocodeRequest): Promise<GeocodeResponse> =>
    request<GeocodeResponse>('/api/geocode', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  route: (req: RouteRequest): Promise<RouteResponse> =>
    request<RouteResponse>('/api/route', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  transit: (req: TransitRequest): Promise<TransitResponse> =>
    request<TransitResponse>('/api/transit', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  login: (data: { id: string; password: string }) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signup: (data: { id: string; password: string; passwordConfirm: string }) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
