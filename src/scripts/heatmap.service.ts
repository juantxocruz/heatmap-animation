
// Heatmap config
export const heatmap_config: any = {
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

