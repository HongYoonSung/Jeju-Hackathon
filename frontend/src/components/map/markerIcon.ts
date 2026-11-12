import L from 'leaflet';
import { CrowdInfo } from '../../types/api';

/**
 * 오프라인 매장용 원형 마커 아이콘 생성
 * 지름 28px(선택 시 36px), 배경 = 혼잡도 색(없으면 --color-primary), 가운데 흰 숫자(순번), 흰 테두리 2px + 그림자
 */
export function createStoreMarkerIcon(
  displayIndex: number,
  crowd?: CrowdInfo | null,
  isSelected = false
): L.DivIcon {
  const size = isSelected ? 36 : 28;
  const fontSize = isSelected ? 14 : 12;

  let bgColor = '#234F9F'; // 기본 primary
  if (crowd && crowd.level) {
    // CSS 변수 이름을 직접 매핑
    if (crowd.level === 'low') bgColor = '#2E9E5B';
    else if (crowd.level === 'medium') bgColor = '#F2C200';
    else if (crowd.level === 'high') bgColor = '#F28A1B';
    else if (crowd.level === 'very_high') bgColor = '#E5352B';
  }

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${bgColor};
      color: #ffffff;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Pretendard', sans-serif;
      font-size: ${fontSize}px;
      font-weight: 700;
      transition: all 0.2s ease;
    ">
      ${displayIndex}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-store-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * 사용자 위치 마커: 파란 점(14px) + 반투명 파란 후광(32px)
 */
export function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        background-color: rgba(35, 79, 159, 0.25);
        border-radius: 50%;
        animation: pulse 2s infinite ease-out;
      "></div>
      <div style="
        position: relative;
        width: 14px;
        height: 14px;
        background-color: #234F9F;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/**
 * 길찾기 출발지 마커: 파란 원 + '출발' (SPEC 5.3.6)
 */
export function createOriginMarkerIcon(): L.DivIcon {
  const html = `
    <div style="
      padding: 4px 8px;
      background-color: #234F9F;
      color: #ffffff;
      border: 2px solid #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-family: 'Pretendard', sans-serif;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    ">
      출발
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-origin-marker',
    iconSize: [40, 24],
    iconAnchor: [20, 12],
  });
}
