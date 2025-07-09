import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Cluster from "ol/source/Cluster";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import { styleForGroupObj } from "./utils.js";

function clusterStyleFunction(baseStyle) {
  return function (feature) {
    const features = feature.get('features');
    const size = features.length;
    if (size === 1) {
      return baseStyle;
    }
    return new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: "./src/marker0.png",
        scale: 1.1
      }),
      text: new Text({
        text: size.toString(),
        offsetY: -24,
        scale: 1.3,
        fill: new Fill({ color: '#fff' }),
        backgroundFill: new Fill({ color: '#1976d2' }),
        padding: [2, 4, 2, 4]
      })
    });
  };
}

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
    layer.vectorLayer = new VectorLayer({
      source: layer.source,
      style: layer.style
    });
  } else {
    layer.clusterSource = new Cluster({
      distance: 40,
      source: layer.source
    });
    layer.style = clusterStyleFunction(layer.baseStyle);
    layer.vectorLayer = new VectorLayer({
      source: layer.clusterSource,
      style: layer.style
    });
  }
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