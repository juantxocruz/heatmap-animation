import * as L from 'leaflet';
import HeatmapOverlay from 'leaflet-heatmap';
import { AnimationPlayer } from './animation-player';
import { reshapeData } from './reshape.service';

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

// config


function getConfig() {
  let url = window.location;
  return {
    url: url,
    baseUrl: url.protocol + "//" + url.host + "/" + url.pathname.split('/')[1]

  }
}


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
const defaultCenter: L.LatLngTuple = [40.423686379181405, -3.710858047841252];
const defaultZoom: number = 16;
const venuemarkers: L.LayerGroup = new L.LayerGroup(); //new Array();
let heatmapLayer: any;

const marker: L.Marker = L.marker(defaultCenter);

let markerIconUrl = "/img/marker-icon-violet.png";


// Heatmap config
let cfg: any = {
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



let venuesData: Array<any> = []; // all raw venues (pois) 7 days, 24 hours
let player: any;


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

  marker.addTo(map_leaflet);
}

function drawHeatMap(
  configuration: {
    day: number,
    start: number,
    end: number,
    delay: number
  },
  data: Array<any>,
  setView = true,
  animation_ix = -1) {
  // data: Array<LatLngCount>
  /* Data points defined as an array of LatLng objects */
  // https://developers.google.com/maps/documentation/javascript/heatmaplayer?hl=nl

  let heatmapData: { max: number; data: Array<LatLngCount> };
  if (data) {

    // Set map position and zoom
    if (setView == true) {
      // set view
      // to be done
    }

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
      data: data[configuration.day][0]
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
    animate(configuration);

  }

}

function animate(configuration: any) {

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
    data: venuesData[configuration.day],
    interval: 100,
    animationSpeed: getAnimationSpeed(),
    wrapperEl: document.querySelector('.timeline-wrapper'),
    playButton: null,
    isPlaying: false
  });
  //player.play();


}

function initSelectors() {
  let day = document.getElementById("daySelector");
  let delay = document.getElementById("animateDelay");
  day.addEventListener("change", onSelectChange, false);
  delay.addEventListener("change", onDelayChange, false);
}

let onDelayChange = (e: any) => {
  player.setAnimationSpeed(parseInt(e.currentTarget.value));
};

function getAnimationSpeed() {
  var delaySelect: any = document.getElementById("animateDelay");
  var delay: number = Number(delaySelect.options[delaySelect.selectedIndex].value);
  return delay;

}

let onSelectChange = (e: any) => {
  if (player) player.stop();

  let selection = {
    day: 0,
    start: 6, // to be done, now 24hours
    end: 5, // to be done, now 24hours,
    delay: getAnimationSpeed()
  }
  if (e.currentTarget.id === 'daySelector') { // index 7 is the sum of all week data
    selection.day = Number(e.currentTarget.value);

  }
  drawHeatMap(selection, venuesData);


};

function init() {
  const config = getConfig();
  let botsoul = "https://botsoul.com/pruebas/heatmap/build/";
  deleteIconDefault();
  drawMap();
  initSelectors();

  getJSON("./data/samples_popular_times.json", (err: any, data: any) => {
    if (err !== null) {
      console.log('Something went wrong: ' + err);
    } else {
      console.log('Your query count: ' + data);
      venuesData = reshapeData(data); // 7 days, 24 hours data
      drawHeatMap({
        day: 0, // sunday 
        start: 6,
        end: 5,
        delay: 1000
      }, venuesData); // 1 day, 24 hours data


    }
  });

}

window.onload = () => {
  init();
}
