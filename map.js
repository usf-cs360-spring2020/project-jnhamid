
const urls = {
  basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson?$$app_token=AgJNk6xm3X6yMUftt184KHvfU&",
  police: "https://data.sfgov.org/resource/q52f-skbd.geojson?$$app_token=AgJNk6xm3X6yMUftt184KHvfU&",
  streets: "https://data.sfgov.org/resource/hn5x-7sr8.geojson?$$app_token=AgJNk6xm3X6yMUftt184KHvfU&$limit=5000",
  reports: "https://data.sfgov.org/resource/vw6y-z8j6.json"
};


let onload = 0;
// calculate date range
const end = d3.timeDay.floor(d3.timeDay.offset(new Date(), -1));
const start = d3.timeDay.floor(d3.timeDay.offset(end, -365));
const monthFrom = d3.timeDay.floor(d3.timeDay.offset(end, -31));

const format = d3.timeFormat("%Y-%m-%d");
console.log(format(start), format(end));

// add parameters to reports url
urls.reports += "?$$app_token=AgJNk6xm3X6yMUftt184KHvfU&$limit=100000&$where=starts_with(service_subtype, 'Human or Animal Waste')";
urls.reports += " AND updated_datetime between '" + format(start) + "'";
urls.reports += " and '" + format(end) + "'";

// output url before encoding
console.log(urls.reports);

// encode special characters
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
urls.reports = encodeURI(urls.reports);
console.log(urls.reports);

let key = ["Past 30 Days", "January", "Feburay", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Year from date"];

let keys = ["January", "Feburay", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];



var svg = d3.select("body").select("svg#vis");

// add the options to the button
    d3.select("#selectButton")
      .selectAll('myOptions')
     	.data(key)
      .enter()
    	.append('option')
      .text(function (d) { return d; }) // text showed in the menu
      .attr("value", function (d) { return d; })

const g = {
  basemap: svg.select("g#basemap"),
  police: svg.select("g#police"),
  streets: svg.select("g#streets"),
  outline: svg.select("g#outline"),
  cars: svg.select("g#reports"),
  tooltip: svg.select("g#tooltip"),
  details: svg.select("g#details")
};

// setup tooltip (shows neighborhood name)
const tip = g.tooltip.append("text").attr("id", "tooltip");
tip.attr("text-anchor", "end");
tip.attr("dx", -5);
tip.attr("dy", -5);
tip.style("visibility", "hidden");

// add details widget
// https://bl.ocks.org/mbostock/1424037
const details = g.details.append("foreignObject")
  .attr("id", "details")
  .attr("width",  340)
  .attr("height", 200)
  .attr("x", 0)
  .attr("y", 0);

const body = details.append("xhtml:body")
  .style("text-align", "center")
  .style("background", "none")
  .html("<p>N/A</p>");

details.style("visibility", "hidden");

 console.log(keys[0])

var z = d3.scaleOrdinal(d3.schemePaired).domain(keys)

// setup projection
// https://github.com/d3/d3-geo#geoConicEqualArea
const projection = d3.geoConicEqualArea();
projection.parallels([37.692514, 37.840699]);
projection.rotate([122, 0]);

// setup path generator (note it is a GEO path, not a normal path)
const path = d3.geoPath().projection(projection);

d3.json(urls.basemap).then(function(json) {
  // makes sure to adjust projection to fit all of our regions
  projection.fitSize([960, 600], json);

  // draw the land and neighborhood outlines
  drawBasemap(json);

  // now that projection has been set trigger loading the other files
  // note that the actual order these files are loaded may differ
  d3.json(urls.police).then(drawPolice)
  d3.json(urls.streets).then(drawStreets);
  d3.json(urls.reports).then(drawcars);
});

function drawBasemap(json) {
  console.log("basemap", json);

  const basemap = g.basemap.selectAll("path.land")
    .data(json.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");

  const outline = g.outline.selectAll("path.neighborhood")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "neighborhood")
}

function drawPolice(json) {
  console.log("police", json);

  const police = g.police.selectAll("path.land")
    .data(json.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");

  const outline = g.outline.selectAll("path.district")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "district")
      .each(function(d) {
        // save selection in data for interactivity
        // saves search time finding the right outline later
        d.properties.outline = this;
      });

  // add highlight
  police.on("mouseover.highlight", function(d) {
    d3.select(d.properties.outline).raise();
    d3.select(d.properties.outline).classed("active", true);
  })
  .on("mouseout.highlight", function(d) {
    d3.select(d.properties.outline).classed("active", false);
  });

  // add tooltip
  police.on("mouseover.tooltip", function(d) {
    tip.text(d.properties.district);
    tip.style("visibility", "visible");
  })
  .on("mousemove.tooltip", function(d) {
    const coords = d3.mouse(g.police.node());
    tip.attr("x", coords[0]);
    tip.attr("y", coords[1]);
  })
  .on("mouseout.tooltip", function(d) {
    tip.style("visibility", "hidden");
  });
}

function drawStreets(json) {
  console.log("streets", json);

  // only show active streets
  const streets = json.features.filter(function(d) {
    return d;
  });

  console.log("removed", json.features.length - streets.length, "inactive streets");

  g.streets.selectAll("path.street")
    .data(streets)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "street")
    .raise();
}
//
function drawcars(json) {
  console.log("cars", json);
  console.log("onload:", onload)

let dataReports = json

  // loop through and add projected (x, y) coordinates
  // (just makes our d3 code a bit more simple later)
  dataReports = json.filter(function(d) {
          return d.status_notes !== "Case is a Duplicate";
        });
      dataReports.forEach(function(d) {
        const latitude = parseFloat(d.lat);
        const longitude = parseFloat(d.long);
        const pixels = projection([longitude, latitude]);
        var month = covertToMonth(d.updated_datetime);
        d.x = pixels[0];
        d.y = pixels[1];
        d.month = month;
      });

      json = dataReports.filter(function(d){
          return d.requested_datetime > format(monthFrom);
      });

      console.log(dataReports);


      if(onload> 0){
        json = dataReports
      }
      console.log(json)

      onload++;

  var symbols = g.cars.selectAll("circle")
    .data(json)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("class", "symbol")
    .style("fill", d => z(keys[d.month]));

  symbols.on("mouseover", function(d) {
    d3.select(this).raise();
    d3.select(this).classed("active", true);

    symbols.filter(e => e.month != d.month)
        .transition()
        .style("fill-opacity", ".1");

      symbols.filter(function(e) {
                return d.month === e.month;
            }).raise();
    // use template literal for the detail table
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
    const html = `
      <table border="0" cellspacing="0" cellpadding="2">
      <tbody>
        <tr>
          <th>Service Request:</th>
          <td>${d.service_request_id}</td>
        </tr>
        <tr>
          <th>Requested Date:</th>
          <td>${d.requested_datetime}</td>
        </tr>
        <tr>
          <th>Street:</th>
          <td>${d.street}</td>
        </tr>
        <tr>
          <th>Address:</th>
          <td>${d.address}</td>
        </tr>
        <tr>
          <th>Source of report:</th>
          <td>${d.source}</td>
        </tr>
      </tbody>
      </table>
    `;

    body.html(html);
    details.style("visibility", "visible");
  });

  symbols.on("mouseout", function(d) {
    d3.select(this).classed("active", false);
    details.style("visibility", "hidden");
    symbols.transition().style("fill-opacity", ".7");
  });

  svg.append("g")
  .attr("class", "legendLinear1")
  .attr("transform", "translate(10,260)")

  var legendLinear1 = d3.legendColor()
    .shapeWidth(20)
    .shapeHeight(20)
    .cells(4)
    .shapePadding(1)
    .orient('vertical')
    .scale(z)

    // .title("Avg. Minutes");

  svg.select(".legendLinear1")
    .call(legendLinear1);
    svg.append("text").attr("id","legendtitle")
     .attr("x", 42  )
     .attr("y",250)
     .style("text-anchor", "middle")
     .style("font-weight", 600)
     .style("font-size", "18px")
     // .text("Month");



     function drawcars2(json) {
       console.log("cars", json);
       console.log("onload:", onload)
       symbols.remove();


       symbols = g.cars.selectAll("circle")
         .data(json)
         .enter()
         .append("circle")
         .attr("cx", d => d.x)
         .attr("cy", d => d.y)
         .attr("r", 5)
         .attr("class", "symbol")
         .style("fill", d => z(keys[d.month]));

       symbols.on("mouseover", function(d) {
         d3.select(this).raise();
         d3.select(this).classed("active", true);

         symbols.filter(e => e.month != d.month)
             .transition()
             .style("fill-opacity", ".1");

           symbols.filter(function(e) {
                     return d.month === e.month;
                 }).raise();
         // use template literal for the detail table
         // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
         const html = `
           <table border="0" cellspacing="0" cellpadding="2">
           <tbody>
             <tr>
               <th>Service Request:</th>
               <td>${d.service_request_id}</td>
             </tr>
             <tr>
               <th>Requested Date:</th>
               <td>${d.requested_datetime}</td>
             </tr>
             <tr>
               <th>Street:</th>
               <td>${d.street}</td>
             </tr>
             <tr>
               <th>Address:</th>
               <td>${d.address}</td>
             </tr>
             <tr>
               <th>Source of report:</th>
               <td>${d.source}</td>
             </tr>
           </tbody>
           </table>
         `;

         body.html(html);
         details.style("visibility", "visible");
       });

       symbols.on("mouseout", function(d) {
         d3.select(this).classed("active", false);
         details.style("visibility", "hidden");
         symbols.transition().style("fill-opacity", ".7");
       });
     }

  function update(selectedGroup) {

         // Create new data with the selection?

         console.log(dataReports)

         var dataFilter = dataReports.filter(function(d){return keys[d.month]==selectedGroup})

         console.log("update call", selectedGroup)
         console.log("update call", dataFilter)



         if(selectedGroup == "Year from date"){
           dataFilter = dataReports;
         }
         else if(selectedGroup == "Past 30 Days"){
           dataFilter= dataReports.filter(function(d){
               return d.requested_datetime > format(monthFrom);
           })
         }
         shuffle(dataFilter)
         dataFilter = dataFilter.slice(0,12500)

         console.log("update call", dataFilter)

         drawcars2(dataFilter);

       }
       // When the button is changed, run the updateChart function
      d3.select("#selectButton").on("change", function(d) {
           // recover the option that has been chosen
           var selectedOption = d3.select(this).property("value")

           // run the updateChart function with this selected option
           update(selectedOption)
       })
}

// drawheatmap(json){
//
// }

function translate(x, y) {
  return "translate(" + String(x) + "," + String(y) + ")";
}

function covertToMonth(day){
  date = new Date(day)

  return(date.getMonth())


}

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}
