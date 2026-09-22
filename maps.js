(async function () {
  'use strict';
  const shells = [...document.querySelectorAll('[data-map-index]')];
  const maps = new Map();
  let data;
  try {
    if (!window.L) throw new Error('Leaflet unavailable');
    const response = await fetch('map-data.json');
    if (!response.ok) throw new Error('Map data unavailable');
    data = await response.json();
  } catch (error) {
    shells.forEach(shell => { shell.querySelector('.map-status').textContent = '지도를 불러오지 못했습니다. 연결을 확인한 뒤 새로고침해주세요.'; });
    return;
  }
  function showVisible() {
    shells.filter(shell => shell.getBoundingClientRect().width > 0).forEach(shell => {
      const index = Number(shell.dataset.mapIndex);
      if (maps.has(index)) { maps.get(index).invalidateSize({pan: false}); return; }
      const {points, routes} = data[index];
      const element = shell.querySelector('.travel-map');
      const status = shell.querySelector('.map-status');
      const map = L.map(element, {zoomControl: false, dragging: true, touchZoom: true, scrollWheelZoom: false, maxZoom: 19});
      maps.set(index, map);
      L.control.zoom({position: 'bottomright', zoomInTitle: '지도 확대', zoomOutTitle: '지도 축소'}).addTo(map);
      const bounds = L.latLngBounds(points.map(point => point.latlng));
      function fit() { map.fitBounds(bounds, {paddingTopLeft: [32, 42], paddingBottomRight: [76, 64], maxZoom: index === 12 ? 7 : 12}); }
      const Reset = L.Control.extend({
        options: {position: 'topright'},
        onAdd() {
          const button = L.DomUtil.create('button', 'map-fit');
          button.type = 'button'; button.textContent = '전체 보기'; button.setAttribute('aria-label', '이 지도의 모든 방문지 보기');
          L.DomEvent.disableClickPropagation(button);
          L.DomEvent.on(button, 'click', fit);
          return button;
        }
      });
      new Reset().addTo(map);
      routes.forEach(route => L.polyline(route, {color: '#6550a2', weight: 3, opacity: 0.65, dashArray: '5 9'}).bindTooltip('방문 순서 · 실제 도로 경로가 아닙니다').addTo(map));
      points.forEach((point, order) => {
        const icon = L.divIcon({className: 'trip-marker', html: '<span class="trip-pin">' + (order + 1) + '</span>', iconSize: [40, 40], iconAnchor: [20, 20]});
        const label = document.createElement('span'); label.textContent = point.name;
        const popup = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = (order + 1) + '. ' + point.name; popup.append(title);
        L.marker(point.latlng, {icon, title: point.name, alt: point.name, riseOnHover: true})
          .bindPopup(popup).bindTooltip(label, {direction: 'top', offset: [0, -23], permanent: points.length <= 4}).addTo(map);
      });
      fit();
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      let loaded = false;
      tiles.on('tileload', () => { loaded = true; status.hidden = true; });
      tiles.on('tileerror', () => { if (!loaded) { status.hidden = false; status.textContent = '배경 지도를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.'; } });
      tiles.addTo(map);
      new ResizeObserver(() => map.invalidateSize({pan: false})).observe(element);
    });
  }
  document.querySelectorAll('input[name="daytab"], input[name="maintab"]').forEach(input => input.addEventListener('change', () => requestAnimationFrame(showVisible)));
  showVisible();
})();
