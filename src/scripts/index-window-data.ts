import * as L from 'leaflet';
import HeatmapOverlay from 'leaflet-heatmap';
import { AnimationPlayer } from './animation-player';

import 'leaflet/dist/leaflet.css';
import '../styles/index.scss';


if (process.env.NODE_ENV === 'development') {
  require('../index.html');
}

export interface LatLngCount {
  lat: number;
  lng: number;
  count: number
}

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

var markerIconUrl = "/img/marker-icon-violet.png";
var moveMapOnInitFail = false;
// data
const hour_categories = ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM',
  '7PM', '8PM', '9PM', '10PM', '11PM', '12AM', '1AM', '2AM', '3AM', '4AM', '5AM'];

const choices_hours = [[0, "6AM"], [1, "7AM"], [2, "8AM"], [3, "9AM"], [4, "10AM"], [5, "11AM"], [6, "12PM"],
[7, "1PM"], [8, "2PM"], [9, "3PM"], [10, "4PM"], [11,
  "5PM"], [12, "6PM"], [13, "7PM"], [14, "8PM"],
[15, "9PM"], [16, "10PM"], [17, "11PM"], [18,
  "12AM"], [19, "1AM"], [20, "2AM"], [21, "3AM"], [22, "4AM"],
[23, "5AM"]]

let windowData: any = {}; //raw data
let venuesData: Array<any> = []; // all raw venues (pois)
let animationData: Array<Array<LatLngCount>> = []; // data for animation lat, lgn and weight
let heatmapData: Array<LatLngCount>;

let getHeatMapData = (data: any, index_hour: number): Array<LatLngCount> => {
  var heatmapDataNew: Array<LatLngCount> = [];

  data.forEach((item: any, index_data: number) => {
    let weight = item['day_raw'][index_hour] ? item['day_raw'][index_hour] : 0;
    //heatmapData2 = [];
    heatmapDataNew.push({ lat: item['venue_lat'], lng: item['venue_lng'], count: weight });

  });
  return heatmapDataNew;

}

const dayTimeWindow = {
  "day_window": "Monday 6AM until Tuesday 5AM",
  "day_window_end_int": 1,
  "day_window_end_txt": "Tuesday",
  "day_window_start_int": 0,
  "day_window_start_txt": "Monday",
  "time_local": 7,
  "time_local_12": "7AM",
  "time_local_index": 1,
  "time_window_end": 5,
  "time_window_end_12h": "5AM",
  "time_window_end_ix": 23,
  "time_window_start": 6,
  "time_window_start_12h": "6AM",
  "time_window_start_ix": 0
}

let player;


// map move extends 
let timerId: any;
// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
let throttleFunction = (func: any, delay: number) => {
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

//This function takes in latitude and longitude of two location and returns the distance in Km between them as the crow flies (in km)
let calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R: number = 6371; // km
  let dLat: number = toRad(lat2 - lat1);
  let dLon: number = toRad(lon2 - lon1);
  let elat1: number = toRad(lat1);
  let elat2: number = toRad(lat2);

  let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(elat1) * Math.cos(elat2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let d = R * c;
  return d;
}

// Converts numeric degrees to radians
let toRad = (val: number): number => {
  return Number(val * Math.PI / 180);
}


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

function drawHeatMap(data: Array<any>, setView = true, animation_ix = -1) {
  // data: Array<LatLngCount>
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
      data: data
    };
    heatmapLayer.setData(heatmapData);

    //heatmapLayer.setData(heatmapData);
    heatmapLayer.addTo(map_leaflet);

    // Add leaflet markers (if needeed)
    // addVenueMarkers(data);
    // Update map location and zoom in url params on map drag and zoom

    map_leaflet.on("moveend", function () {
      function map_moveend() {

        // do something when moveend
        // here we are not doing anything.
        let map_lat = map_leaflet.getCenter().lat.toFixed(2);
        let map_lng = map_leaflet.getCenter().lng.toFixed(2);
        let map_z = map_leaflet.getZoom();
        // convert map_z to a radius
        // The radius (m) decrease inverted with the map zoom
        let bounds = map_leaflet.getBounds();
        let min = bounds.getSouthWest().wrap();
        let max = bounds.getNorthEast().wrap();
        let radius = Math.round(1000 * calcDistance(min.lat, min.lng, max.lat, max.lng));

      }

      // Throttle map movement update otherwise users who move the map fast end up hitting the browser window.history.push limits
      throttleFunction(map_moveend, 2000);

    });
    // animate
    animate();

  }

}

function animate() {
  animationData = [];

  // build data
  for (var i = 0; i < venuesData[0]['day_raw'].length; i++) {
    let hour_data: Array<LatLngCount> = [];
    venuesData.forEach((item, index) => {
      //console.log(item);
      let weight = item['day_raw'][i];
      hour_data.push({ lat: item['venue_lat'], lng: item['venue_lng'], count: weight })

    });
    animationData.push(hour_data);
  };
  // build player: args-->
  // public heatmap: the layer,
  // public data: the overall hours data,
  // public interval: time interval,
  // public animationSpeed: speed,
  // public readonly wrapperEl: querySelector Element,
  // public playButton: If not, it is created,
  // public isPlaying: boolean
  player = new AnimationPlayer({
    heatmap: heatmapLayer,
    data: animationData,
    interval: 100,
    animationSpeed: 100,
    wrapperEl: document.querySelector('.timeline-wrapper'),
    playButton: null,
    isPlaying: false
  });
  //player.play();

}
function init() {
  deleteIconDefault();
  drawMap();
  getJSON("./data/window_data.json", (err: any, data: any) => {
    if (err !== null) {
      console.log('Something went wrong: ' + err);
    } else {
      console.log('Your query count: ' + data);
      windowData = data;
      venuesData = data.venues;
      heatmapData = getHeatMapData(venuesData, 0); // init with index 0
      drawHeatMap(heatmapData);

    }
  });



}

window.onload = () => {

  // window
  let doc = window.document;
  // When the user clicks anywhere outside of the modal, close it
  //doc.addEventListener("click", onClick, false);
  init();

}
