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

  //  https://gist.github.com/mbostock/44466fb0ff73bd630172020fc66df1dc
  fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=247770862&single=true&output=csv', {mode: 'cors'})
  .then(function(response) {
    return response.ok ? response.text() : Promise.reject(response.status);
  })
  .then(function(text) {
    return d3.csvParse(text);
  })
  .then(function (data) {
    data.forEach(d => cleanDeathsData(d));
    console.log(data)
    return data
  })
  .catch(function(error) {
    console.log('Request failed', error)
  });

function modifyData(d) {
  d['NewCases'] = +d["NewCases"]
  d['3DayAvg'] = +d["3DayAvg"]
  d['7DayAvg'] = +d["7DayAvg"]
  //d.age = ~~((Date.now() - new Date(d.DOB)) / (31557600000));
  //d.ageGroup = roundDown(d.age, 10) + "'s'"
  return d;
}
const dateFormat = d3.timeParse("%Y/%m/%d");
const formatTime = d3.timeFormat("%a %d %b");
const unixTime = d3.timeFormat("%Q");

function cleanDeathsData(d){
  d.Cases3DayAvg = +d.Cases3DayAvg;
  d.Cases7DayAvg = +d.Cases7DayAvg;
  d.ConfirmedCovidCases = +d.ConfirmedCovidCases;
  d.ConfirmedCovidDeaths = +d.ConfirmedCovidDeaths;
  d.ConfirmedCovidRecovered = +d.ConfirmedCovidRecovered;
  d.Deaths3Day = +d.Deaths3Day;
  d.Deaths7Day = +d.Deaths7Day;
  d.dd = dateFormat(d.StatisticsProfileDate.split(" ")[0]);
  d.unixTime = unixTime(d.dd);
  d.formattedDate = formatTime(d.dd);;
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
        return {count: 0, total: 0, threeDay:0, sevenDay:0};
    }
  );
  
  // instanciate the charts
  let barChart01 = dc.rowChart('#chart01');
  let barChart02 = dc.barChart('#chart02');
  let barChart03 = dc.barChart('#chart03');
  let barChart04 = dc.barChart('#chart04');
  let barChart05 = dc.barChart('#chart05');

  barChart01
    .dimension(countyDimension)
    .group(averageSalaryByGender)
    .width($(barChart01.anchor()).parent().width())
    .height(500)
    //.x(d3.scaleBand())
    //.xUnits(dc.units.ordinal)
    .cap(12)
    .ordering(d => -d.value.total)
    .valueAccessor(function (d) {
      if (d.value.count == 0) {
        return 0;
      } else {
        return d.value.total;
      }
    })
    .title(function(d) {
      if(d.value.total > 0) return d.value.total + " cases"; 
      })
    .renderTitleLabel(true)
    .elasticX(true);

  barChart02
    .dimension(provinceDimension)
    .group(provinceNewCasesGroup)
    .width($(barChart02.anchor()).parent().width())
    .height(500)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal);
    
    barChart03
    .dimension(dataDimension)
    .group(dateNewCasesGroup)
    .width($(barChart03.anchor()).parent().width())
    .height(300)
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(true)
    .elasticY(true)

    .on('postRender', function(chart) {
      addDatesToChart(chart)
    });
    barChart03.xAxis().tickValues([1584921600000,1585526400000,1586131200000, 1586736000000, 1587340800000,1587945600000]);
    barChart03.xAxis().tickFormat(function(v) {
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
    .on('postRender', function(chart) {
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
    .on('postRender', function(chart) {
      addDatesToChart(chart)
  });
    
    barChart01.margins().left = 50;
    barChart02.margins().left = 50;
    barChart03.margins().left = 50;
    barChart04.margins().left = 50;
    barChart05.margins().left = 50;
    timeXAxis(barChart03)
    timeXAxis(barChart04)
    timeXAxis(barChart05)


  dc.renderAll();
};

function timeXAxis(chart){
  chart.xAxis().tickValues([1584921600000,1585526400000,1586131200000, 1586736000000, 1587340800000,1587945600000]);
  chart.xAxis().tickFormat(function(v) {
    let date = new Date(v);
    return date.toDateString().split(" 2020").join(" ").trim();
  })
}

function addDatesToChart(chart) {
  let chartBody = chart.select('g').select('g');

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
      .attr('d', d3.line()([[chart.x()(covidDate), 10], [chart.x()(covidDate), chart.effectiveHeight() + 10]]))
      .attr('stroke', 'red')
      .attr("stroke-width", 1)
      .style("stroke-dasharray", ("10,3"))

    // add text to line
    chartBody.append('text')
      .attr('x', 10)
      .attr('y', -chart.x()(covidDate) - 5)
      .attr('transform', 'rotate(90)')
      .attr('class', 'small')
      .text(covidLabel);
  }
}

let roundDown = function (num, precision) {
  num = parseFloat(num);
  if (!precision) return num.toLocaleString();
  return (Math.floor(num / precision) * precision).toLocaleString();
};
