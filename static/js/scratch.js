/* global dc, crossfilter, d3 */

// == load the data
d3.csv('data/COVID19 - County.csv')
    .then(function (data) {
        data.forEach(d => modifyData(d));
        return data;
    })
    .then(function (data) {
        createCountyCharts(data);
    })
    .catch(function (error) {
        console.log(error);
    });

function modifyData(d) {
    d['NewCases'] = +d["NewCases"]
    d['3DayAvg'] = +d["3DayAvg"]
    d['7DayAvg'] = +d["7DayAvg"]
    d.CountyName = d.CountyName.toUpperCase();
    return d;
}

function createCountyCharts(countyData) {
    dc.config.defaultColors(d3.schemeDark2);
    let data = crossfilter(countyData);
    let numberFormat = d3.format(".2f");


    let states = data.dimension(function (d) {
        return d["CountyName"];
    });
    let stateRaisedSum = states.group().reduceSum(function (d) {
        return d["NewCases"];
    });



    d3.json("../data/counties.json").then(function (statesJson) {
        console.log(statesJson)
        let rowChart = dc.rowChart('#rowChart');
        let mapChart = new dc.GeoChoroplethChart('#mapChart');

        var projection = d3.geoAlbers().center([0, 55.4])
        .rotate([4.4, 0])
        .parallels([50, 60])
        .scale(6000)
        ;

        rowChart
            .dimension(states)
            .group(stateRaisedSum)
            .width($(rowChart.anchor()).parent().width())
            .height(300)
            .cap(12)
            .ordering(d => -d.value.total)
            .title(function (d) {
                if (d.value.total > 0) return d.value.total + " cases";
            })
            .renderTitleLabel(true)
            .elasticX(true);

        mapChart.width(990)
            .height(500)
            .dimension(states)
            .group(stateRaisedSum)
            //.colors(d3.scaleQuantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            //.colorDomain([0, 200])
            //.colorCalculator(function (d) { return d ? mapChart.colors()(d) : '#ccc'; })
            .overlayGeoJson(statesJson.features, "county", function (d) {
                console.log(d.properties);
                console.log(d.properties.COUNTY);
                return d.properties.COUNTY;
            })
            .projection(projection)
            .valueAccessor(function (kv) {
                console.log(kv);
                return kv.value;
            })
            .title(function (d) {
                return "State: " + d.key + "\nTotal Amount Raised: " + numberFormat(d.value ? d.value : 0) + "M";
            });
            dc.renderAll();

    })

}