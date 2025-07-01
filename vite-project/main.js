import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import { createStringXY } from "ol/coordinate";
import Overlay from "ol/Overlay";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import GeoJSON from "ol/format/GeoJSON";

const infoToggleForm = document.getElementById('infoToggle');

function shouldShowCoords() {
  if (!infoToggleForm) return true;
  const checked = infoToggleForm.querySelector('input[name="showCoords"]:checked');
  return checked && checked.value === 'yes';
}

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: fromLonLat([36.2754, 54.5293]),
    zoom: 10
  })
});

const popup = document.getElementById("popup");
const popupContent = document.getElementById("popup-content");
const overlay = new Overlay({
  element: popup,
  positioning: "bottom-center",
  offset: [0, -4],
});
map.addOverlay(overlay);

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

function updatePopupContent() {
  if (!overlay.getPosition()) return;

  const coordinate = overlay.getPosition();
  let featureAtPos = null;
  map.forEachFeatureAtPixel(
    map.getPixelFromCoordinate(coordinate),
    function (feature) {
      featureAtPos = feature;
      return true;
    }
  );

  if (featureAtPos) {
    const props = featureAtPos.getProperties();
    let html = `<b>${props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    }
    popupContent.innerHTML = html;
    popup.style.display = 'block';
  } else {
    if (!shouldShowCoords()) {
      popup.style.display = 'none';
      overlay.setPosition(undefined);
      return;
    }
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = 'block';
  }
}

map.on("click", function (event) {
  let featureFound = false;

  map.forEachFeatureAtPixel(event.pixel, function (feature) {
    featureFound = true;
    const geometry = feature.getGeometry();
    const coord = geometry.getCoordinates();
    const props = feature.getProperties();

    let html = `<b>${props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords()) {
      html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
    }

    popupContent.innerHTML = html;
    popup.style.display = 'block';
    overlay.setPosition(coord);
    return true;
  });

  if (!featureFound) {
    if (!shouldShowCoords()) {
      popup.style.display = 'none';
      overlay.setPosition(undefined);
      return;
    }

    const [lon, lat] = toLonLat(event.coordinate);
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)([lon, lat])}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = 'block';
    overlay.setPosition(event.coordinate);
  }
});

if (infoToggleForm) {
  infoToggleForm.addEventListener('change', () => {
    updatePopupContent();
  });
}
