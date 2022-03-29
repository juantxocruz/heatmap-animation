import { choices_days, choices_hours, hour2index } from './globals.service'; // starting on sunday [0]
export interface LatLngCount {
  lat: number;
  lng: number;
  count: number
}


// google data: from 6 to 23, hour start at 6
// fill the gap (0, 1, 2, 3, 4, 5,) with zeros
//let choices_hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

// Testing for primitives: undefined null boolean string number
function isPrimitive(o: any) { return typeof o !== 'object' || null };

function getAllDaysDataByHours(data: any) {
  let temp: Array<Array<Array<any>>> = []; // day,hour, pois

  choices_days.forEach((day: any, day_index: number) => {
    temp.push([]); // one day
    choices_hours.forEach((hour: any, hour_index) => {
      temp[day_index].push([]); // 24 hours

      data.forEach((d: any, data_index: number) => {

        temp[day_index][hour_index].push({
          lat: d.lat,
          lng: d.lng,
          count: isPrimitive(d.days[day_index]) ? 0 : d.days[day_index][hour[2]] ? d.days[day_index][hour[2]] : 0
        });
      });
    });
  });
  return temp;

}



export function reshapeData(data: any) {

  // compute only data with geometry and popular time
  let googleData = data.filter((d: any) => {
    if (d.geometry && d.geometry.coordinates && d.geometry.coordinates[0] && d.geometry.coordinates[1] && d.properties && d.properties.goo && d.properties.goo.popular_time && d.properties.goo.popular_time.days) {
      return true;
    }
  });

  // return only lat, lng and days
  let googleDays = googleData.map((d: any) => {
    return {
      lat: d.geometry.coordinates[1],
      lng: d.geometry.coordinates[0],
      days: d.properties.goo.popular_time.days
    }

  });
  // return [ DAY [ HOURS [ POIS ] ] ] 
  // DAYS start at 0 is SUNDAY
  // [ HOURS [ POIS ] ] is used to animate map
  // HOURS start at 0 is 6:00am.
  let daysData = getAllDaysDataByHours(googleDays);
  let weekData = sumWeekDaysData(daysData);
  let weekMediaData = mediaWeekDaysData(weekData);
  daysData.push(weekMediaData); // 7 index is the sum of all week day and divided by 7
  return daysData; // all 7 days week [0 Sunday - 6 Saturday] data by hours [0-23] and pois [lat, lgn, count]

}


function mediaWeekDaysData(hours: [][]) {
  let day = hours.map((hour: any[]) => {
    let pois = hour.map((poi) => {
      poi.count = Math.round(poi.count / 7);
      return poi;
    })
    return hour;
  });
  return day;
}
export function sumWeekDaysData(data: any) {
  let result: any = []

  data.forEach((day: [][], day_index: number) => {
    day.forEach((hour: [], hour_index: number) => {
      if (day_index === 0) {
        result.push([]);
      }
      hour.forEach((poi: any, poi_index: number) => {
        if (day_index === 0) {
          result[hour_index].push(
            {
              lat: data[day_index][hour_index][poi_index].lat,
              lng: data[day_index][hour_index][poi_index].lng,
              count: data[day_index][hour_index][poi_index].count
            }
          )
        } else {
          result[hour_index][poi_index].count += data[day_index][hour_index][poi_index].count
        }
      });
    });
  })

  return result;
}

export function sliceHoursfromData(configuration: any, data: Array<any>) {
  // configuration.time_window_start_ix
  // configuration.time_window_end_ix

  let result = data.map((day) => {
    day = day.slice(configuration.time_window_start_ix, configuration.time_window_end_ix + 1)
    return day;
  });
  return result;
}