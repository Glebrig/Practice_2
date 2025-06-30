// main.js

import { Map, View } from "ol";
import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";
import {Overlay} from "ol"


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
