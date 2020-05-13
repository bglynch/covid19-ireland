// data sources
let countiesDataUrl = "data/COVID19 - County.csv"
let countiesGeoDataUrl = "data/counties.geojson"
let casesDeathsDataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=247770862&single=true&output=csv"

// 
let day = d3.timeFormat("%A");

// charts
let countiesChart;
let countiesMap;
let provinceChart;
let countiesCasesChart;

let countiesData = d3.csv(countiesDataUrl)
                    .then(data => {data.forEach(d => modifyData(d)); return data})
                    .catch(function (error) { console.log(error); });

let casesDeathsData = fetch(casesDeathsDataUrl, { mode: 'cors' })
                        .then(function (response) {
                          return response.ok ? response.text() : Promise.reject(response.status);
                        })
                        .then(function (text) { return d3.csvParse(text); })
                        .then(function (data) {
                          data.forEach(d => cleanDeathsData(d));
                          return data
                        })
                        .catch(function (error) { console.log('Request failed', error) });

let geoData = d3.json("data/counties.geojson")

Promise.all([countiesData, casesDeathsData, geoData])
  .then(function ([countiesData, casesDeathsData, geoData]) {
    createCountyCharts(countiesData)
    createDeathCharts(casesDeathsData, geoData)
  });

// == load the data
//d3.csv(countiesDataUrl)
//  .then(function (data) {
//    data.forEach(d => modifyData(d));
//    return data;
//  })
//  .then(function (data) { createCountyCharts(data); })
//  .catch(function (error) { console.log(error); });

//  https://gist.github.com/mbostock/44466fb0ff73bd630172020fc66df1dc
//fetch(casesDeathsDataUrl, { mode: 'cors' })
//  .then(function (response) {
//    return response.ok ? response.text() : Promise.reject(response.status);
//  })
//  .then(function (text) { return d3.csvParse(text); })
//  .then(function (data) {
//    data.forEach(d => cleanDeathsData(d));
//    return data
//  })
//  .then(function (data) { createDeathCharts(data); })
//  .catch(function (error) { console.log('Request failed', error) });

function modifyData(d) {
  d['NewCases'] = +d["NewCases"]
  d['3DayAvg'] = +d["3DayAvg"]
  d['7DayAvg'] = +d["7DayAvg"]
  return d;
}

function cleanDeathsData(d) {
  const dateFormat = d3.timeParse("%Y/%m/%d");
  const formatTime = d3.timeFormat("%a %d %b");
  const unixTime = d3.timeFormat("%Q");
  d.ConfirmedCovidCases = +d.ConfirmedCovidCases;
  d.Cases3DayAvg = +d.Cases3DayAvg;
  d.Cases7DayAvg = +d.Cases7DayAvg;
  d.ConfirmedCovidDeaths = +d.ConfirmedCovidDeaths;
  d.Deaths3Day = +d.Deaths3Day;
  d.Deaths7Day = +d.Deaths7Day;
  d.ConfirmedCovidRecovered = +d.ConfirmedCovidRecovered;
  d.dd = dateFormat(d.StatisticsProfileDate.split(" ")[0]);
  d.unixTime = +unixTime(d.dd);
  d.formattedDate = formatTime(d.dd);;
}

function createDeathCharts(date) {
  let mondays = [];
  for (let data in date) {
    if (day(date[data].dd) == "Sunday") {
      mondays.push(date[data].unixTime)
    }
  }
  console.log(mondays)

  let ndx = crossfilter(date);
  //dimensions
  let timeDimension01 = ndx.dimension(function (data) { return data.unixTime; });
  let deathsDim = ndx.dimension(function (data) { return data.unixTime; });
  // groups
  const newCasesGroup1 = timeDimension01.group().reduceSum(d => d['ConfirmedCovidCases']);
  const newCasesGroup2 = timeDimension01.group().reduceSum(d => d.Cases3DayAvg);
  const newCasesGroup3 = timeDimension01.group().reduceSum(d => d.Cases7DayAvg);
  const deathsGroup3 = timeDimension01.group().reduceSum(d => d.Deaths7Day);

  let compositeDeath01 = new dc.CompositeChart("#cases-per-day-data2");
  let compositeDeath02 = new dc.CompositeChart("#deaths-per-day2");

  let deathChart03 = dc.barChart('#deaths-per-day');
  deathChart03
    .dimension(deathsDim)
    .group(deathsGroup3)
    .width($(deathChart03.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(true)
    .elasticY(true)
    .on('postRender', function (chart) {
      addDatesToChart(chart)
    });


  compositeDeath01
    .width($(compositeDeath01.anchor()).parent().width())
    .height(300)
    .legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
    .renderHorizontalGridLines(true)
    .x(d3.scaleLinear().domain(d3.extent(date, d => d.unixTime)))
    .elasticY(true)
    .compose([
      new dc.LineChart(compositeDeath01)
        .dimension(timeDimension01)
        .colors('black')
        .group(newCasesGroup1, "Cases per Day")
        .dashStyle([2, 2]),
      new dc.LineChart(compositeDeath01)
        .dimension(timeDimension01)
        .colors('blue')
        .group(newCasesGroup2, "3 Day Avg.")
        .dashStyle([4, 4]),
      new dc.LineChart(compositeDeath01)
        .dimension(timeDimension01)
        .colors('green')
        .group(newCasesGroup3, "7 Day Avg.")
        .dashStyle([6, 6])
    ]).on('postRender', function (chart) {
      addDatesToChart(chart)
    });

  compositeDeath02
    .width($(compositeDeath02.anchor()).parent().width())
    .height(300)
    .legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
    .renderHorizontalGridLines(true)
    .x(d3.scaleLinear().domain(d3.extent(date, d => d.unixTime)))
    .elasticY(true)
    .compose([
      new dc.BarChart(compositeDeath02)
        .dimension(deathsDim)
        .group(deathsGroup3, "Deaths per Day")
        .gap(1)
        .centerBar(true)
    ])
    .on('postRender', function (chart) {
      addDatesToChart(chart)
    });


  timeXAxis(compositeDeath01, mondays)
  timeXAxis(compositeDeath02, mondays)
  timeXAxis(deathChart03, mondays)
  //timeXAxis(compositeDeath02, mondays)

  dc.renderAll();
}

function createCountyCharts(peopleData) {
  dc.config.defaultColors(d3.schemeDark2);

  // ==  create the crossfilter object
  let ndx = crossfilter(peopleData);

  // ==  create dimensions
  let countyDimension = ndx.dimension(function (data) { return data.CountyName; });
  let provinceDimension = ndx.dimension(function (data) { return data.Province; });
  let dataDimension = ndx.dimension(function (data) { return data.TimeStamp; });
  let dataDimension1 = ndx.dimension(function (data) { return data.TimeStamp; });
  let dataDimension2 = ndx.dimension(function (data) { return data.TimeStamp; });
  const countyNewCasesGroup = countyDimension.group().reduceSum(d => d['NewCases']);
  const provinceNewCasesGroup = provinceDimension.group().reduceSum(d => d['NewCases']);
  const dateNewCasesGroup = dataDimension.group().reduceSum(d => d['NewCases']);
  const date3DayCasesGroup = dataDimension1.group().reduceSum(d => d['3DayAvg']);
  const date7DayCasesGroup = dataDimension2.group().reduceSum(d => d['7DayAvg']);

  let averageSalaryByGender = countyDimension.group().reduce(
    function (p, v) {
      p.count++;
      p.total += v["NewCases"];
      p.threeDay += v["3DayAvg"];
      p.sevenDay += v["7DayAvg"];
      return p;
    },
    function (p, v) {
      p.count--;
      if (p.count == 0) {
        p.total = 0;
        p.threeDay = 0;
        p.sevenDay = 0;
      } else {
        p.total -= v["NewCases"];
        p.threeDay -= v["3DayAvg"];
        p.sevenDay -= v["7DayAvg"];
      }
      return p;
    },
    function () {
      return { count: 0, total: 0, threeDay: 0, sevenDay: 0 };
    }
  );

  // instanciate the charts
  countiesChart = dc.rowChart('#chart01');
  provinceChart = dc.barChart('#chart02');
  countiesCasesChart = new dc.CompositeChart("#cases-per-day");


  ordinalBarChart(provinceChart, provinceDimension, provinceNewCasesGroup);
  createCompositeChart(countiesCasesChart, dataDimension, [dateNewCasesGroup, date3DayCasesGroup, date7DayCasesGroup]);
  createRowChart(countiesChart, countyDimension, averageSalaryByGender) 

  countiesChart.margins().left = 50;
  provinceChart.margins().left = 50;
  countiesCasesChart.margins().left = 50;

  timeXAxis(countiesCasesChart)

  dc.renderAll();
};

function timeXAxis(chart) {
  chart.xAxis().tickValues([1584921600000, 1585267200000, 1585526400000, 1586131200000, 1586736000000, 1587340800000, 1587945600000]);
  chart.xAxis().tickFormat(function (v) {
    let date = new Date(v);
    return date.toDateString().split(" 2020").join(" ").trim();
  })
}

function timeXAxis(chart, times) {
  chart.xAxis().tickValues(times);
  chart.xAxis().tickFormat(function (v) {
    let date = new Date(v);
    return date.toDateString().split(" 2020").join(" ").trim();
  })
}

function addDatesToChart(chart) {
  let chartBody = chart.select('g').select('g');
  let offset = 0;
  if (chart == "BarChart") offset = 10;

  let covidDates = [
    //{date:1583971200000, label:"Delay Phase"},    // 12th March
    { date: 1585267200000, label: "Stay Home Phase" },  // 27th March
    { date: 1588291200000, label: "Ease Restrictions" } // 01st May
  ]

  for (const covDate in covidDates) {

    let covidDate = covidDates[covDate].date;
    let covidLabel = covidDates[covDate].label;

    // add vertical line on chart
    chartBody.append('path')
      .attr('d', d3.line()([[chart.x()(covidDate), offset], [chart.x()(covidDate), chart.effectiveHeight() + offset]]))
      .attr('stroke', 'red')
      .attr("stroke-width", 1)
      .style("stroke-dasharray", ("10,3"))

    // add text to line
    chartBody.append('text')
      .attr('x', offset)
      .attr('y', -chart.x()(covidDate) - 5)
      .attr('transform', 'rotate(90)')
      .attr('class', 'small')
      .attr('stroke', 'none')
      .attr('fill', 'black')
      .text(covidLabel);
  }
}

let roundDown = function (num, precision) {
  num = parseFloat(num);
  if (!precision) return num.toLocaleString();
  return (Math.floor(num / precision) * precision).toLocaleString();
};

function ordinalBarChart(chart, dimension, group) {
  chart
    .dimension(dimension)
    .group(group)
    .width($(chart.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal);
}

function createRowChart(chart, dimension, group) {
  chart
    .dimension(dimension)
    .group(group)
    .width($(chart.anchor()).parent().width())
    .height(300)
    .cap(12)
    .ordering(d => -d.value.total)
    .valueAccessor(function (d) {
      if (d.value.count == 0) {
        return 0;
      } else {
        return d.value.total;
      }
    })
    .title(function (d) {
      if (d.value.total > 0) return d.value.total + " cases";
    })
    .renderTitleLabel(true)
    .elasticX(true);
}

function createCompositeChart(chart, dimension, groups) {
  chart
    .width($(chart.anchor()).parent().width())
    .height(300)
    .legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
    .renderHorizontalGridLines(true)
    .x(d3.scaleLinear().domain([1584748800000, 1588464000000]))
    .elasticY(true)
    .compose([
      new dc.LineChart(chart)
        .dimension(dimension)
        .colors('black')
        .group(groups[0], "Cases per Day")
        .dashStyle([2, 2]),
      new dc.LineChart(chart)
        .dimension(dimension)
        .colors('blue')
        .group(groups[1], "3 Day Avg.")
        .dashStyle([4, 4]),
      new dc.LineChart(chart)
        .dimension(dimension)
        .colors('green')
        .group(groups[2], "7 Day Avg.")
        .dashStyle([6, 6])
    ]).on('postRender', function (thisChart) {
      addDatesToChart(thisChart)
    });
}

function oldcharts(){
  let barChart03 = dc.barChart('#chart03');
  let barChart04 = dc.barChart('#chart04');
  let barChart05 = dc.barChart('#chart05');

  barChart03
    .dimension(dataDimension)
    .group(dateNewCasesGroup)
    .width($(barChart03.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(true)
    .elasticY(true)
    .on('postRender', function (chart) {
      addDatesToChart(chart)
    });
  barChart03.xAxis().tickValues([1584921600000, 1585526400000, 1586131200000, 1586736000000, 1587340800000, 1587945600000]);
  barChart03.xAxis().tickFormat(function (v) {
    let date = new Date(v);
    return date.toDateString().split(" 2020").join(" ").trim();
  })


  barChart04
    .dimension(dataDimension1)
    .group(date3DayCasesGroup)
    .width($(barChart04.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(true)
    .elasticY(true)
    .on('postRender', function (chart) {
      addDatesToChart(chart)
    });

  barChart05
    .dimension(dataDimension2)
    .group(date7DayCasesGroup)
    .width($(barChart05.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(true)
    .elasticY(true)
    .on('postRender', function (chart) {
      addDatesToChart(chart)
    });

    barChart03.margins().left = 50;
    barChart04.margins().left = 50;
    barChart05.margins().left = 50;
    timeXAxis(barChart03)
    timeXAxis(barChart04)
    timeXAxis(barChart05)
}
