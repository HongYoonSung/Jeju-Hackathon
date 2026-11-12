/**
 * 거리(m)를 1km 미만은 850m, 1km 이상은 1.2km 형태로 포맷팅합니다.
 */
export function formatDistance(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)}m`;
  }
  const km = (m / 1000).toFixed(1);
  return `${km}km`;
}

/**
 * 숫자를 '4,980원' 형태로 포맷팅합니다.
 */
export function formatPrice(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/**
 * 초(sec)를 '21분' 또는 '1시간 5분' 형태로 포맷팅합니다.
 */
export function formatDuration(sec: number): string {
  const totalMinutes = Math.max(1, Math.round(sec / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${mins}분`;
}
