import { getFilteredFeatures } from "./filter.js";
import { columnNamesLayer1, columnNamesLayer2, columnNamesLayer3 } from "./constants.js";
import { vectorSource1, vectorSource2, vectorSource3 } from "./layers.js";

export function renderObjectsTable(source, currentFilter, getActiveLayerIndex) {
  const container = document.getElementById("objects-table");
  if (!container) return;

  const features = getFilteredFeatures(source, currentFilter);
  if (!features.length) {
    container.innerHTML = '<p>Нет данных для отображения</p>';
    return;
  }

  const allProps = features.map((f) => f.getProperties());
  let keys = Object.keys(allProps[0]).filter((k) => k !== "geometry");
  if (source === vectorSource2) keys = keys.filter(k => k !== "name");

  let columnNames;
  if (source === vectorSource1) columnNames = columnNamesLayer1;
  else if (source === vectorSource2) columnNames = columnNamesLayer2;
  else if (source === vectorSource3) columnNames = columnNamesLayer3;
  else columnNames = {};

  const layerIndex = getActiveLayerIndex();

  let html = '<table><thead><tr>';
  keys.forEach((key) => {
    const colName = columnNames[key] || key;
    html += `<th>${colName}</th>`;
  });
  html += "<th>Действие</th></tr></thead><tbody>";

  features.forEach((f) => {
    html += `<tr data-id="${f.getId()}" data-layer="${layerIndex}">`;
    keys.forEach((key) => (html += `<td>${f.get(key) ?? ""}</td>`));
    html += `<td><button class="table" onclick="window.zoomToFeature({layer: ${layerIndex}, id: '${f.getId()}'})">Показать</button></td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}