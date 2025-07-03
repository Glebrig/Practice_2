import { STORAGE_KEY_LAYER, STORAGE_KEY_TABLE } from "./constants.js";

export function saveView(center, zoom) {
  localStorage.setItem('mapCenter', JSON.stringify(center));
  localStorage.setItem('mapZoom', zoom.toString());
}
export function loadView() {
  let center = null, zoom = 10;
  try {
    const savedCenter = localStorage.getItem('mapCenter');
    if (savedCenter) {
      const arr = JSON.parse(savedCenter);
      if (Array.isArray(arr) && arr.length === 2) center = arr;
    }
    const savedZoom = localStorage.getItem('mapZoom');
    if (savedZoom) zoom = Number(savedZoom);
  } catch (e) { }
  return { center, zoom };
}
export function saveSelectedLayer(layerValue) {
  localStorage.setItem(STORAGE_KEY_LAYER, layerValue);
}
export function loadSelectedLayer() {
  return localStorage.getItem(STORAGE_KEY_LAYER);
}
export function saveTableVisibility(val) {
  localStorage.setItem(STORAGE_KEY_TABLE, val ? 'yes' : 'no');
}
export function loadTableVisibility() {
  return localStorage.getItem(STORAGE_KEY_TABLE);
}
export function saveFilter(value) {
  localStorage.setItem("objectFilter", value);
}
export function loadFilter() {
  return localStorage.getItem("objectFilter") || "";
}