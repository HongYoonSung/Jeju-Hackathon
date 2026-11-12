export const DEFAULT_ALLOWED_HOSTS = [
  'www.coupang.com',
  'search.shopping.naver.com',
  'search.11st.co.kr',
  'browse.gmarket.co.kr',
];

/**
 * 안전한 온라인몰 URL인지 검증하고, 유효한 https URL이면 문자열을 반환합니다.
 * javascript: 링크나 허용되지 않은 도메인은 null을 반환합니다. (SPEC 5.3.4, 9.3)
 */
export function safeUrl(
  raw: string,
  allowedHosts: string[] = DEFAULT_ALLOWED_HOSTS
): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    const isAllowed = allowedHosts.some(
      (ah) => host === ah.toLowerCase() || host.endsWith('.' + ah.toLowerCase())
    );
    return isAllowed ? parsed.href : null;
  } catch {
    return null;
  }
}
