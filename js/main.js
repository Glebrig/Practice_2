import { map, overlay } from "./map.js";
import layersConfig from "./layers.js";
import { renderObjectsTable } from "./table.js";
import { updatePopupContent, handleMapClick } from "./popup.js";
import { saveView, loadView, saveSelectedLayer, loadSelectedLayer, saveTableVisibility, loadTableVisibility, saveFilter, loadFilter } from "./storage.js";
import { getFilteredStyle } from "./filter.js";
import { fromLonLat, toLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { createStringXY } from "ol/coordinate";
import { startPresentationTour, stopPresentationTour, isTourActive } from "./presentation.js";

// --- Глобальные переменные ---
window.currentFilter = loadFilter();
window.getFilteredStyle = (feature, baseStyle) => getFilteredStyle(feature, baseStyle, window.currentFilter);

// --- Получаем элементы форм ---
const infoToggleForm = document.getElementById("infoToggle");
const tableToggleForm = document.getElementById("tableToggle");
const layersForm = document.getElementById("layers");
const filterContainer = document.getElementById("filter-container");
const filterInput = document.getElementById("object-filter");

// --- Генерация radio-кнопок слоёв ---
function renderLayerRadios() {
  layersForm.innerHTML = "";
  layersConfig.forEach((layer, idx) => {
    const checked = (idx === layersConfig.length - 1) ? "checked" : "";
    layersForm.innerHTML +=
      `<label><input type="radio" name="showLayer" value="${layer.id}" ${checked}/> ${layer.title}</label><br/>`;
  });
}
renderLayerRadios();

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
  const headers = lines[0].split(";").map(h => h.trim());
  source.clear();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(";").map(cell => cell.trim());
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

// --- Определение, показывать ли координаты ---
function shouldShowCoords() {
  if (!infoToggleForm) return true;
  const checked = infoToggleForm.querySelector('input[name="showCoords"]:checked');
  return checked && checked.value === "yes";
}

// --- Получить индекс активного слоя ---
function getActiveLayerIndex() {
  const selected = layersForm.querySelector('input[name="showLayer"]:checked').value;
  return layersConfig.findIndex(layer => layer.id === selected);
}

// --- Переключение слоёв ---
function switchLayer(selectedId) {
  layersConfig.forEach(layer => {
    layer.vectorLayer.setVisible(layer.id === selectedId);
    if (layer.id === selectedId) {
      map.getView().animate({
        center: fromLonLat(layer.center),
        zoom: layer.zoom
      }, () => {
        const view = map.getView();
        saveView(toLonLat(view.getCenter()), view.getZoom());
      });
      renderObjectsTable(layer.source, window.currentFilter, getActiveLayerIndex);
    }
  });
  document.getElementById("popup").style.display = "none";
  overlay.setPosition(undefined);
  if (filterInput) filterInput.value = window.currentFilter;
  layersConfig.forEach(l => l.vectorLayer.changed());
}

// --- Переключение слоя без анимации ---
function showLayerWithoutAnimation(selectedId) {
  layersConfig.forEach(layer => {
    layer.vectorLayer.setVisible(layer.id === selectedId);
    if (layer.id === selectedId) {
      renderObjectsTable(layer.source, window.currentFilter, getActiveLayerIndex);
    }
  });
  document.getElementById("popup").style.display = "none";
  overlay.setPosition(undefined);
  if (filterInput) filterInput.value = window.currentFilter;
  layersConfig.forEach(l => l.vectorLayer.changed());
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

// --- Выделение строки таблицы ---
export function highlightTableRow(layerIdx, id) {
  const table = document.getElementById("objects-table");
  if (!table) return;
  const prev = table.querySelector("tr.highlighted");
  if (prev) prev.classList.remove("highlighted");
  const row = table.querySelector(`tr[data-id="${id}"][data-layer="${layerIdx}"]`);
  if (row) {
    row.classList.add("highlighted");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    console.warn(`Строка с data-id="${id}" и data-layer="${layerIdx}" не найдена в таблице`);
  }
}

// --- Показать таблицу и отрисовать ---
export function showTableAndRender(layerIdx, filter) {
  updateTableVisibility(true);
  const layer = layersConfig[layerIdx];
  renderObjectsTable(layer.source, filter || "", () => layerIdx);
}

// --- Инициализация ---
loadCSVtoLayer("./src/my.csv", layersConfig[1].source).then(() => {
  const savedLayer = loadSelectedLayer();
  const initialLayerId = (savedLayer && layersConfig.some(l => l.id === savedLayer)) ? savedLayer : layersConfig[layersConfig.length - 1].id;
  const radio = layersForm.querySelector(`input[name="showLayer"][value="${initialLayerId}"]`);
  if (radio) radio.checked = true;
  showLayerWithoutAnimation(initialLayerId);

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

// --- Обработчики ---
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
if (filterInput) {
  filterInput.value = window.currentFilter;
  filterInput.addEventListener("input", () => {
    window.currentFilter = filterInput.value;
    saveFilter(window.currentFilter);
    const idx = getActiveLayerIndex();
    const source = layersConfig[idx].source;
    layersConfig[idx].vectorLayer.changed();
    renderObjectsTable(source, window.currentFilter, getActiveLayerIndex);
  });
}

// --- Приближение к объекту из таблицы ---
window.zoomToFeature = function ({ layer, id }) {
  const idx = typeof layer === "number" ? layer : parseInt(layer);
  if (idx < 0 || idx >= layersConfig.length) return;
  const source = layersConfig[idx].source;
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

// --- Кнопка режима презентации ---
const presentationBtn = document.getElementById("presentation-btn");
if (presentationBtn) {
  presentationBtn.addEventListener("click", () => {
    const idx = getActiveLayerIndex();
    if (isTourActive()) stopPresentationTour();
    else startPresentationTour(idx);
  });
}