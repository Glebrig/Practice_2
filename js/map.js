import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import Overlay from "ol/Overlay";
import { fromLonLat } from "ol/proj";
import layersConfig from "./layers.js";
import { loadView } from "./storage.js";

const { center, zoom } = loadView();
const initialCenter = center ? fromLonLat(center) : fromLonLat([36.2754, 54.5293]);
const initialZoom = zoom || 10;

export const map = new Map({
  target: "map",
  layers: [
    new TileLayer({ source: new OSM() }),
    ...layersConfig.map(l => l.vectorLayer)
  ],
  view: new View({ center: initialCenter, zoom: initialZoom }),
});

export const overlay = new Overlay({
  element: document.getElementById("popup"),
  positioning: "bottom-center",
  offset: [0, -15],
});
map.addOverlay(overlay);