// main.js

import { Map, View } from "ol";
import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";
import {Overlay} from "ol"
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import GeoJSON from "ol/format/GeoJSON";

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([36.2754, 54.5293 ]),
      zoom: 10
  })
});

map.on("click", function(event){
  console.log(event.cooridnate);
});

const popup = document.getElementById("popup");
const overlay = new Overlay({
  element: popup,
  positioning: "bottom-center",
  offset: [0, -4],
});
map.addOverlay(overlay);


map.on("click", (event) => { 
  const [lon, lat] = toLonLat(event.coordinate);
  const coordsEl = popup.querySelector("#coordinates");
  coordsEl.textContent = createStringXY(6)([lat,lon])

  overlay.setPosition(event.coordinate)
});


const vectorSource = new VectorSource({
  url: './src/my.geojson',
  format: new GeoJSON(),
});


const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "./marker.png",
    }),
  }),
});

map.addLayer(vectorLayer);