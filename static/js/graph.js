/* global dc, crossfilter, d3 */

// == load the data
d3.csv('data/COVID19 - County.csv')
  .then(function (data) {
    data.forEach(d => modifyData(d));
    return data;
  })
  .then(function (data) {
    createCharts(data);
  })
  .catch(function (error) {
    console.log(error);
  });

  //fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRgkvhtziA93AnQaiE6eMmf_iujke82_gBtv6_Ixs5XIzZ-dc4rgXug2Ll8P3N56PqyHz5ECvfxBDW_/pub?gid=786105712&single=true&output=csv', {mode: 'cors'})
  //.then(function(response) {
  //  return response.text();
  //})
  //.then(function(text) {
  //  console.log('Request successful', text);
  //})
  //.catch(function(error) {
  //  log('Request failed', error)
  //});

function modifyData(d) {
  d['NewCases'] = +d["NewCases"]
  d['3DayAvg'] = +d["3DayAvg"]
  d['7DayAvg'] = +d["7DayAvg"]
  //d.age = ~~((Date.now() - new Date(d.DOB)) / (31557600000));
  //d.ageGroup = roundDown(d.age, 10) + "'s'"
  return d;
}


function createCharts(peopleData) {
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

function addDatesToChartOrig(chart){
  let covidDates = [
    //{date:1583971200000, label:"Delay Phase"},
    //{date:1585267200000, label:"Stay Home Phase"},
    {date:1583971200000, label:"Ease Restrictions"},
    {date:1585267200000, label:"27th March: Lockdown Starts"}
  ]
  for (const covDate in covidDates) {
    let covidDate = covidDates[covDate].date;
    let covidLabel = covidDates[covDate].label;
    let id = covDate+"extra-line";
  }
  let covidDate = 1585267200000;
  let covidLabel = '27th March: Lockdown Starts'

  let line_coordinates = [{x: chart.x()(covidDate), y: 0}, {x: chart.x()(covidDate), y: chart.effectiveHeight()}];
  let line = d3.line()
    .x(function(lined) { 
      return lined.x; 
    }).y(function(lined) { 
      return lined.y; 
    });
  let chartBody = chart.select('g');
  let path = chartBody.selectAll('path.extra').data([line_coordinates]);
  path = path
        .enter()
          .append('path')
          .attr('class', 'extra')
          .attr('stroke', 'red')
          .attr('id', 'extra-line')
          .attr("stroke-width", 1)
          .style("stroke-dasharray", ("10,3"))
      .merge(path);
  path.attr('d', line);

    
          // and perhaps you'd like to label it?
  let text = chartBody.selectAll('text.extra-label').data([0]);
  text.enter()
      .append('text')
          .attr('text-anchor', 'start')
          .attr('dy',-10)
          .append('textPath')
              .attr('class', 'extra-label')
              .attr('xlink:href', '#extra-line')
              .attr('startOffset', '0%')
              .text(covidLabel);
//}
}

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

function show_average_salaries(ndx) {
  var genderDim = ndx.dimension(dc.pluck("sex"));
  var averageSalaryByGender = genderDim.group().reduce(
      function (p, v) {
          p.count++;
          p.total += v.salary;
          return p;
      },
      function (p, v) {
          p.count--;
          if (p.count == 0) {
              p.total = 0;
          } else {
              p.total -= v.salary;
          }
          return p;
      },
      function () {
          return {count: 0, total: 0};
      }
  );

  dc.barChart("#average-salary")
      .width(350)
      .height(250)
      .margins({top: 10, right: 50, bottom: 30, left: 50})
      .dimension(genderDim)
      .group(averageSalaryByGender)
      .valueAccessor(function (d) {
          if (d.value.count == 0) {
              return 0;
          } else {
              return d.value.total / d.value.count;
          }
      })
      .transitionDuration(500)
      .x(d3.scale.ordinal())
      .xUnits(dc.units.ordinal)
      .elasticY(true)
      .xAxisLabel("Gender")
      .yAxis().ticks(4);
}

let roundDown = function (num, precision) {
  num = parseFloat(num);
  if (!precision) return num.toLocaleString();
  return (Math.floor(num / precision) * precision).toLocaleString();
};
