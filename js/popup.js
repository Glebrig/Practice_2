import { map, overlay } from "./map.js";
import { createStringXY } from "ol/coordinate";
import { toLonLat } from "ol/proj";

export function updatePopupContent(shouldShowCoords) {
  const popup = document.getElementById("popup");
  const popupContent = document.getElementById("popup-content");
  if (!overlay.getPosition()) return;

  const coordinate = overlay.getPosition();
  let featureAtPos = null;
  map.forEachFeatureAtPixel(map.getPixelFromCoordinate(coordinate), (feature) => {
    const features = feature.get('features');
    if (features && features.length > 1) {
      return false;
    }
    featureAtPos = features ? features[0] : feature;
    return true;
  });

  if (featureAtPos) {
    const props = featureAtPos.getProperties();
    let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
    if (shouldShowCoords) html += `<br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = "block";
  } else {
    if (!shouldShowCoords) {
      popup.style.display = "none";
      overlay.setPosition(undefined);
      return;
    }
    let html = `<b>Координаты:</b><br><small>${createStringXY(6)(toLonLat(coordinate))}</small>`;
    popupContent.innerHTML = html;
    popup.style.display = "block";
  }
}

export function handleMapClick(shouldShowCoords) {
  const popup = document.getElementById("popup");
  const popupContent = document.getElementById("popup-content");

  map.on("click", (event) => {
    let featureFound = false;

    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const features = feature.get('features');
      if (features && features.length > 1) {
        return false;
      }
      featureFound = true;
      const singleFeature = features ? features[0] : feature;
      const geometry = singleFeature.getGeometry();
      const coord = geometry.getCoordinates();
      const props = singleFeature.getProperties();
      let html = `<b>${props["Название_ru"] || props["Name_en"] || props.name || "Маркер"}</b><br>${props.description || ""}`;
      if (shouldShowCoords()) html += `<br><small>${createStringXY(6)(toLonLat(coord))}</small>`;
      popupContent.innerHTML = html;
      popup.style.display = "block";
      overlay.setPosition(coord);
      return true;
    });

    if (!featureFound) {
      if (!shouldShowCoords()) {
        popup.style.display = "none";
        overlay.setPosition(undefined);
        return;
      }
      const [lon, lat] = toLonLat(event.coordinate);
      let html = `<b>Координаты:</b><br><small>${createStringXY(6)([lon, lat])}</small>`;
      popupContent.innerHTML = html;
      popup.style.display = "block";
      overlay.setPosition(event.coordinate);
    }
  });
}