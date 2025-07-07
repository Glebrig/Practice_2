import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { styleForGroupObj } from "./utils.js";

export const layersConfig = [
  {
    id: "layer1",
    title: "Вашингтон",
    source: new VectorSource({
      url: "./src/my.geojson",
      format: new GeoJSON(),
    }),
    baseStyle: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: "./src/marker0.png",
      }),
    }),
    center: [-77.03195, 38.907826],
    zoom: 11,
    columnNamesKey: "columnNamesLayer1"
  },
  {
    id: "layer2",
    title: "Москва",
    source: new VectorSource(),
    baseStyle: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: "./src/marker0.png",
      }),
    }),
    center: [37.6173, 55.7558],
    zoom: 10,
    columnNamesKey: "columnNamesLayer2"
  },
  {
    id: "layer3",
    title: "Калуга",
    source: new VectorSource({
      url: "./src/kaluga.geojson",
      format: new GeoJSON(),
    }),
    baseStyle: null,
    center: [36.3, 54.5],
    zoom: 10,
    columnNamesKey: "columnNamesLayer3"
  }
];

layersConfig.forEach(layer => {
  if (layer.title === "Калуга") {
    layer.style = feature => {
      if (!window.currentFilter) return styleForGroupObj(feature);
      const props = feature.getProperties();
      const filterText = window.currentFilter.trim().toLowerCase();
      const searchFields = ["name"];
      const matched = searchFields.some(field => {
        const val = (props[field] || "").toLowerCase();
        return val.includes(filterText);
      });
      return matched ? styleForGroupObj(feature) : null;
    };
  } else {
    layer.style = feature => window.getFilteredStyle(feature, layer.baseStyle);
  }
  layer.vectorLayer = new VectorLayer({
    source: layer.source,
    style: layer.style
  });
});

layersConfig[0].source.once('change', () => {
  if (layersConfig[0].source.getState() === 'ready') {
    let i = 0;
    layersConfig[0].source.getFeatures().forEach(feature => {
      if (!feature.getId()) {
        feature.setId(`layer1-feature-${i++}`);
      }
    });
  }
});

export default layersConfig;