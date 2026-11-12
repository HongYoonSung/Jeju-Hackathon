import { CrowdInfo } from '../types/api';

export interface CrowdMetaResult {
  color: string;
  label: string;
}

export function crowdMeta(level: CrowdInfo['level'] | string): CrowdMetaResult {
  switch (level) {
    case 'low':
      return { color: 'var(--crowd-low)', label: '여유' };
    case 'medium':
      return { color: 'var(--crowd-medium)', label: '보통' };
    case 'high':
      return { color: 'var(--crowd-high)', label: '혼잡' };
    case 'very_high':
      return { color: 'var(--crowd-very-high)', label: '매우 혼잡' };
    default:
      return { color: 'var(--color-primary)', label: '정보 없음' };
  }
}
