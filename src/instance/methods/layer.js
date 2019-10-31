// Import source types, layer types, and formats.
import VectorSource from 'ol/source/Vector';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import LayerGroup from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';

// Import setWithCredentials function.
import { setWithCredentials } from 'ol/featureloader';

// Import styles.
import styles from '../../styles';

// Import the default projection configuration
import projection from '../../projection';

// Set withCredentials to true for all XHR requests made via OpenLayers'
// feature loader. Typically farmOS requires authentication in order to
// retrieve data from its GeoJSON endpoints. Setting withCredentials to true
// is a requirement for authentication credentials to be included in the
// request that OpenLayers makes.
setWithCredentials(true);

/**
 * Call the supplied function for each layer in the passed layer group recursing
 * nested groups. Copied/modified from LayerSwitcher.forEachRecursive().
 * We replicate it here so that we can use it even when the LayerSwitcher
 * control has not been added to the map.
 * @param {ol/layer/Group~LayerGroup} layer The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol/layer/Base~BaseLayer`
 * found under `lyr`. The signature for `fn` is the same as `ol/Collection~Collection#forEach`
 */
export function forEachLayer(layer, fn) {
  layer.getLayers().forEach((lyr, idx, a) => {
    fn(lyr, idx, a);
    if (lyr.getLayers) {
      forEachLayer(lyr, fn);
    }
  });
}

// Add a Vector layer to the map.
function addVectorLayer({
  title = 'vector', color, visible = true,
}) {
  const style = styles(color);
  const source = new VectorSource();
  const layer = new VectorLayer({
    title,
    source,
    style,
    visible,
  });
  return layer;
}

// Add a GeoJSON feature layer to the map.
function addGeoJSONLayer({
  title = 'geojson', url, color, visible = true,
}) {
  const style = styles(color);
  const format = new GeoJSON();
  const source = new VectorSource({ url, format });
  const layer = new VectorLayer({
    title,
    source,
    style,
    visible,
  });
  return layer;
}

// Add Well Known Text (WKT) geometry to the map.
function addWKTLayer({
  title = 'wkt', wkt, color, visible = true,
}) {
  const style = styles(color);
  const isMultipart = wkt.includes('MULTIPOINT')
    || wkt.includes('MULTILINESTRING')
    || wkt.includes('MULTIPOLYGON')
    || wkt.includes('GEOMETRYCOLLECTION');
  const features = isMultipart
    ? new WKT().readFeatures(wkt, projection)
    : [new WKT().readFeature(wkt, projection)];
  const source = new VectorSource({ features });
  const layer = new VectorLayer({
    title,
    source,
    style,
    visible,
  });
  return layer;
}

// Add a WMS tile layer to the map.
function addWMSTileLayer({
  title = 'wms', url, params, visible = true, base = false,
}) {
  const source = new TileWMS({
    url,
    params,
  });
  const layer = new TileLayer({
    title,
    source,
    visible,
    type: base ? 'base' : 'normal',
  });
  return layer;
}

// Add an XYZ tile layer to the map.
function addXYZTileLayer({
  title = 'xyz', url, visible = true, base = false,
}) {
  const source = new XYZ({ url });
  const layer = new TileLayer({
    title,
    source,
    visible,
    type: base ? 'base' : 'normal',
  });
  return layer;
}

// Add a layer to the map by its type.
export function addLayer(type, opts) {
  let layer;
  if (type.toLowerCase() === 'vector') {
    layer = addVectorLayer(opts);
  }
  if (type.toLowerCase() === 'geojson') {
    if (!opts.url) {
      throw new Error('Missing a GeoJSON url.');
    }
    layer = addGeoJSONLayer(opts);
  }
  if (type.toLowerCase() === 'wkt') {
    if (!opts.wkt) {
      throw new Error('Missing a WKT string.');
    }
    layer = addWKTLayer(opts);
  }
  if (type.toLowerCase() === 'wms') {
    if (!opts.url) {
      throw new Error('Missing a WMS url.');
    }
    layer = addWMSTileLayer(opts);
  }
  if (type.toLowerCase() === 'xyz') {
    if (!opts.url) {
      throw new Error('Missing an XYZ url.');
    }
    layer = addXYZTileLayer(opts);
  }

  // If a layer was created, add it to the map.
  // If a layer group is specified, search for it in the map, create it if
  // it doesn't exist, and add the layer to it.
  if (layer) {
    if (opts.group) {
      let group;
      const mapLayersArray = this.map.getLayers().getArray();
      for (let i = 0; i < mapLayersArray.length; i += 1) {
        if (mapLayersArray[i].getLayers && mapLayersArray[i].get('title') === opts.group) {
          group = mapLayersArray[i];
        }
      }
      if (!group) {
        group = new LayerGroup({ title: opts.group });
        this.map.addLayer(group);
      }
      group.getLayers().push(layer);
    } else {
      this.map.addLayer(layer);
    }
    return layer;
  }
  throw new Error('Invalid layer type.');
}