import * as L from 'leaflet';
import HeatmapOverlay from 'leaflet-heatmap';
import { AnimationPlayer } from './animation-player';
import { reshapeData, getGoogleDataPois, sliceHoursfromData, LatLngCount } from './reshape.service';
import { getJSON, choices_days, choices_hours, hour2index, dayTimeWindow } from './globals.service';
import { heatmap_config } from './heatmap.service'
import 'leaflet/dist/leaflet.css';
import '../styles/index.scss';


if (process.env.NODE_ENV === 'development') {
  require('../index.html');
}


// URL config
function getConfig() {
  let url: any = window.location;
  let location: string = url.href;
  let directoryPath = location.substring(0, location.lastIndexOf("/") + 1);

  return {
    url: url,
    location: location,
    directoryPath: directoryPath
  }
}

// map

let map_leaflet: L.Map;
let markerIconUrl = "/img/marker-icon-violet.png";

// you can change layer design: openStreet or ArGis
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
const venuemarkers2: any = [];
const marker: L.Marker = L.marker(defaultCenter);


export function drawMap() {
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

let heatmapLayer: any;
let poisData: any; // original pois 
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



function deleteIconDefault() {
  /* This code is needed to properly load the images in the Leaflet CSS */
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });

}

function onClickVenueMarker(event: any) {
  console.log(event);
  return false;
}
function addVenueMarkers(tabledata: any[]) {

  // use venueMarkers if you needed all pois info
  // restore the array
  venuemarkers2.length = 0;


  // Draw all heatmap elements
  for (let i = 0; i < tabledata.length; i++) {

    var venuemarker: any = L.marker([tabledata[i].geometry.coordinates[1], tabledata[i].geometry.coordinates[0]],
      {
        opacity: 0,
        // title: tabledata[i].venue_name + ", " + tabledata[i].venue_address
      }).on('click', onClickVenueMarker);

    venuemarker.tableid = i;
    //Add to venuemarkers array
    venuemarkers2.push(venuemarker);
    // Add array element to map_leaflet
    //console.log(venuemarker);
    venuemarkers.addLayer(venuemarker);

  }
}

function drawHeatMap(
  setView = true) {
  // data: Array<LatLngCount>
  /* Data points defined as an array of LatLng objects */
  // https://developers.google.com/maps/documentation/javascript/heatmaplayer?hl=nl

  let timeWindow = setDayTimeWindow();
  let sevenDaysData = reshapeData(poisData); // 7 days, 24 hours data
  let heatmapData2 = sliceHoursfromData(timeWindow, sevenDaysData);
  let heatmapData: { max: number; data: Array<LatLngCount> };
  let dayIndex = getDayIndex(timeWindow);

  if (sevenDaysData) {

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

    heatmapLayer = new HeatmapOverlay(heatmap_config);

    heatmapData = {
      max: 100,
      data: heatmapData2[dayIndex][0]
    };
    heatmapLayer.setData(heatmapData);

    //heatmapLayer.setData(heatmapData);
    heatmapLayer.addTo(map_leaflet);

    // Add leaflet markers (if needeed)
    addVenueMarkers(poisData);
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
    animate(timeWindow, heatmapData2[dayIndex]);

  }

}

function animate(configuration: any, heatMapData: Array<[]>) {

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
    data: heatMapData,
    interval: 100,
    animationSpeed: Number(getOptionValue('animateDelay')),
    wrapperEl: document.querySelector('.timeline-wrapper'),
    playButton: null,
    isPlaying: false,
    dayTimeWindow: configuration
  });

}


function getHours(): any {
  return {
    hourMin: getOptionValue("hour_min"),
    hourMax: getOptionValue("hour_max")
  }
}


let getDDay = (day: string): Array<any> => {

  let result = choices_days.filter((d) => {
    return d[0] === Number(day);
  });
  return result.length > 0 ? result[0] : choices_days[0]; // [0, "Sunday"];

}

let getNextDay = (day: any) => {

  let ix = Number(day) === 6 ? 0 : (Number(day) + 1);

  let result = choices_days.filter((d) => {
    return d[0] === ix;
  });
  return result.length > 0 ? result[0] : choices_days[choices_days.length - 1]; // [6, "Saturday"];

}

let getMinHour = (hour: string) => {
  let result;
  if (hour) {
    result = choices_hours.filter((d) => {
      return d[2] === Number(hour);
    })[0];
  } else {
    result = choices_hours[0];// [0, "6AM", 6]
  }
  return result;

}
let getMaxHour = (hour: string) => {
  let result;
  if (hour) {
    result = choices_hours.filter((d) => {
      return d[2] === Number(hour);
    })[0];
  } else {
    result = choices_hours[choices_hours.length - 1]; //   [23, "5AM", 5]
  }
  return result;

}


function setDayTimeWindow() {
  let dayAndHours = getDayAndHours();
  let day = dayAndHours.day;
  let hours = dayAndHours.hours;

  if (hours.hourMin !== "" && hours.hourMax !== "") {
    if (hour2index(Number(dayAndHours.hours.hourMax)) < hour2index(Number(dayAndHours.hours.hourMin))) {
      alert("Error: The minimum hour is higher than the maximum hour.")
      return false;
    }
  }

  let dDay = getDDay(day);
  let dNextDay = getNextDay(day);
  let dMinHour = getMinHour(hours.hourMin);
  let dMaxHour = getMaxHour(hours.hourMax);

  //  "Monday 6AM until Tuesday 5AM",
  // "{{day}} {{hour_min}} until {{next_day}} {{hour_max}}"
  let dayTimeWindow = {
    "day_window": dDay[1] + " " + dMinHour[1] + " until " + dNextDay[1] + " " + dMaxHour[1],
    "day_window_end_int": dNextDay[0],
    "day_window_end_txt": dNextDay[1],
    "day_window_start_int": dDay[0],
    "day_window_start_txt": dDay[1],
    "time_local": 7,
    "time_local_12": "7AM",
    "time_local_index": 1,
    "time_window_end": dMaxHour[2],
    "time_window_end_12h": dMaxHour[1],
    "time_window_end_ix": dMaxHour[0],
    "time_window_start": dMinHour[2],
    "time_window_start_12h": dMinHour[1],
    "time_window_start_ix": dMinHour[0]
  };
  return dayTimeWindow;

}


function getDayAndHours() {
  return {
    day: getOptionValue("daySelector"),
    hours: getHours()
  }

}
function onHourChange(e: any) {
  if (player) player.stop();
  drawHeatMap();

}

function getDayIndex(configuration: any) {
  return configuration.day_window_start_int === 0 && configuration.day_window_end_int === 6 ? 7 : configuration.day_window_start_int;
}
function getOptionValue(id: string) {
  let select: any = document.getElementById(id);
  var result: string = select.options[select.selectedIndex].value;
  return result;
}
let onDayChange = (e: any) => {
  if (player) player.stop();
  drawHeatMap();
};

let onDelayChange = (e: any) => {
  player.setAnimationSpeed(parseInt(e.currentTarget.value));
};

function initSelectors() {
  let day = document.getElementById("daySelector");
  let delay = document.getElementById("animateDelay");
  let hourMin = document.getElementById("hour_min");
  let hourMax = document.getElementById("hour_max");

  day.addEventListener("change", onDayChange, false);
  delay.addEventListener("change", onDelayChange, false);
  hourMin.addEventListener("change", onHourChange, false);
  hourMax.addEventListener("change", onHourChange, false);

}


function init() {
  const config = getConfig();
  deleteIconDefault();
  drawMap();
  initSelectors();

  getJSON(config.directoryPath + "data/samples_popular_times.json", (err: any, data: any) => {
    if (err !== null) {
      console.log('Something went wrong: ' + err);
    } else {
      poisData = getGoogleDataPois(data); // original data with geometry and google data
      drawHeatMap();

    }
  });

}

window.onload = () => {
  init();
}
