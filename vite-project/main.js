// main.js


import { Map, View } from "ol";
import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";
import {Overlay} from "ol"


map.on("click", function(event){
  console.log(event.cooridnate);
  console.log(map.getView().getZoom());
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


document.addEventListener('DOMContentLoaded', function() {
    const btn_go_map = document.getElementById("go_map");
    if (btn_go_map) {
        btn_go_map.addEventListener("click", function() {
            window.location.href = "map.html";
        });
    }
});
