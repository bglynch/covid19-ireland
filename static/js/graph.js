// data sources
const countiesDataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=786105712&single=true&output=csv"
const countiesGeoDataUrl = "data/counties-min.geojson"
const casesDeathsDataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=247770862&single=true&output=csv"
const casesStatisticsDataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=2036441059&single=true&output=csv"
let allValues;
// formatting
const dayFormat = d3.timeFormat("%A");
const dateFormat = d3.timeParse("%Y/%m/%d");
const formatTime = d3.timeFormat("%a %d %b");
const unixTime = d3.timeFormat("%Q");
const colorRange = ['#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000'];
const dFormat = d3.format(",");
// charts
let countiesChart;
let countiesMap;
let provinceChart;
let countiesCasesChart;

dc.config.defaultColors(d3.schemeDark2);

let countiesData = fetch(countiesDataUrl, { mode: 'cors' })
  .then(function (response) {
    return response.ok ? response.text() : Promise.reject(response.status);
  })
  .then(function (text) { return d3.csvParse(text); })
  .then(function (data) {
    data.forEach(d => cleanCountiesData(d));
    return data
  })
  .catch(function (error) { console.log('Request failed', error) });


let casesDeathsData = fetch(casesDeathsDataUrl, { mode: 'cors' })
  .then(function (response) {
    return response.ok ? response.text() : Promise.reject(response.status);
  })
  .then(function (text) { return d3.csvParse(text); })
  .then(function (data) {
    data.forEach(d => cleanCasesDeathsData(d));
    return data
  })
  .catch(function (error) { console.log('Request failed', error) });


let casesStatisticsData = fetch(casesStatisticsDataUrl, { mode: 'cors' })
  .then(function (response) {
    return response.ok ? response.text() : Promise.reject(response.status);
  })
  .then(function (text) { return d3.csvParse(text); })
  .then(function (data) {
    data.forEach(d => cleanStatsData(d));
    return data
  })
  .catch(function (error) { console.log('Request failed', error) });

let geoData = d3.json(countiesGeoDataUrl)

Promise.all([countiesData, casesDeathsData, geoData, casesStatisticsData])
  .then(function ([countiesData, casesDeathsData, geoData, casesStatisticsData]) {
    createCountyCharts(countiesData, geoData);
    createDeathCharts(casesDeathsData);
    createStatsCharts(casesStatisticsData);
  });

function createCountyCharts(countiesData, geoData) {
  let mondays = getDaysFromUnixTime(countiesData, "Monday")

  // ==  create the crossfilter object
  let ndx = crossfilter(countiesData);

  // ==  create dimensions
  let countyDimension = ndx.dimension(function (data) { return data.County; });
  let countyDimension4Map = ndx.dimension(function (data) { return data.County; });
  let provinceDimension = ndx.dimension(function (data) { return data.Province; });
  let dataDimension = ndx.dimension(function (data) { return data.unixTime; });

  // == create groups
  const countyNewCasesGroup = countyDimension4Map.group().reduceSum(d => d['NewCases']);
  const provinceNewCasesGroup = provinceDimension.group().reduceSum(d => d['NewCases']);
  const dateNewCasesGroup = dataDimension.group().reduceSum(d => d['NewCases']);
  const date3DayCasesGroup = dataDimension.group().reduceSum(d => d['3DayAvg']);
  const date7DayCasesGroup = dataDimension.group().reduceSum(d => d['7DayAvg']);

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
  countiesMap = dc_leaflet.choroplethChart("#map");


  countiesMap
    .dimension(countyDimension4Map)
    .group(countyNewCasesGroup)
    .width($(countiesMap.anchor()).parent().width())
    .height(320)
    .center([53.42, -7]) // 53.42, -8.10
    .zoom(6)
    .geojson(geoData)
    .colors(colorRange)
    .colorDomain([0, d3.extent(countyNewCasesGroup.all(), d => d.value)[1] / 8])
    .colorAccessor(function (d, i) { return d.value; })
    .featureKeyAccessor(function (feature) { return feature.properties.COUNTY; })
    .legend(dc_leaflet.legend().position('bottomright'))
    ;

  ordinalBarChart(provinceChart, provinceDimension, provinceNewCasesGroup);
  createCompositeChart(countiesCasesChart, dataDimension, [dateNewCasesGroup, date3DayCasesGroup, date7DayCasesGroup]);
  createRowChart(countiesChart, countyDimension, averageSalaryByGender)

  countiesCasesChart.margins().left = 50;

  timeXAxis(countiesCasesChart, mondays)

  dc.renderAll();
};

function createDeathCharts(casesDeathsData) {
  let mondays = getDaysFromUnixTime(casesDeathsData, "Monday")

  let ndx = crossfilter(casesDeathsData);
  //dimensions
  let timeDimension01 = ndx.dimension(function (data) { return data.unixTime; });
  let deathsDim = ndx.dimension(function (data) { return data.unixTime; });

  // groups
  const newCasesGroup1 = timeDimension01.group().reduceSum(d => d.ConfirmedCovidCases);
  const newCasesGroup2 = timeDimension01.group().reduceSum(d => d.Cases3DayAvg);
  const newCasesGroup3 = timeDimension01.group().reduceSum(d => d.Cases7DayAvg);
  const deathsGroup1 = deathsDim.group().reduceSum(d => d.ConfirmedCovidDeaths);
  const deathsGroup2 = deathsDim.group().reduceSum(d => d.Deaths3Day);
  const deathsGroup3 = deathsDim.group().reduceSum(d => d.Deaths7Day);

  // create charts
  let compositeDeath01 = new dc.CompositeChart("#casesAndDeaths01");
  let compositeDeath02 = new dc.CompositeChart("#casesAndDeaths02");

  // charts
  createCompositeChart(compositeDeath01, timeDimension01, [newCasesGroup1, newCasesGroup2, newCasesGroup3])
  createCompositeChart(compositeDeath02, deathsDim, [deathsGroup1, deathsGroup2, deathsGroup3])
  show_number_filtered(ndx)

  timeXAxis(compositeDeath01, mondays)
  timeXAxis(compositeDeath02, mondays)

  dc.renderAll();
}

function createStatsCharts(statsData) {
  console.log(statsData[0])
  let ndx = crossfilter(statsData);

  let male = ndx.dimension(function (d) { return d.Male; });
  let female = ndx.dimension(function (d) { return d.Female; });
  let unknown = ndx.dimension(function (d) { return d.Unknown; });

  let maleGroupSum = male.groupAll().reduceSum(function (d) { return d.Male; });
  let femaleGroupSum = female.groupAll().reduceSum(function (d) { return d.Female; });
  let unknownGroupSum = unknown.groupAll().reduceSum(function (d) { return d.Unknown; });

  allValues = ndx.groupAll().reduce(
    function (p, v) {
      p.count++;
      p.CovidCases += v.CovidCases;
      p.CovidDeaths += v.CovidDeaths;
      p.CovidRecovered += v.CovidRecovered;
      p.ConfirmedCases += v.ConfirmedCases;
      p.HospitalisedCases += v.HospitalisedCases;
      p.RequiringICUCases += v.RequiringICUCases;
      p.HealthcareWorkersCases += v.HealthcareWorkersCases;
      p.HospitalisedAged5 += v.HospitalisedAged5;
      p.HospitalisedAged5to14 += v.HospitalisedAged5to14;
      p.HospitalisedAged15to24 += v.HospitalisedAged15to24;
      p.HospitalisedAged25to34 += v.HospitalisedAged25to34;
      p.HospitalisedAged35to44 += v.HospitalisedAged35to44;
      p.HospitalisedAged45to54 += v.HospitalisedAged45to54;
      p.HospitalisedAged55to64 += v.HospitalisedAged55to64;
      p.HospitalisedAged65up += v.HospitalisedAged65up;
      p.Aged5 += v.Aged5;
      p.Aged5to14 += v.Aged5to14;
      p.Aged15to24 += v.Aged15to24;
      p.Aged25to34 += v.Aged25to34;
      p.Aged35to44 += v.Aged35to44;
      p.Aged45to54 += v.Aged45to54;
      p.Aged55to64 += v.Aged55to64;
      p.Aged65up += v.Aged65up;
      p.Male += v.Male;
      p.Female += v.Female;
      p.Unknown += v.Unknown;
      return p;
    },
    function (p, v) {
      p.count--;
      if (p.count == 0) {
        p.CovidCases = 0;
        p.CovidDeaths = 0;
        p.CovidRecovered = 0;
        p.ConfirmedCases = 0;
        p.HospitalisedCases = 0;
        p.RequiringICUCases = 0;
        p.HealthcareWorkersCases = 0;
        p.HospitalisedAged5 = 0;
        p.HospitalisedAged5to14 = 0;
        p.HospitalisedAged15to24 = 0;
        p.HospitalisedAged25to34 = 0;
        p.HospitalisedAged35to44 = 0;
        p.HospitalisedAged45to54 = 0;
        p.HospitalisedAged55to64 = 0;
        p.HospitalisedAged65up = 0;
        p.Aged5 = 0;
        p.Aged5to14 = 0;
        p.Aged15to24 = 0;
        p.Aged25to34 = 0;
        p.Aged35to44 = 0;
        p.Aged45to54 = 0;
        p.Aged55to64 = 0;
        p.Aged65up = 0;
        p.Male = 0;
        p.Female = 0;
        p.Unknown = 0;
      } else {
        p.CovidCases -= v.CovidCases;
        p.CovidDeaths -= v.CovidDeaths;
        p.CovidRecovered -= v.CovidRecovered;
        p.ConfirmedCases -= v.ConfirmedCases;
        p.HospitalisedCases -= v.HospitalisedCases;
        p.RequiringICUCases -= v.RequiringICUCases;
        p.HealthcareWorkersCases -= v.HealthcareWorkersCases;
        p.HospitalisedAged5 -= v.HospitalisedAged5;
        p.HospitalisedAged5to14 -= v.HospitalisedAged5to14;
        p.HospitalisedAged15to24 -= v.HospitalisedAged15to24;
        p.HospitalisedAged25to34 -= v.HospitalisedAged25to34;
        p.HospitalisedAged35to44 -= v.HospitalisedAged35to44;
        p.HospitalisedAged45to54 -= v.HospitalisedAged45to54;
        p.HospitalisedAged55to64 -= v.HospitalisedAged55to64;
        p.HospitalisedAged65up -= v.HospitalisedAged65up;
        p.Aged5 -= v.Aged5;
        p.Aged5to14 -= v.Aged5to14;
        p.Aged15to24 -= v.Aged15to24;
        p.Aged25to34 -= v.Aged25to34;
        p.Aged35to44 -= v.Aged35to44;
        p.Aged45to54 -= v.Aged45to54;
        p.Aged55to64 -= v.Aged55to64;
        p.Aged65up -= v.Aged65up;
        p.Male -= v.Male;
        p.Female -= v.Female;
        p.Unknown -= v.Unknown;
      }
      return p;
    },
    function () {
      return {
        count: 0,
        CovidCases: 0,
        CovidDeaths: 0,
        CovidRecovered: 0,
        ConfirmedCases: 0,
        HospitalisedCases: 0,
        RequiringICUCases: 0,
        HealthcareWorkersCases: 0,
        HospitalisedAged5: 0,
        HospitalisedAged5to14: 0,
        HospitalisedAged15to24: 0,
        HospitalisedAged25to34: 0,
        HospitalisedAged35to44: 0,
        HospitalisedAged45to54: 0,
        HospitalisedAged55to64: 0,
        HospitalisedAged65up: 0,
        Aged5: 0,
        Aged5to14: 0,
        Aged15to24: 0,
        Aged25to34: 0,
        Aged35to44: 0,
        Aged45to54: 0,
        Aged55to64: 0,
        Aged65up: 0,
        Male: 0,
        Female: 0,
        Unknown: 0
      };
    }
  );

  let bogus_dimension = {};
  let fake_group = {
    all: function () {
      return [
        { key: 'Male', value: maleGroupSum.value() },
        { key: 'Female', value: femaleGroupSum.value() },
        { key: 'Unknown', value: unknownGroupSum.value() }
      ];
    }
  }

  let empty_dimension = {};
  let stackedAgeGroup = {
    all: function () {
      return [
        { key: "0-5",   value: allValues.value().Aged5 },
        { key: "5-14",  value: allValues.value().Aged5to14 },
        { key: "15-24", value: allValues.value().Aged15to24 },
        { key: "25-34", value: allValues.value().Aged25to34 },
        { key: "35-44", value: allValues.value().Aged35to44 },
        { key: "45-54", value: allValues.value().Aged45to54 },
        { key: "55-64", value: allValues.value().Aged55to64 },
        { key: "65+",   value: allValues.value().Aged65up }
      ];
    }
  }

  let stackedHospitalisedAgeGroup = {
    all: function () {
      return [
        { key: "0-5",   value: allValues.value().HospitalisedAged5 },
        { key: "5-14",  value: allValues.value().HospitalisedAged5to14 },
        { key: "15-24", value: allValues.value().HospitalisedAged15to24 },
        { key: "25-34", value: allValues.value().HospitalisedAged25to34 },
        { key: "35-44", value: allValues.value().HospitalisedAged35to44 },
        { key: "45-54", value: allValues.value().HospitalisedAged45to54 },
        { key: "55-64", value: allValues.value().HospitalisedAged55to64 },
        { key: "65+",   value: allValues.value().HospitalisedAged65up }
      ];
    }
  }
  let ageArray = [
    allValues.value().Aged5 + allValues.value().HospitalisedAged5,
    allValues.value().Aged5to14 + allValues.value().HospitalisedAged5to14,
    allValues.value().Aged15to24 + allValues.value().HospitalisedAged15to24,
    allValues.value().Aged25to34 + allValues.value().HospitalisedAged25to34,
    allValues.value().Aged35to44 + allValues.value().HospitalisedAged35to44,
    allValues.value().Aged45to54 + allValues.value().HospitalisedAged45to54,
    allValues.value().Aged55to64 + allValues.value().HospitalisedAged55to64,
    allValues.value().Aged65up + allValues.value().HospitalisedAged65up
  ]
  let brainChart = dc.barChart("#stackedBarAge");
  brainChart
  .dimension(empty_dimension)
  .group(stackedAgeGroup, "Non Hospitalised Cases")
  .stack(stackedHospitalisedAgeGroup, "Hospitalised Cases")
  .width($(brainChart.anchor()).parent().width())
  .height(300)
  .renderLabel(true)
  .label(function(d) { 
    console.log(d)
    return d.y1 + "("+d3.format(".0%")(d.y/d.y1) +")"; 
  })
  .x(d3.scaleBand())
  .xUnits(dc.units.ordinal)
  .y(d3.scaleLinear().domain([0, d3.max(ageArray) * 1.1]))
  .legend(dc.legend().x(60).y(30).itemHeight(15).gap(5))
  .barPadding(0.2)
  .hidableStacks(true)
  .xAxisLabel("Cases and Hospitalisations by Age Group");

  brainChart.margins().bottom = 50;

  // instanciate the charts
  let genderChart = dc.barChart('#barCasesGender');

  let numberChartCases = dc.numberDisplay('#total-cases');
  let numberChartDeaths = dc.numberDisplay('#total-deaths');
  let numberChartRecovered = dc.numberDisplay('#total-recovered');

  let numberChartHospital = dc.numberDisplay('#hospitalised-cases');
  let numberChartICU = dc.numberDisplay('#icu-cases');
  let numberChartHealthWorker = dc.numberDisplay('#health-worker-cases');

  createNumberChart(numberChartCases, "CovidCases", ndx, dFormat)
  createNumberChart(numberChartDeaths, "CovidDeaths", ndx, dFormat)
  createNumberChart(numberChartRecovered, "CovidRecovered", ndx, dFormat)
  createNumberChart(numberChartHospital, "HospitalisedCases", ndx, dFormat)
  createNumberChart(numberChartICU, "RequiringICUCases", ndx, dFormat)
  createNumberChart(numberChartHealthWorker, "HealthcareWorkersCases", ndx, dFormat)


  ordinalBarChart(genderChart, bogus_dimension, fake_group)
  genderChart.height(300);

  genderChart.margins().left = 50;
  genderChart.margins().bottom = 50;
  genderChart.filter = function () { };

  dc.renderAll();
}

function cleanCountiesData(d) {
  d['NewCases'] = +d["NewCases"];
  d['3DayAvg'] = +d["3DayAvg"];
  d['7DayAvg'] = +d["7DayAvg"];
  d.County = d.County.toUpperCase();
  d.dd = dateFormat(d.Date.split(" ")[0]);
  d.unixTime = +unixTime(d.dd);
  d.formattedDate = formatTime(d.dd);
  return d;
}

function cleanCasesDeathsData(d) {
  d.ConfirmedCovidCases = +d.ConfirmedCovidCases;
  d.Cases3DayAvg = +d.Cases3DayAvg;
  d.Cases7DayAvg = +d.Cases7DayAvg;
  d.ConfirmedCovidDeaths = +d.ConfirmedCovidDeaths;
  d.Deaths3Day = +d.Deaths3Day;
  d.Deaths7Day = +d.Deaths7Day;
  d.ConfirmedCovidRecovered = +d.ConfirmedCovidRecovered;
  d.dd = dateFormat(d.Date.split(" ")[0]);
  d.unixTime = +unixTime(d.dd);
  d.formattedDate = formatTime(d.dd);
}

function cleanStatsData(d) {
  d.dd = dateFormat(d.Date.split(" ")[0]);
  d.unixTime = +unixTime(d.dd);
  d.formattedDate = formatTime(d.dd);
  d.Aged5 = +d.Aged5;
  d.Aged5to14 = +d.Aged5to14;
  d.Aged15to24 = +d.Aged15to24;
  d.Aged25to34 = +d.Aged25to34;
  d.Aged35to44 = +d.Aged35to44;
  d.Aged45to54 = +d.Aged45to54;
  d.Aged55to64 = +d.Aged55to64;
  d.Aged65up = +d.Aged65up;
  d.CloseContact = +d.CloseContact;
  d.CommunityTransmission = +d.CommunityTransmission;
  d.ConfirmedCases = +d.ConfirmedCases;
  d.Female = +d.Female;
  d.HealthcareWorkersCases = +d.HealthcareWorkersCases;
  d.HospitalisedAged5 = +d.HospitalisedAged5;
  d.HospitalisedAged5to14 = +d.HospitalisedAged5to14;
  d.HospitalisedAged15to24 = +d.HospitalisedAged15to24;
  d.HospitalisedAged25to34 = +d.HospitalisedAged25to34;
  d.HospitalisedAged35to44 = +d.HospitalisedAged35to44;
  d.HospitalisedAged45to54 = +d.HospitalisedAged45to54;
  d.HospitalisedAged55to64 = +d.HospitalisedAged55to64;
  d.HospitalisedAged65up = +d.HospitalisedAged65up;
  d.HospitalisedCases = +d.HospitalisedCases;
  d.Male = +d.Male;
  d.RequiringICUCases = +d.RequiringICUCases;
  d.TravelAbroad = +d.TravelAbroad;
  d.UnderInvestigation = +d.UnderInvestigation;
  d.Unknown = +d.Unknown;
  d.CovidCases = +d.CovidCases;
  d.CovidDeaths = +d.CovidDeaths;
  d.CovidRecovered = +d.CovidRecovered;
  return d;
}

// ===== chart functions
function ordinalBarChart(chart, dimension, group) {
  chart
    .dimension(dimension)
    .group(group)
    .width($(chart.anchor()).parent().width())
    .height(330)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .gap(10)
    //TO-DO modify 17000, max by 1.1
    .y(d3.scaleLinear().domain([0, d3.max(group.all(), d => d.value) * 1.1]))
    .label(function (d) {
      return d.data.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    );
}

function createRowChart(chart, dimension, group) {
  chart
    .dimension(dimension)
    .group(group)
    .width($(chart.anchor()).parent().width() * 1.1)
    .height(340)
    .cap(12)
    .ordering(d => -d.value.total)
    .colors(colorRange)
    .colorDomain([0, d3.extent(group.all(), d => d.value.total)[1] / 8])
    .colorAccessor(function (d, i) { return d.value.total })
    .valueAccessor(function (d) {
      if (d.value.count == 0) {
        return 0;
      } else {
        return d.value.total;
      }
    })
    .title(function (d) {
      if (d.value.total > 0) return d.value.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    })
    .renderTitleLabel(true)
    .elasticX(true);
}

function createCompositeChart(chart, dimension, groups) {
  chart
    .width($(chart.anchor()).parent().width())
    .height(300)
    .legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
    .renderHorizontalGridLines(false)
    .x(d3.scaleLinear().domain(d3.extent(groups[0].all(), d => d.key)))
    .elasticY(true).brushOn(true)
    .compose([
      new dc.LineChart(chart)
        .dimension(dimension)
        .colors('black')
        .group(groups[0], "Cases per Day")
        .dashStyle([2, 2])
        .xyTipsOn(true),
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

function show_number_filtered(ndx) {
  let group = ndx.groupAll();

  dc.dataCount('#cases-count')
    .crossfilter(ndx)
    .groupAll(group)
    .transitionDuration(500);
}

function createNumberChart(chart, column, ndx, dFormat) {
  chart
    .formatNumber(dFormat)
    .group(ndx.groupAll().reduceSum(d => d[column]))
    .valueAccessor(d => d)
}


// ===== chart subfunctions
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

// ====== general functions
let roundDown = function (num, precision) {
  num = parseFloat(num);
  if (!precision) return num.toLocaleString();
  return (Math.floor(num / precision) * precision).toLocaleString();
};

function getDaysFromUnixTime(data, day) {
  let mondays = [];
  for (let i in data) {
    if (dayFormat(data[i].dd) == day) {
      mondays.push(data[i].unixTime)
    }
  }
  return [...new Set(mondays)];;
}

function toggleSeriesLine(chartId, lineId) {
  document.querySelectorAll("#" + chartId + " .sub .stack path").forEach(d => d.classList.add("fadeout"))
  document.querySelector("#" + chartId + " .sub._" + lineId + " .stack path").classList.remove("fadeout")

}


function oldcharts() {
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
