import { getFilteredFeatures } from "./filter.js";
import * as columnNames from "./constants.js";
import layersConfig from "./layers.js";

export function renderObjectsTable(source, currentFilter, getActiveLayerIndex) {
  const container = document.getElementById("objects-table");
  if (!container) return;

  const features = getFilteredFeatures(source, currentFilter);
  if (!features.length) {
    container.innerHTML = '<p>Нет данных для отображения</p>';
    return;
  }

  const allProps = features.map(f => f.getProperties());
  let keys = Object.keys(allProps[0]).filter(k => k !== "geometry");
  if (source === layersConfig[1].source) keys = keys.filter(k => k !== "name");

  const layerIdx = getActiveLayerIndex();
  const columnNamesKey = layersConfig[layerIdx].columnNamesKey;
  const colNames = columnNames[columnNamesKey] || {};

  let html = '<table><thead><tr>';
  keys.forEach(key => {
    const colName = colNames[key] || key;
    html += `<th>${colName}</th>`;
  });
  html += "<th>Действие</th></tr></thead><tbody>";

  features.forEach(f => {
    html += `<tr data-id="${f.getId()}" data-layer="${layerIdx}">`;
    keys.forEach(key => {
      html += `<td>${f.get(key) ?? ""}</td>`;
    });
    html += `<td><button class="table" onclick="window.zoomToFeature({layer: ${layerIdx}, id: '${f.getId()}'})">Показать</button></td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}