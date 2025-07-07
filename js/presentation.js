import { map, overlay } from "./map.js";
import layersConfig from "./layers.js";
import { createStringXY } from "ol/coordinate";
import { toLonLat } from "ol/proj";
import { highlightTableRow, showTableAndRender } from "./main.js";
import { loadFilter, loadTableVisibility, saveFilter, saveTableVisibility } from "./storage.js";

let tourActive = false;
let tourTimeout = null;
let tourIndex = 0;
let tourFeatures = [];
let tourLayer = layersConfig.length - 1;

let savedFilter = "";
let savedTableVisible = true;

function getCurrentSource() {
  return layersConfig[tourLayer].source;
}

function showFeature(feature) {
  const geometry = feature.getGeometry();
  if (!geometry) return;
  map.getView().animate({
    center: geometry.getCoordinates(),
    zoom: 15,
    duration: 1000
  });
  overlay.setPosition(geometry.getCoordinates());
  const props = feature.getProperties();
  let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
  const coord = geometry.getCoordinates();
  html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
  document.getElementById("popup-content").innerHTML = html;
  document.getElementById("popup").style.display = "block";

  highlightTableRow(tourLayer, feature.getId());
}

function nextTourStep() {
  if (!tourActive || tourFeatures.length === 0) return;
  showFeature(tourFeatures[tourIndex]);
  tourIndex = (tourIndex + 1) % tourFeatures.length;
  tourTimeout = setTimeout(nextTourStep, 2500);
}

export function startPresentationTour(layerIndex) {
  if (tourActive) {
    stopPresentationTour();
    return;
  }
  tourLayer = layerIndex;
  tourFeatures = getCurrentSource().getFeatures().filter(f => f.getGeometry());
  if (tourFeatures.length === 0) return;

  savedFilter = loadFilter();
  savedTableVisible = loadTableVisibility() === 'yes';

  showTableAndRender(tourLayer, "");

  tourActive = true;
  tourIndex = 0;
  nextTourStep();
  document.getElementById("presentation-btn").textContent = "Остановить презентацию";
}

export function stopPresentationTour() {
  tourActive = false;
  if (tourTimeout) clearTimeout(tourTimeout);
  document.getElementById("presentation-btn").textContent = "Режим презентации";

  const table = document.getElementById("objects-table");
  if (table) {
    const prev = table.querySelector("tr.highlighted");
    if (prev) prev.classList.remove("highlighted");
  }

  saveFilter(savedFilter);
  saveTableVisibility(savedTableVisible ? 'yes' : 'no');

  window.currentFilter = savedFilter;
  const filterInput = document.getElementById("object-filter");
  if (filterInput) filterInput.value = savedFilter;

  if (savedTableVisible) {
    showTableAndRender(tourLayer, savedFilter);
  } else {
    const tableToggleForm = document.getElementById("tableToggle");
    if (tableToggleForm) {
      const radioNo = tableToggleForm.querySelector('input[name="showTable"][value="no"]');
      if (radioNo) radioNo.checked = true;
    }
    const tableContainer = document.getElementById('objects-table');
    const filterContainer = document.getElementById('filter-container');
    if (tableContainer) {
      tableContainer.style.display = 'none';
      tableContainer.style.height = '0';
    }
    if (filterContainer) {
      filterContainer.style.display = 'none';
    }
    layersConfig.forEach(l => l.vectorLayer.changed());
  }
}

export function isTourActive() {
  return tourActive;
}

map.on('pointerdown', () => {
  if (tourActive) stopPresentationTour();
});