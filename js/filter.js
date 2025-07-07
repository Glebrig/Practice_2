import layersConfig from "./layers.js";

export function getFilteredFeatures(source, currentFilter) {
  const features = source.getFeatures();
  if (!currentFilter) return features;
  const filterText = currentFilter.trim().toLowerCase();
  let searchFields = [];
  if (source === layersConfig[1].source) {
    searchFields = ["Название_ru", "Name_en"];
  } else {
    searchFields = ["name"];
  }
  return features.filter(f => {
    const props = f.getProperties();
    return searchFields.some(field => {
      const val = (props[field] || "").toLowerCase();
      return val.includes(filterText);
    });
  });
}

export function getFilteredStyle(feature, baseStyle, currentFilter) {
  if (!currentFilter) return baseStyle;
  const props = feature.getProperties();
  const filterText = currentFilter.trim().toLowerCase();
  let searchFields = [];
  if (props["Название_ru"] !== undefined || props["Name_en"] !== undefined) {
    searchFields = ["Название_ru", "Name_en"];
  } else {
    searchFields = ["name"];
  }
  const matched = searchFields.some(field => {
    const val = (props[field] || "").toLowerCase();
    return val.includes(filterText);
  });
  return matched ? baseStyle : null;
}