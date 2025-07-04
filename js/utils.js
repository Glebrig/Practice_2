import Style from "ol/style/Style";
import Icon from "ol/style/Icon";

export function styleForGroupObj(feature) {
  const group = feature.get('group_obj');
  let iconSrc;
  switch (group) {
    case "Ландшафтные объекты":
      iconSrc = "./src/marker_landshaft.png";
      break;
    case "Водные объекты":
      iconSrc = "./src/marker.png";
      break;
    case "Историко-культурные объекты":
      iconSrc = "./src/marker_iko.png";
      break;
    case "Лесные массивы":
      iconSrc = "./src/marker_les.png";
      break;
    default:
      iconSrc = "./src/marker_other.png";
  }
  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: iconSrc,
    }),
  });
}