import { map, overlay } from "./map.js";
import { vectorSource1, vectorSource2, vectorSource3, vectorLayer1, vectorLayer2, vectorLayer3 } from "./layers.js";
import { renderObjectsTable } from "./table.js";
import { updatePopupContent, handleMapClick } from "./popup.js";
import { saveView, loadView, saveSelectedLayer, loadSelectedLayer, saveTableVisibility, loadTableVisibility, saveFilter, loadFilter } from "./storage.js";
import { getFilteredStyle } from "./filter.js";
import { fromLonLat, toLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { createStringXY } from "ol/coordinate";

// --- Глобальные переменные ---
window.currentFilter = loadFilter();
window.getFilteredStyle = (feature, baseStyle) => getFilteredStyle(feature, baseStyle, window.currentFilter);

// --- Получаем элементы форм ---
const infoToggleForm = document.getElementById("infoToggle");
const tableToggleForm = document.getElementById("tableToggle");
const layersForm = document.getElementById("layers");
const filterContainer = document.getElementById("filter-container");
const filterInput = document.getElementById("object-filter");

// --- Сохраняем позицию карты при изменении центра и масштаба ---
map.getView().on('change:center', () => {
  const view = map.getView();
  saveView(toLonLat(view.getCenter()), view.getZoom());
});
map.getView().on('change:resolution', () => {
  const view = map.getView();
  saveView(toLonLat(view.getCenter()), view.getZoom());
});

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

// --- Функция для определения, показывать ли координаты ---
function shouldShowCoords() {
  if (!infoToggleForm) return true;
  const checked = infoToggleForm.querySelector('input[name="showCoords"]:checked');
  return checked && checked.value === "yes";
}

// --- Функция генерации таблицы ---
function getActiveLayerIndex() {
  const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;
  if (selected === "layer1") return 1;
  if (selected === "layer2") return 2;
  if (selected === "layer3") return 3;
  return 3;
}

// --- Переключение слоев ---
function switchLayer(selected) {
  let targetCenter, targetZoom;
  if (selected === "layer1") {
    vectorLayer1.setVisible(true);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(false);
    targetCenter = fromLonLat([-77.03195, 38.907826]);
    targetZoom = 11;
    renderObjectsTable(vectorSource1, window.currentFilter, getActiveLayerIndex);
  } else if (selected === "layer2") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(true);
    vectorLayer3.setVisible(false);
    targetCenter = fromLonLat([37.6173, 55.7558]);
    targetZoom = 10;
    renderObjectsTable(vectorSource2, window.currentFilter, getActiveLayerIndex);
  } else if (selected === "layer3") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(true);
    targetCenter = fromLonLat([36.3, 54.5]);
    targetZoom = 10;
    renderObjectsTable(vectorSource3, window.currentFilter, getActiveLayerIndex);
  }
  map.getView().animate({ center: targetCenter, zoom: targetZoom }, () => {
    const view = map.getView();
    saveView(toLonLat(view.getCenter()), view.getZoom());
  });
  document.getElementById("popup").style.display = "none";
  overlay.setPosition(undefined);
  if (filterInput) filterInput.value = window.currentFilter;
  vectorLayer1.changed();
  vectorLayer2.changed();
  vectorLayer3.changed();
}

// --- Функция переключения слоя без анимации ---
function showLayerWithoutAnimation(selected) {
  if (selected === "layer1") {
    vectorLayer1.setVisible(true);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(false);
    renderObjectsTable(vectorSource1, window.currentFilter, getActiveLayerIndex);
  } else if (selected === "layer2") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(true);
    vectorLayer3.setVisible(false);
    renderObjectsTable(vectorSource2, window.currentFilter, getActiveLayerIndex);
  } else if (selected === "layer3") {
    vectorLayer1.setVisible(false);
    vectorLayer2.setVisible(false);
    vectorLayer3.setVisible(true);
    renderObjectsTable(vectorSource3, window.currentFilter, getActiveLayerIndex);
  }
  document.getElementById("popup").style.display = "none";
  overlay.setPosition(undefined);
  if (filterInput) filterInput.value = window.currentFilter;
  vectorLayer1.changed();
  vectorLayer2.changed();
  vectorLayer3.changed();
}

// --- Управление видимостью таблицы и фильтра ---
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
      tableContainer.style.height = 'auto';
      tableContainer.style.display = 'block';
      if (filterContainer) filterContainer.style.display = "block";
    } else {
      tableContainer.style.height = '0';
      tableContainer.style.display = 'none';
      if (filterContainer) filterContainer.style.display = 'none';
    }
    map.updateSize();
  }
  saveTableVisibility(showTable);
}

// --- Инициализация ---
loadCSVtoLayer("./src/my.csv", vectorSource2).then(() => {
  const savedLayer = loadSelectedLayer();
  const savedCenter = localStorage.getItem('mapCenter');
  const savedZoom = localStorage.getItem('mapZoom');
  if (savedCenter && savedZoom) {
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
  const savedTableVisibility = loadTableVisibility();
  if (savedTableVisibility === 'yes' || savedTableVisibility === 'no') {
    updateTableVisibility(savedTableVisibility === 'yes');
  } else {
    updateTableVisibility(true);
  }
  if (filterInput) {
    filterInput.value = window.currentFilter;
    filterInput.dispatchEvent(new Event("input"));
  }
});

// --- Обработчики переключателей ---
if (layersForm) {
  layersForm.addEventListener("change", () => {
    const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;
    switchLayer(selected);
    saveSelectedLayer(selected);
  });
}
if (infoToggleForm) {
  infoToggleForm.addEventListener("change", () => {
    updatePopupContent(shouldShowCoords());
  });
}
if (tableToggleForm) {
  tableToggleForm.addEventListener('change', () => {
    updateTableVisibility();
  });
}

// --- Фильтр по названию ---
if (filterInput) {
  filterInput.value = window.currentFilter;
  filterInput.addEventListener("input", () => {
    window.currentFilter = filterInput.value;
    saveFilter(window.currentFilter);
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
    renderObjectsTable(source, window.currentFilter, getActiveLayerIndex);
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
  document.getElementById("popup-content").innerHTML = html;
  document.getElementById("popup").style.display = "block";
};

// --- Popup обработка клика ---
handleMapClick(shouldShowCoords);