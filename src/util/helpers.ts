import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill } from 'ol/style';
import { GeoJSON, FeatureGeojson } from '../types';

interface SingleData {
  hash_id: string;
  grid: { polygon: number[]; color: number[] };
}

const percentageToHsl = (percentage: number) => {
  const hue = percentage * -120 + 120;
  return 'hsla(' + hue + ', 100%, 50%, 0.3)';
};

const createPolygon = (feature: FeatureGeojson, value: string, color: string) => {
  let coordinates: number[][][] = [];

  if (feature.geometry.type == 'Polygon') {
    coordinates = feature.geometry.coordinates;
  } else if (feature.geometry.type == 'LineString') {
    coordinates = [feature.geometry.coordinates];
  }

  const polygonFeature = new Feature<Polygon>({
    type: 'Polygon',
    geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  });

  polygonFeature.set('value', value);
  polygonFeature.set('color', color);
  polygonFeature.setStyle(
    new Style({
      fill: new Fill({
        color: color,
      }),
    })
  );

  return polygonFeature;
};

export const processData = (data: SingleData[]) => {
  const perID: { [key: string]: { [key: string]: number } } = {};

  data.map((item) => {
    if (!perID[item.hash_id]) {
      const obj: { [key: string]: number } = {};
      item.grid.polygon.map((p, idx) => {
        const key = Math.floor(p).toString();

        obj[key] = item.grid.color[idx];
      });
      perID[item.hash_id] = { ...obj };
    }
  });

  return perID;
};

export const createHeatLayer = (byID: { [key: string]: number }, geojson: GeoJSON) => {
  const polygons: Feature<Polygon>[] = [];
  geojson.features.map((feature) => {
    if (feature.properties && feature.properties.id && byID[feature.properties.id]) {
      const valueLabel = byID[feature.properties.id] || 0;

      polygons.push(createPolygon(feature, valueLabel.toString(), percentageToHsl(valueLabel)));
    }
  });

  return new VectorLayer({
    source: new VectorSource({
      features: polygons,
    }),
    zIndex: 2,
  });
};
