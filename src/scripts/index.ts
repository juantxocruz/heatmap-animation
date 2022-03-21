import * as L from 'leaflet';
import HeatmapOverlay from 'leaflet-heatmap'
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet'
import '../styles/index.scss';


import {
  onClick
} from './starter.service';

if (process.env.NODE_ENV === 'development') {
  require('../index.html');
}

export interface LatLngCount {
  lat: number;
  lng: number;
  count: number
}


console.log('webpack starterkit');

// globals

// map
let map_leaflet: L.Map;
const openStreetMapLayer: L.TileLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://cloudmade.com">CloudMade</a>',
  maxZoom: 18
});
const arcGisMapLayer: L.TileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
});
const basemap = arcGisMapLayer;
const defaultCenter: L.LatLngTuple = [40.74854, -73.98573];
const defaultZoom: number = 12;
const venuemarkers: L.LayerGroup = new L.LayerGroup(); //new Array();
let heatmapLayer: any;

const marker: L.Marker = L.marker(defaultCenter);

// map move extends 
let timerId: any;
// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
var throttleFunction = function (func: any, delay: number) {
  // If setTimeout is already scheduled, no need to do anything
  if (timerId) {
    return;
  }

  // Schedule a setTimeout after delay seconds
  timerId = setTimeout(() => {
    func();

    // Once setTimeout function execution is finished, timerId = undefined so that in <br>
    // the next scroll event function execution can be scheduled by the setTimeout
    timerId = undefined;
  }, delay)
}

// data
const hour_categories = ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM',
  '7PM', '8PM', '9PM', '10PM', '11PM', '12AM', '1AM', '2AM', '3AM', '4AM', '5AM'];


const getJSON = (url: string, callback: any): void => {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'json';
  xhr.onload = () => {
    let status = xhr.status;
    if (status === 200) {
      callback(null, xhr.response);
    } else {
      callback(status, xhr.response);
    }
  };
  xhr.send();
};

// Determines xAxis index values based on the open/close hour so the unopened hours will be cut-off the charts
function hour2index(hour: number): number {
  let index: number;

  if (hour >= 6 && hour <= 23) {
    index = hour - 6
  } else {
    index = hour + 18
  }
  // console.log(hour, index)

  return index;
}


function deleteIconDefault() {
  /* This code is needed to properly load the images in the Leaflet CSS */
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });

}

function drawMap() {
  map_leaflet = L.map('map_leaflet', {
    fullscreenControl: true,
    center: defaultCenter,
    zoom: defaultZoom,
    layers: [basemap, venuemarkers],
    scrollWheelZoom: false, // disable original zoom function
    // smoothWheelZoom: true,  // enable smooth zoom
    // smoothSensitivity: 1,   // zoom speed. default is 1
    //leaflet buildin fractional zoom
    // scrollWheelZoom: true, // disable original zoom function
    // zoomSnap: 0.1
  });



  //map_leaflet.setView(defaultCenter, defaultZoom);
  //basemap.addTo(this.window['map_leaflet']);
  marker.addTo(map_leaflet);
}

function drawHeatMap(data: Array<LatLngCount>, setView = true, animation_ix = -1) {
  /* Data points defined as an array of LatLng objects */
  // https://developers.google.com/maps/documentation/javascript/heatmaplayer?hl=nl

  // console.log("drawMap", setView, animation_ix);
  // Show closed/empty places with a raw value below weight_min as the weight_min value.

  let weigth_min = 0;
  let heatmapData: { max: number; data: any };
  if (data) {

    // Set map position and zoom
    if (setView == true) {
      // set view
      // to be done
    }

    // Heatmap config
    let cfg = {
      // radius should be small ONLY if scaleRadius is true (or small radius is intended)
      "radius": 20,
      "maxOpacity": 0.6,// 0.6,
      "minOpacity": 0.3,//0.4,
      "blur": 1,
      // scales the radius based on map zoom
      "scaleRadius": false,
      // backhround color for whole heatmap layer
      //backgroundColor: '#13ae4778',
      // custom gradient colors
      gradient: {
        // enter n keys between 0 and 1 here
        // for gradient color customization
        '0.0': 'green',
        '0.5': 'orange',
        '0.8': 'red'
      },
      // if set to false the heatmap uses the global maximum for colorization
      // if activated: uses the data maximum within the current map boundaries 
      //   (there will always be a red spot with useLocalExtremas true)
      "useLocalExtrema": false,
      // which field name in your data represents the latitude - default "lat"
      latField: 'lat',
      // which field name in your data represents the longitude - default "lng"
      lngField: 'lng',
      // which field name in your data represents the data value - default "value"
      valueField: 'count'
    };

    // Clear existing (invisble) markers with tooltips
    if (map_leaflet.hasLayer(venuemarkers)) {
      venuemarkers.clearLayers();
    }
    // Clear existing heatmaps
    if (map_leaflet.hasLayer(heatmapLayer)) {
      map_leaflet.removeLayer(heatmapLayer);
    }

    heatmapLayer = new HeatmapOverlay(cfg);

    heatmapData = {
      max: 100,
      data: data[0]
    };
    heatmapLayer.setData(heatmapData);

    //heatmapLayer.setData(heatmapData);
    heatmapLayer.addTo(map_leaflet);





  }

}

function init() {
  deleteIconDefault();
  drawMap();
  getJSON("./data/animationData-latLng.json", (err: any, data: Array<LatLngCount>) => {
    if (err !== null) {
      console.log('Something went wrong: ' + err);
    } else {
      console.log('Your query count: ' + data);
      drawHeatMap(data);
      let x;
    }
  })
}

window.onload = function () {

  // window
  let doc = window.document;
  // When the user clicks anywhere outside of the modal, close it
  doc.addEventListener("click", onClick, false);
  init();

}
