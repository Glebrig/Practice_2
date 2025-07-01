import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";
import Overlay from "ol/Overlay";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";

// Получаем формы переключателей
const infoToggleForm = document.getElementById('infoToggle');
const layersForm = document.getElementById('layers');

function shouldShowCoords() {
  if (!infoToggleForm) return true;
  const checked = infoToggleForm.querySelector('input[name="showCoords"]:checked');
  return checked && checked.value === 'yes';
}

// Создаем карту
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: fromLonLat([36.2754, 54.5293]), // Москва по умолчанию
    zoom: 10
  })
});

// Popup
const popup = document.getElementById("popup");
const popupContent = document.getElementById("popup-content");
const overlay = new Overlay({
  element: popup,
  positioning: "bottom-center",
  offset: [0, -4],
});
map.addOverlay(overlay);

// Первый слой — GeoJSON
const vectorSource1 = new VectorSource({
  url: './src/my.geojson',
  format: new GeoJSON(),
});
const vectorLayer1 = new VectorLayer({
  source: vectorSource1,
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "./marker0.png",
    }),
  }),
});
map.addLayer(vectorLayer1);

// Второй слой — из CSV
const vectorSource2 = new VectorSource();
const vectorLayer2 = new VectorLayer({
  source: vectorSource2,
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "./marker0.png", // Можно заменить на другой маркер
    }),
  }),
});
map.addLayer(vectorLayer2);

// Третий слой — из kaluga.json
const vectorSource3 = new VectorSource({
  url: './src/kaluga.geojson',
  format: new GeoJSON(),
});
const vectorLayer3 = new VectorLayer({
  source: vectorSource3,
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "./marker.png", 
    }),
  }),
});
map.addLayer(vectorLayer3);

// Парсим CSV и загружаем во второй слой
async function loadCSVtoLayer(url, source) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split('\n');
  const headers = lines[0].split(';').map(h => h.trim());

  source.clear();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(';').map(cell => cell.trim());
    if (row.length !== headers.length) continue;

    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx]);

    const lon = parseFloat(obj.lon);
    const lat = parseFloat(obj.lat);
    if (isNaN(lon) || isNaN(lat)) continue;

    const feature = new Feature({
      geometry: new Point(fromLonLat([lon, lat])),
      properties: obj,
      name: obj.name_ru || obj.name_en || 'Без имени',
      description: `Direction: ${obj.direction}, Time: ${obj.time}`,
    });

    feature.setProperties(obj);

    source.addFeature(feature);
  }
}
loadCSVtoLayer('./src/my.csv', vectorSource2);

// Функция обновления popup
function updatePopupContent() {
  if (!overlay.getPosition()) return;

  const coordinate = overlay.getPosition();
  let featureAtPos = null;
  map.forEachFeatureAtPixel(
    map.getPixelFromCoordinate(coordinate),
    feature => {
      featureAtPos = feature;
      return true;
    }
  );

  if (featureAtPos) {
    const props = featureAtPos.getProperties();
    let html = `<b>${props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    }
    popupContent.innerHTML = html;
    popup.style.display = 'block';
  } else {
    if (!shouldShowCoords()) {
      popup.style.display = 'none';
      overlay.setPosition(undefined);
      return;
    }
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = 'block';
  }
}

// Обработка клика по карте
map.on("click", event => {
  let featureFound = false;

  map.forEachFeatureAtPixel(event.pixel, feature => {
    featureFound = true;
    const geometry = feature.getGeometry();
    const coord = geometry.getCoordinates();
    const props = feature.getProperties();

    let html = `<b>${props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
    }

    popupContent.innerHTML = html;
    popup.style.display = 'block';
    overlay.setPosition(coord);
    return true;
  });

  if (!featureFound) {
    if (!shouldShowCoords()) {
      popup.style.display = 'none';
      overlay.setPosition(undefined);
      return;
    }

    const [lon, lat] = toLonLat(event.coordinate);
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)([lon, lat])}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = 'block';
    overlay.setPosition(event.coordinate);
  }
});

// Обновляем popup при смене переключателя координат
if (infoToggleForm) {
  infoToggleForm.addEventListener('change', () => {
    updatePopupContent();
  });
}

// Обработка переключения слоев и центрирования карты
if (layersForm) {
  layersForm.addEventListener('change', () => {
    const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;

    if (selected === 'layer1') {
      vectorLayer1.setVisible(true);
      vectorLayer2.setVisible(false);
      vectorLayer3.setVisible(false);
      map.getView().animate({ center: fromLonLat([-77.031950, 38.907826]), zoom: 11 }); // Вашингтон
    } else if (selected === 'layer2') {
      vectorLayer1.setVisible(false);
      vectorLayer2.setVisible(true);
      vectorLayer3.setVisible(false);
      map.getView().animate({ center: fromLonLat([37.6173, 55.7558]), zoom: 10 }); // Москва
    } else if (selected === 'layer3') {
      vectorLayer1.setVisible(false);
      vectorLayer2.setVisible(false);
      vectorLayer3.setVisible(true);
      map.getView().animate({ center: fromLonLat([36.3, 54.5]), zoom: 10 }); // Калуга
    }

    popup.style.display = 'none';
    overlay.setPosition(undefined);
  });
}

// Инициализация видимости слоев (по умолчанию показываем первый слой)
vectorLayer1.setVisible(false);
vectorLayer2.setVisible(false);
vectorLayer3.setVisible(true);
