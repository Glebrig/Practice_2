import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { styleForGroupObj } from "./utils.js";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";

// 1. Вашингтон — GeoJSON
export const vectorSource1 = new VectorSource({
  url: "./src/my.geojson",
  format: new GeoJSON(),
});
const baseStyle1 = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: "./src/marker0.png",
  }),
});
export const vectorLayer1 = new VectorLayer({
  source: vectorSource1,
  style: feature => window.getFilteredStyle(feature, baseStyle1),
});

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

// 2. Москва — CSV
export const vectorSource2 = new VectorSource();
const baseStyle2 = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: "./src/marker0.png",
  }),
});
export const vectorLayer2 = new VectorLayer({
  source: vectorSource2,
  style: feature => window.getFilteredStyle(feature, baseStyle2),
});

// 3. Калуга — GeoJSON
export const vectorSource3 = new VectorSource({
  url: "./src/kaluga.geojson",
  format: new GeoJSON(),
});
export const vectorLayer3 = new VectorLayer({
  source: vectorSource3,
  style: feature => {
    if (!window.currentFilter) return styleForGroupObj(feature);
    const props = feature.getProperties();
    const filterText = window.currentFilter.trim().toLowerCase();
    const searchFields = ["name"];
    const matched = searchFields.some(field => {
      const val = (props[field] || "").toLowerCase();
      return val.includes(filterText);
    });
    return matched ? styleForGroupObj(feature) : null;
  },
});