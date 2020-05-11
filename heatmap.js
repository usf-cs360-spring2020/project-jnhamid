let csv = 'heatmap2.csv';

// configuration of svg/plot area
let config = {
  'svg': {},
  'margin': {},
  'plot': {}
};

config.svg.height = 400;
config.svg.width = config.svg.height * 2.0; // golden ratio

config.margin.top = 70;
config.margin.right = 10;
config.margin.bottom = 10;
config.margin.left = 80;

config.plot.x = config.margin.left;
config.plot.y = config.margin.top;
config.plot.width = config.svg.width - config.margin.left - config.margin.right;
config.plot.height = config.svg.height - config.margin.top - config.margin.bottom;

// setup svg
let svg1 = d3.select('body').select('svg#heatmap');
svg1.attr('width', config.svg.width);
svg1.attr('height', config.svg.height);

// setup plot area
let plot = svg1.append('g');
plot.attr('id', 'plot');
plot.attr('transform', translate(config.plot.x, config.plot.y));

// use a rect to illustrate plot area
let rect = plot.append('rect');
rect.attr('id', 'background');

rect.attr('x', 0);
rect.attr('y', 0);
rect.attr('width', config.plot.width);
rect.attr('height', config.plot.height);

// scales for data
let scale = {};

scale.x = d3.scaleBand();
scale.x.range([0, config.plot.width]);

scale.y = d3.scaleBand();
scale.y.range([config.plot.height, 0]);

// https://github.com/d3/d3-scale-chromatic
scale.color = d3.scaleSequential(d3.interpolateOranges);

let axis = {};  // axes for data
axis.x = d3.axisTop(scale.x);
axis.x.tickPadding(0);

axis.y = d3.axisLeft(scale.y);
axis.y.tickPadding(0);

// format the tick labels
axis.x.tickFormat();
axis.y.tickFormat();

// load data
// https://github.com/d3/d3-fetch/blob/master/README.md#csv
d3.csv(csv, convertRow).then(drawHeatmap);

// function to convert column names into date
// try: parseColumnName('1979-12');
// let parseColumnName = d3.timeParse('%Y-%m');

// function to convert each row
// https://github.com/d3/d3-fetch/blob/master/README.md#csv
function convertRow(row, index) {
  // this will be our converted output row
  let out = {};

  // this will be the values from each yyyy-mm column
  out.values = [];

  // loop through all of the columns in our original row
  // depending on column name, perform some sort of conversion
  for (let col in row) {
    switch (col) {
      // these are the text columns that do not need conversion
      case 'Month':
        out[col] = row[col];
        break;
      // these should be our time series values
      default:
        // convert column name into the date
        var month = col;

        // convert the value to float
        var value = parseInt(row[col]);

        // add them to our values
        out.values.push({
          'date': month,
          'value': value
        });
    }
  }

  return out;
}

function drawHeatmap(data) {
  console.log(data);

  // lets reduce data size to biggest regions
  // the number of rows to keep

  // filter dataset to smaller size

  // sorting is important in heatmaps
  // options: RegionName, SizeRank, HistoricAverage_1985thru1999
  let sortColumn = '';

  data = data.sort(function(a, b) {
    return a[sortColumn] - b[sortColumn];
  });

  // need domains to setup scales
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  let regions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  console.log(regions);

  let dates = data[0].values.map(value => value.date);
  console.log(dates);

  // now that we have data set the scale domain
  scale.x.domain(dates);
  scale.y.domain(regions.reverse());

  // draw the x and y axis
  let gx = svg1.append("g");
  gx.attr("id", "x-axis");
  gx.attr("class", "axis");
  gx.attr("transform", translate(config.plot.x, config.plot.y));
  gx.call(axis.x);

  let gy = svg1.append("g");
  gy.attr("id", "y-axis");
  gy.attr("class", "axis");
  gy.attr("transform", translate(config.plot.x, config.plot.y));
  gy.call(axis.y);

  // get all of the value objects (with date and value) from the rows
  let values = data.map(d => d.values);

  // combine all of the individual object arrays into one
  let merged = d3.merge(values);

  // get only the value part of the objects
  let mapped = merged.map(d => d.value);

  console.log("Mapped", mapped)

  // calculate the min, max, and median
  let min = d3.min(mapped);
  let max = d3.max(mapped);
  let mid = d3.mean(mapped);

  scale.color.domain([min, 356 ,max]);

  // create one group per row
  let rows = plot.selectAll("g.cell")
    .data(data)
    .enter()
    .append("g");

  rows.attr("class", "cell");
  rows.attr("id", d => "Region-" + d.RegionID);

  // shift the entire group to the appropriate y-location
  rows.attr("transform", function(d) {
    return translate(0, scale.y(d.Month));
  });

  // create one rect per cell within row group
  let cells = rows.selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect");

  cells.attr("x", d => scale.x(d.date));
  cells.attr("y", 0); // handled by group transform
  cells.attr("width", scale.x.bandwidth());
  cells.attr("height", scale.y.bandwidth());

  // here is the color magic!
  cells.style("fill", d => scale.color(d.value));
  cells.style("stroke", "white");


  cells.on("mouseover.hover", function(d) {
    d3.select(this)
      .raise()
      .style("stroke", "red")
      .style("stroke-width", 2);

    let div = d3.select("body").append("div");

    div.attr("id", "details");
    div.attr("class", "tooltip1");

    console.log(Object(d));

    let datanew = createTooltip(Object(d));
    let rows = div.append("tablenew")
      .selectAll("tr")
      .data(Object.keys(datanew))
      .enter()
      .append("tr");

    rows.append("th").text(key => key);
    rows.append("td").text(key => datanew[key]);
    div.style("display", "inline");
  });

  cells.on("mousemove.hover", function(d) {
    let div = d3.select("div#details");
    let bbox = div.node().getBoundingClientRect();

    div.style("left", d3.event.pageX + "px");
    div.style("top", (d3.event.pageY - bbox.height) + "px");
  });

  cells.on("mouseout.hover", function(d) {
    d3.select(this).style("stroke", scale.color(d));
    d3.selectAll("div#details").remove();
    cells.style("stroke", "white");
  });

  svg1.append("g")
  .attr("class", "legendLinear")
  .attr("transform", "translate(600,30)")

  var legendLinear = d3.legendColor()
    .shapeWidth(3)
    .cells(50)
    .shapePadding(0)
    .orient('horizontal')
    .classPrefix("heatmap-")
    .scale(scale.color)

    // .title("Avg. Minutes");

  svg1.select(".legendLinear")
    .call(legendLinear);


    svg1.append("text").attr("id","legendtitle")
     .attr("x", 680)
     .attr("y",20)
     .style("text-anchor", "middle")
     .style("font-weight", 600)
     .style("font-size", "14px")
     .text("Number of Reports");
     svg1.append("text").attr("id","legendMinScale")
      .attr("x", 580)
      .attr("y",41)
      .style("text-anchor", "left")
      .style("font-weight", 500)
      .style("font-size", "12px")
      .text(min);
      svg1.append("text").attr("id","legendMaxScale")
       .attr("x", 755)
       .attr("y",41)
       .style("text-anchor", "left")
       .style("font-weight", 500)
       .style("font-size", "12px")
       .text(max);
}

function createTooltip(row, index) {
    let out = {};
    for (let col in row) {
      switch (col) {

        case 'date':
          out['District:\xa0'] = row[col];
          break;
        case 'value':
          out['Number of Reports:\xa0'] = parseInt(row[col]);
        default:
          break;
      }
    }
    return out;
  }

// helper method to make translating easier
function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}
