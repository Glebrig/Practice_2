import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Overlay from "ol/Overlay";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { fromLonLat, toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";

// --- Получаем элементы форм ---
const infoToggleForm = document.getElementById("infoToggle");
const tableToggleForm = document.getElementById("tableToggle");
const layersForm = document.getElementById("layers");
const filterContainer = document.getElementById("filter-container");
const filterInput = document.getElementById("object-filter");

// --- Фильтр ---
let currentFilter = localStorage.getItem("objectFilter") || "";

// --- Загрузка сохранённого центра и масштаба ---
const savedCenter = localStorage.getItem('mapCenter');
const savedZoom = localStorage.getItem('mapZoom');

let initialCenter;
let initialZoom;

try {
  if (savedCenter) {
    const centerArray = JSON.parse(savedCenter);
    if (Array.isArray(centerArray) && centerArray.length === 2) {
      initialCenter = fromLonLat(centerArray);
    }
  }
} catch (e) {
  console.warn('Ошибка при парсинге сохранённого центра карты:', e);
}

initialZoom = savedZoom ? Number(savedZoom) : 10;

if (!initialCenter) {
  initialCenter = fromLonLat([36.2754, 54.5293]);
}

// --- Создаем карту ---
const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: initialCenter,
    zoom: initialZoom,
  }),
});

// --- Сохраняем позицию карты при изменении центра и масштаба ---
map.getView().on('change:center', saveView);
map.getView().on('change:resolution', saveView);

function saveView() {
  const view = map.getView();
  const center = toLonLat(view.getCenter());
  const zoom = view.getZoom();
  try {
    localStorage.setItem('mapCenter', JSON.stringify(center));
    localStorage.setItem('mapZoom', zoom.toString());
  } catch (e) {
    console.warn('Ошибка при сохранении позиции карты:', e);
  }
}

// --- Popup ---
const popup = document.getElementById("popup");
const popupContent = document.getElementById("popup-content");
const overlay = new Overlay({
  element: popup,
  positioning: "bottom-center",
  offset: [0, -15],
});
map.addOverlay(overlay);

// --- Слои и источники ---

// 1. Вашингтон — GeoJSON
const vectorSource1 = new VectorSource({
  url: "./src/my.geojson",
  format: new GeoJSON(),
});
const baseStyle1 = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: "./marker0.png",
  }),
});
const vectorLayer1 = new VectorLayer({
  source: vectorSource1,
  style: feature => getFilteredStyle(feature, baseStyle1),
});
map.addLayer(vectorLayer1);

// Назначаем уникальные id фичам layer1, если их нет
vectorSource1.once('change', () => {
  if (vectorSource1.getState() === 'ready') {
    let i = 0;
    vectorSource1.getFeatures().forEach((feature) => {
      if (!feature.getId()) {
        feature.setId(`layer1-feature-${i++}`);
      }
    });
  }
});

// 2. Москва — CSV (будет загружен вручную)
const vectorSource2 = new VectorSource();
const baseStyle2 = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: "./marker0.png",
  }),
});
const vectorLayer2 = new VectorLayer({
  source: vectorSource2,
  style: feature => getFilteredStyle(feature, baseStyle2),
});
map.addLayer(vectorLayer2);

// 3. Калуга — GeoJSON с разными маркерами по group_obj
const vectorSource3 = new VectorSource({
  url: "./src/kaluga.geojson",
  format: new GeoJSON(),
});

// Функция выбора стиля для третьего слоя по group_obj
function styleForGroupObj(feature) {
  const group = feature.get('group_obj');
  let iconSrc;

  switch (group) {
    case "Ландшафтные объекты":
      iconSrc = "./marker_landshaft.png";
      break;
    case "Водные объекты":
      iconSrc = "./marker.png";
      break;
    case "Историко-культурные объекты":
      iconSrc = "./marker_iko.png";
      break;
    case "Лесные массивы":
      iconSrc = "./marker_les.png";
      break;
    default:
      iconSrc = "./marker_other.png";
  }

  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: iconSrc,
    }),
  });
}

const vectorLayer3 = new VectorLayer({
  source: vectorSource3,
  style: feature => {
    if (!currentFilter) return styleForGroupObj(feature);
    const props = feature.getProperties();
    const filterText = currentFilter.trim().toLowerCase();
    const searchFields = ["name"];
    const matched = searchFields.some(field => {
      const val = (props[field] || "").toLowerCase();
      return val.includes(filterText);
    });
    return matched ? styleForGroupObj(feature) : null;
  },
});
map.addLayer(vectorLayer3);

// --- Функция загрузки CSV ---
async function loadCSVtoLayer(url, source) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(";").map((h) => h.trim());

  source.clear();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(";").map((cell) => cell.trim());
    if (row.length !== headers.length) continue;

    const obj = {};
    headers.forEach((h, idx) => (obj[h] = row[idx]));

    const lon = parseFloat(obj.lon);
    const lat = parseFloat(obj.lat);
    if (isNaN(lon) || isNaN(lat)) continue;

    const feature = new Feature({
      geometry: new Point(fromLonLat([lon, lat])),
      name: obj.Название_ru
    });

    feature.setId(obj.id || `${lat},${lon}`);
    feature.setProperties(obj);
    source.addFeature(feature);
  }
}

// --- Фильтрация features с учётом разных полей для разных слоёв ---
function getFilteredFeatures(source) {
  const features = source.getFeatures();
  if (!currentFilter) return features;
  const filterText = currentFilter.trim().toLowerCase();

  let searchFields = [];

  if (source === vectorSource2) {
    searchFields = ["Название_ru", "Name_en"];
  } else {
    searchFields = ["name"];
  }

  return features.filter(f => {
    const props = f.getProperties();
    return searchFields.some(field => {
      const val = (props[field] || "").toLowerCase();
      return val.includes(filterText);
    });
  });
}

// --- Фильтрация стилей ---
function getFilteredStyle(feature, baseStyle) {
  if (!currentFilter) return baseStyle;
  const props = feature.getProperties();
  const filterText = currentFilter.trim().toLowerCase();

  let searchFields = [];
  if (props["Название_ru"] !== undefined || props["Name_en"] !== undefined) {
    searchFields = ["Название_ru", "Name_en"];
  } else {
    searchFields = ["name"];
  }

  const matched = searchFields.some(field => {
    const val = (props[field] || "").toLowerCase();
    return val.includes(filterText);
  });

  return matched ? baseStyle : null;
}

// --- Функция для определения, показывать ли координаты ---
function shouldShowCoords() {
  if (!infoToggleForm) return true;
  const checked = infoToggleForm.querySelector('input[name="showCoords"]:checked');
  return checked && checked.value === "yes";
}

// --- Обновление popup ---
function updatePopupContent() {
  if (!overlay.getPosition()) return;

  const coordinate = overlay.getPosition();
  let featureAtPos = null;
  map.forEachFeatureAtPixel(map.getPixelFromCoordinate(coordinate), (feature) => {
    featureAtPos = feature;
    return true;
  });

  if (featureAtPos) {
    const props = featureAtPos.getProperties();
    let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    }
    popupContent.innerHTML = html;
    popup.style.display = "block";
  } else {
    if (!shouldShowCoords()) {
      popup.style.display = "none";
      overlay.setPosition(undefined);
      return;
    }
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = "block";
  }
}

// --- Обработка клика по карте ---
map.on("click", (event) => {
  let featureFound = false;

  map.forEachFeatureAtPixel(event.pixel, (feature) => {
    featureFound = true;
    const geometry = feature.getGeometry();
    const coord = geometry.getCoordinates();
    const props = feature.getProperties();

    let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
    }

    popupContent.innerHTML = html;
    popup.style.display = "block";
    overlay.setPosition(coord);
    return true;
  });

  if (!featureFound) {
    if (!shouldShowCoords()) {
      popup.style.display = "none";
      overlay.setPosition(undefined);
      return;
    }

    const [lon, lat] = toLonLat(event.coordinate);
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)([lon, lat])}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = "block";
    overlay.setPosition(event.coordinate);
  }
});

// --- Функция генерации таблицы ---
function getActiveLayerIndex() {
  const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;
  if (selected === "layer1") return 1;
  if (selected === "layer2") return 2;
  if (selected === "layer3") return 3;
  return 3;
}

function renderObjectsTable(source) {
  const container = document.getElementById("objects-table");
  if (!container) return;

  const features = getFilteredFeatures(source);
  if (!features.length) {
    container.innerHTML = "<br>Нет данных для отображения" ;
    return;
  }

  const allProps = features.map((f) => f.getProperties());
  const keys = Object.keys(allProps[0]).filter((k) => k !== "geometry");

  let html = '<table><thead><tr>';
  keys.forEach((key) => (html += `<th>${key}</th>`));
  html += "<th>Действие</th></tr></thead><tbody>";

  features.forEach((f) => {
    html += "<tr>";
    keys.forEach((key) => (html += `<td>${f.get(key) ?? ""}</td>`));
    html += `<td><button onclick="zoomToFeature({layer: ${getActiveLayerIndex()}, id: '${f.getId()}'})">Показать</button></td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// --- Переключение слоев с изменением позиции карты и сохранением ---
function switchLayer(selected) {
  let targetCenter;
  let targetZoom;

  if (selected === "layer1") {
    vectorLayer1.setVisible(true);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(false);
    targetCenter = fromLonLat([-77.03195, 38.907826]);
    targetZoom = 11;
    renderObjectsTable(vectorSource1);
  } else if (selected === "layer2") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(true);
    vectorLayer3.setVisible(false);
    targetCenter = fromLonLat([37.6173, 55.7558]);
    targetZoom = 10;
    renderObjectsTable(vectorSource2);
  } else if (selected === "layer3") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(true);
    targetCenter = fromLonLat([36.3, 54.5]);
    targetZoom = 10;
    renderObjectsTable(vectorSource3);
  }

  map.getView().animate({ center: targetCenter, zoom: targetZoom }, () => {
    const view = map.getView();
    const center = toLonLat(view.getCenter());
    const zoom = view.getZoom();
    localStorage.setItem('mapCenter', JSON.stringify(center));
    localStorage.setItem('mapZoom', zoom.toString());
  });

  popup.style.display = "none";
  overlay.setPosition(undefined);

  if (filterInput) filterInput.value = currentFilter;
  vectorLayer1.changed();
  vectorLayer2.changed();
  vectorLayer3.changed();
}

// --- Функция переключения слоя без анимации (для инициализации с сохранённой позицией) ---
function showLayerWithoutAnimation(selected) {
  if (selected === "layer1") {
    vectorLayer1.setVisible(true);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(false);
    renderObjectsTable(vectorSource1);
  } else if (selected === "layer2") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(true);
    vectorLayer3.setVisible(false);
    renderObjectsTable(vectorSource2);
  } else if (selected === "layer3") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(true);
    renderObjectsTable(vectorSource3);
  }
  popup.style.display = "none";
  overlay.setPosition(undefined);

  if (filterInput) filterInput.value = currentFilter;
  vectorLayer1.changed();
  vectorLayer2.changed();
  vectorLayer3.changed();
}

// --- Управление видимостью таблицы и фильтра ---
const STORAGE_KEY_LAYER = 'selectedMapLayer';
const STORAGE_KEY_TABLE = 'tableVisibility';

function updateTableVisibility(forceShow) {
  const tableContainer = document.getElementById('objects-table');
  const mapContainer = document.getElementById('map');
  let showTable;

  if (typeof forceShow === 'boolean') {
    showTable = forceShow;
    const radioToCheck = tableToggleForm.querySelector(`input[name="showTable"][value="${showTable ? 'yes' : 'no'}"]`);
    if (radioToCheck) radioToCheck.checked = true;
  } else {
    showTable = tableToggleForm.querySelector('input[name="showTable"]:checked').value === 'yes';
  }

  if (tableContainer && mapContainer) {
    if (showTable) {
      tableContainer.style.height = '300px';
      tableContainer.style.display = 'block';
      if (filterContainer) filterContainer.style.display = "block";
    } else {
      tableContainer.style.height = '0';
      tableContainer.style.display = 'none';
      if (filterContainer) filterContainer.style.display = 'none';
    }
    map.updateSize();
  }

  localStorage.setItem(STORAGE_KEY_TABLE, showTable ? 'yes' : 'no');
}

// --- Сохранение/загрузка выбранного слоя и фильтра ---
function saveSelectedLayer(layerValue) {
  localStorage.setItem(STORAGE_KEY_LAYER, layerValue);
}

function loadSelectedLayer() {
  return localStorage.getItem(STORAGE_KEY_LAYER);
}

function loadSelectedTableVisibility() {
  return localStorage.getItem(STORAGE_KEY_TABLE);
}

// --- Инициализация ---
loadCSVtoLayer("./src/my.csv", vectorSource2).then(() => {
  const savedLayer = loadSelectedLayer();
  const savedCenter = localStorage.getItem('mapCenter');
  const savedZoom = localStorage.getItem('mapZoom');

  if (savedCenter && savedZoom) {
    // Есть сохранённая позиция — показываем слой без анимации центра
    if (savedLayer) {
      const radio = layersForm.querySelector(`input[name="showLayer"][value="${savedLayer}"]`);
      if (radio) {
        radio.checked = true;
        showLayerWithoutAnimation(savedLayer);
      } else {
        showLayerWithoutAnimation('layer3');
      }
    } else {
      showLayerWithoutAnimation('layer3');
    }
  } else {
    // Нет сохранённой позиции — переключаем слой с анимацией центра
    if (savedLayer) {
      const radio = layersForm.querySelector(`input[name="showLayer"][value="${savedLayer}"]`);
      if (radio) {
        radio.checked = true;
        switchLayer(savedLayer);
      } else {
        switchLayer('layer3');
      }
    } else {
      switchLayer('layer3');
    }
  }

  const savedTableVisibility = loadSelectedTableVisibility();
  if (savedTableVisibility === 'yes' || savedTableVisibility === 'no') {
    updateTableVisibility(savedTableVisibility === 'yes');
  } else {
    updateTableVisibility(true);
  }

  if (filterInput) {
    filterInput.value = currentFilter;
    filterInput.dispatchEvent(new Event("input"));
  }
});

// Обработчики переключателей
if (layersForm) {
  layersForm.addEventListener("change", () => {
    const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;
    switchLayer(selected);
    saveSelectedLayer(selected);
  });
}

if (infoToggleForm) {
  infoToggleForm.addEventListener("change", () => {
    updatePopupContent();
  });
}

if (tableToggleForm) {
  tableToggleForm.addEventListener('change', () => {
    updateTableVisibility();
  });
}

// --- Фильтр по названию ---
if (filterInput) {
  filterInput.value = currentFilter;
  filterInput.addEventListener("input", () => {
    currentFilter = filterInput.value;
    localStorage.setItem("objectFilter", currentFilter);
    const idx = getActiveLayerIndex();
    let source;
    if (idx === 1) {
      source = vectorSource1;
      vectorLayer1.changed();
    } else if (idx === 2) {
      source = vectorSource2;
      vectorLayer2.changed();
    } else {
      source = vectorSource3;
      vectorLayer3.changed();
    }
    renderObjectsTable(source);
  });
}

// --- Функция приближения к объекту из таблицы ---
window.zoomToFeature = function ({ layer, id }) {
  let source;
  if (layer === 1) source = vectorSource1;
  else if (layer === 2) source = vectorSource2;
  else if (layer === 3) source = vectorSource3;
  else return;

  const feature = source.getFeatureById(id);
  if (!feature) {
    console.warn(`Feature with id=${id} not found in layer ${layer}`);
    return;
  }

  const geometry = feature.getGeometry();
  if (!geometry) {
    console.warn('Feature geometry is missing');
    return;
  }

  const view = map.getView();

  view.fit(geometry, {
    padding: [50, 50, 50, 50],
    maxZoom: 15,
    duration: 1000,
  });
  overlay.setPosition(geometry.getCoordinates());

  const props = feature.getProperties();
  let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
  if (shouldShowCoords()) {
    const coord = geometry.getCoordinates();
    html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
  }
  popupContent.innerHTML = html;
  popup.style.display = "block";
};
