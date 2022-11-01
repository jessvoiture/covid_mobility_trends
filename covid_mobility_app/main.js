const margin = { top: 20, bottom: 40, left: 80, right: 20 };

const width = 700 - margin.left - margin.right;
const height = 700 - margin.top - margin.bottom;

const num_states = 43; // 43 states with stay at home orders (7 never implemented one)
const row_space = height / num_states; 
const row_translate = 8;
const circ_radius = 3
const line_width = 2

// const tickAmount = d3.timeWeek.every(1);

// tooltip
const div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// viz
const svg = d3.select('.timeline')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/state_data.csv?version=123").then(function(data, error){

    if (error) {
        console.log("error reading file");
    }

    data.sort(function(x, y){
        return d3.ascending(x.sah_week_start_date, y.sah_week_start_date);
     })

    /* FORMAT DATA TYPES */
    // format time as 24 hour clock
    var parseTime = d3.timeParse("%Y-%m-%d");

    // correct data types
    data.forEach(function(d) {
        d.week_start_date = parseTime(d.week_start_date);
        d.sah_week_start_date = parseTime(d.sah_week_start_date);
    });

    /* DOMAINS */
    // find x and y domains from data
    var min_date = d3.min(data, function(d) { return d.week_start_date; });
    var x_min = d3.timeDay.offset(min_date, -4);

    var max_date = d3.max(data, function(d) { return d.sah_week_start_date; });
    var x_max = d3.timeDay.offset(max_date, 4);

    var states = data.map(function(d){ return d.Code});

    var x_scale = d3.scaleTime()		
        .domain([x_min, x_max])
        .range([0, width]);

    svg.append("g")
        .call(d3.axisTop(x_scale)
            // .ticks(tickAmount)
            .ticks(d3.timeDay.every(4))
            .tickFormat(d3.timeFormat("%b %d")));

    var y_scale = d3.scaleBand()
        .domain(states)
        .range([0, height]);

    svg.append("g")
        .call( d3.axisLeft(y_scale) );

    var lines_btwn = svg.selectAll("lines")
        .data(data)
        .enter()
        .append("line")
        .attr("class", "line_between")
        .attr("id", function(d) { return d.region })
        .attr("x1", function(d) {
            console.log(x_scale(d.week_start_date));
            return x_scale(d.week_start_date);
        })
        .attr("y1", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("x2", function(d) {
            console.log(d.sah_week_start_date)
            return x_scale(d.sah_week_start_date);
        })
        .attr("y2", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("stroke", "black")
        .attr("stroke-width", line_width);

    // Make the dots for 1990

    var start_circs = svg.selectAll("circle.start")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "start")
        .attr("cx", function(d) {
            return x_scale(d.week_start_date);
        })
        .attr("cy", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("r", circ_radius)
        .style("fill", "blue")
        .on("mouseover", function(event, d) {
            div.transition()
                .duration(100)
                .style("opacity", 1);

            var element = d3.select(this);
            element.style("stroke", "yellow");

            div.html("<span class = state_tooltip_heading style = 'font-weight: bold'>" + d.region + ": " +  d.week_start_date + "</span>" + "<br>" +
                    "<span class = state_tooltip_content style = 'font-style: italic'>" + d.percent_diff + "</span>")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 30) + "px");
          })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            var element = d3.select(this)
            element.style("stroke", "none")
            });;

    var sah_circs = svg.selectAll("circle.sah")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "sah")
        .attr("cx", function(d) {
            return x_scale(d.sah_week_start_date);
        })
        .attr("cy", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("r", circ_radius)
        .style("fill", "black")
        .on("mouseover", function(event, d) {
            div.transition()
                .duration(100)
                .style("opacity", 1);

            var element = d3.select(this);
            element.style("stroke", "yellow");

            div.html("<span class = state_tooltip_heading style = 'font-weight: bold'>" + d.region + ": " +  d.sah_week_start_date + "</span>" + "<br>" +
                    "<span class = state_tooltip_content style = 'font-style: italic'>" + d.percent_diff + "</span>")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 30) + "px");
          })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            var element = d3.select(this)
            element.style("stroke", "none")
            });;

    // add the axes
    
    // /* SCALES */
    // // x
    // var x = d3.scaleTime()		
    //     .domain([min_date, max_date])
    //     .range([0, width]);
    
    // // y    
    // var y = d3.scaleBand()
    //     .domain(states)
    //     .range([0, height]);

    // // append y axis to svg    
    // svg.append("g")
    //     .call( d3.axisLeft(y) );

    // // append x axis to svg
    // svg.append("g")
    //     .attr("transform", "translate(0," + 0 + ")")
    //     .call( d3.axisTop(x) 
    //              .ticks(d3.timeDay.every(1), '%d %b'));

    // /* LINES */ 
    // let sound_bars = svg
    //     .selectAll("line")
    //     .data(data)
    //     .enter()
    //     .append("line")
    //     .attr("class","lag_path")
    //     .attr("id", function(d) { return d.region})
    //     .attr("x1", function(d){
    //         return x(d.week_start_date) 
    //     })
    //     .attr("y1",function(d) { 
    //         console.log(y(d.region));
    //         return y(d.region)}
    //     )
    //     .attr("x2", function(d){
    //         return x(d.sah_start_date) 
    //     })
    //     .attr("y2",function(d) { 
    //         return y(d.region)}
    //     )
    //     .style("stroke", "black")

    


})