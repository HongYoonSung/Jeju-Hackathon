import { describe, it, expect } from 'vitest';
import { haversine } from '../lib/geo';
import { formatDistance, formatPrice, formatDuration } from '../lib/format';
import { safeUrl } from '../lib/safeUrl';
import { crowdMeta } from '../lib/crowd';

describe('Frontend Utils Test', () => {
  it('haversine 거리 계산 검증', () => {
    // 제주시청 -> 노형동 대략 5km
    const cityHall = { lat: 33.4996, lng: 126.5312 };
    const nohyeong = { lat: 33.4846, lng: 126.4783 };
    const dist = haversine(cityHall, nohyeong);

    expect(dist).toBeGreaterThan(4000);
    expect(dist).toBeLessThan(7000);
  });

  it('formatDistance 포맷팅 검증', () => {
    expect(formatDistance(850)).toBe('850m');
    expect(formatDistance(999)).toBe('999m');
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1240)).toBe('1.2km');
  });

  it('formatPrice 포맷팅 검증', () => {
    expect(formatPrice(4980)).toBe('4,980원');
    expect(formatPrice(1000000)).toBe('1,000,000원');
  });

  it('formatDuration 포맷팅 검증', () => {
    expect(formatDuration(1260)).toBe('21분');
    expect(formatDuration(3600)).toBe('1시간');
    expect(formatDuration(3900)).toBe('1시간 5분');
  });

  it('safeUrl 보안 및 도메인 검증', () => {
    // 허용 도메인 정상
    expect(
      safeUrl('https://www.coupang.com/np/search?q=%EC%9A%B0%EC%9C%A0')
    ).toBe('https://www.coupang.com/np/search?q=%EC%9A%B0%EC%9C%A0');

    // javascript: 악성 링크 차단
    expect(safeUrl('javascript:alert(1)')).toBeNull();

    // http 차단 (https만 허용)
    expect(safeUrl('http://www.coupang.com/')).toBeNull();

    // 비허용 도메인 차단
    expect(safeUrl('https://evil-phishing.com/test')).toBeNull();

    // 잘못된 URL 형태
    expect(safeUrl('invalid-url-string')).toBeNull();
  });

  it('crowdMeta 혼잡도 매핑 검증', () => {
    expect(crowdMeta('low').label).toBe('여유');
    expect(crowdMeta('medium').label).toBe('보통');
    expect(crowdMeta('high').label).toBe('혼잡');
    expect(crowdMeta('very_high').label).toBe('매우 혼잡');
  });
});
