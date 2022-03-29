
export const getJSON = (url: string, callback: any): void => {
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



export const choices_days = [[0, "Sunday"], [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"]];

export const choices_hours = [
    [0, "6AM", 6],
    [1, "7AM", 7],
    [2, "8AM", 8],
    [3, "9AM", 9],
    [4, "10AM", 10],
    [5, "11AM", 11],
    [6, "12PM", 12],
    [7, "1PM", 13],
    [8, "2PM", 14],
    [9, "3PM", 15],
    [10, "4PM", 16],
    [11, "5PM", 17],
    [12, "6PM", 18],
    [13, "7PM", 19],
    [14, "8PM", 20],
    [15, "9PM", 21],
    [16, "10PM", 22],
    [17, "11PM", 23],
    [18, "12AM", 0],
    [19, "1AM", 1],
    [20, "2AM", 2],
    [21, "3AM", 3],
    [22, "4AM", 4],
    [23, "5AM", 5]
];


export function hour2index(hour: number): number {
    let index: number;

    if (hour >= 6 && hour <= 23) {
        index = hour - 6
    } else {
        index = hour + 18
    }
    // console.log(hour, index)

    return index;
}


export let dayTimeWindow = {
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
};