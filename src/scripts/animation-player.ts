export class AnimationPlayer {

    public dayTimeWindow = {
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

    public choices_hours = [[0, "6AM"], [1, "7AM"], [2, "8AM"], [3, "9AM"], [4, "10AM"], [5, "11AM"], [6, "12PM"],
    [7, "1PM"], [8, "2PM"], [9, "3PM"], [10, "4PM"], [11,
        "5PM"], [12, "6PM"], [13, "7PM"], [14, "8PM"],
    [15, "9PM"], [16, "10PM"], [17, "11PM"], [18,
        "12AM"], [19, "1AM"], [20, "2AM"], [21, "3AM"], [22, "4AM"],
    [23, "5AM"]];


    public currentFrame: number = 0;
    private heatmapData3: any;

    constructor(
        public heatmap: any,
        public data: any,
        public interval: any,
        public animationSpeed: number,
        public readonly wrapperEl: any,
        public playButton: any,
        public isPlaying: boolean

    ) {
        this.init();
    }

    init() {
        let dataLen = this.data.length;
        let frame;
        this.wrapperEl.innerHTML = '';
        this.playButton = this.playButton ? this.playButton : document.createElement('button');

        this.playButton.onclick = () => {
            if (this.isPlaying) {
                this.stop();
            } else {
                this.play();
            }
            this.isPlaying = !this.isPlaying;
        };
        this.playButton.innerText = 'play';

        this.wrapperEl.appendChild(this.playButton);

        let events = document.createElement('div');
        events.className = 'heatmap-timeline';
        events.innerHTML = '<div class="line"></div>';


        for (let i = 0; i < this.data.length; i++) {

            // Generate timeline points

            var xOffset = 100 / (dataLen - 1) * i;

            var ev = document.createElement('div');
            ev.className = 'time-point';
            ev.style.left = xOffset + '%';
            ev.onclick = (function (i: number) {
                return function () {
                    this.isPlaying = false;
                    this.stop();
                    this.setFrame(i);
                }.bind(this);
            }.bind(this))(i);


            events.appendChild(ev);

        }
        this.wrapperEl.appendChild(events);

        // check if time_local_index is in user set hour_min/ max range.
        if (this.dayTimeWindow['time_local_index'] >= this.dayTimeWindow['time_window_start_ix'] && this.dayTimeWindow['time_local_index'] <= this.dayTimeWindow['time_window_end_ix']) {
            // local venue time is within hour_min/max range so setting the animation frame to venue current local hour.
            // The local hour index needs to be subtracted with the time window start index, since the local hour index is based
            // on an array from 0 to 23. 
            frame = this.dayTimeWindow['time_local_index'] - this.dayTimeWindow['time_window_start_ix'];
        } else {
            // local vanue time is outside range, so setting the frame to the hour_min value
            // The local hour index needs to be subtracted with the time window start index, since the local hour index is based
            // on an array from 0 to 23. 

            frame = this.dayTimeWindow['time_window_start_ix'] - this.dayTimeWindow['time_window_start_ix'];
        }

        this.setFrame(frame - 1);
    };

    public play() {
        // Only play when Live/ Now mode not enabled
        let dataLen = this.data.length;
        this.playButton.innerText = 'pause';
        this.interval = setInterval(() => {
            this.setFrame(++this.currentFrame % dataLen);
        }, this.animationSpeed);

    };

    public stop() {
        clearInterval(this.interval);
        this.playButton.innerText = 'play';
    };

    public setFrame(frame: number) {
        // console.log("frame " + frame);
        this.currentFrame = frame;
        var snapshot = this.data[frame];
        // this.heatmap.setData(snapshot);
        this.heatmapData3 = {
            max: 100,
            data: snapshot
        };
        this.heatmap.setData(this.heatmapData3);

        let timePoints = document.querySelectorAll('.heatmap-timeline .time-point');
        for (let i = 0; i < timePoints.length; i++) {
            timePoints[i].classList.remove('active');
            timePoints[i].innerHTML = "";
        }

        timePoints[0].innerHTML = '<div style="margin-top:12px; color:#a7a7a7;font-size:11px">' + this.dayTimeWindow['time_window_start_12h'] + '</div>';
        timePoints[this.data.length - 1].innerHTML = '<div style="margin-top:12px;color:#a7a7a7;font-size:11px">' + this.dayTimeWindow['time_window_end_12h'] + '</div>';

        timePoints[frame].classList.add('active');
        timePoints[frame].innerHTML = '<div style="margin-top:12px; color:#7367F0;font-size:11px">' + this.choices_hours[frame + this.dayTimeWindow['time_window_start_ix']][1]; + '</div>';

    };

    public setAnimationData(data: any) {
        this.isPlaying = false;
        this.stop();
        this.data = data;
        this.init();
    };
    public setAnimationSpeed(speed: number) {
        this.isPlaying = false;
        this.stop();
        this.animationSpeed = speed;
    }

}