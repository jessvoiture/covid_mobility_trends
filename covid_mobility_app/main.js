const margin = { top: 20, bottom: 40, left: 40, right: 40 };

const width = 500 - margin.left - margin.right;
const height = 750 - margin.top - margin.bottom;

const num_states = 43; // 43 states with stay at home orders (7 never implemented one)
const row_space = height / num_states; 
const row_translate = 8;

const line_width = 2

const ticks_unit = d3.timeDay.every(4)

// tooltip
const div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// viz
const svg = d3.select('.timeline')
    .append('svg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", '0 0 1000 1250')
    .append('g')
    .attr("class", "fig-content")
    .attr('transform', `translate(${margin.left},${margin.top})`);


d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/state_data.csv?version=123").then(function(data, error){

    if (error) {
        console.log("error reading file");
    }

    // sort by the day the stay-at-home (sah) order began
    data.sort(function(x, y){
        return d3.ascending(x.sah_week_start_date, y.sah_week_start_date);
     })

    /* FORMAT DATA TYPES */
    var parseTime = d3.timeParse("%Y-%m-%d");

    // correct data types
    data.forEach(function(d) {
        d.week_start_date = parseTime(d.week_start_date);
        d.sah_week_start_date = parseTime(d.sah_week_start_date);
    });

    /* DOMAINS AND AXES */
    // find x and y domains from data
    var min_date = d3.min(data, function(d) { return d.week_start_date; });
    var x_min = d3.timeDay.offset(min_date, -3);

    var max_date = d3.max(data, function(d) { return d.sah_week_start_date; });
    var x_max = d3.timeDay.offset(max_date, 3);

    var states = data.map(function(d){ return d.Code});

    // x axis
    var x_scale = d3.scaleTime()		
        .domain([x_min, x_max])
        .range([0, width]);

    // top x axis
    svg.append("g")
        .attr("class", "x_axis")
        .call(d3.axisTop(x_scale)
            .ticks(ticks_unit)
            .tickFormat(d3.timeFormat("%b %d")))

    // bottom x axis
    svg.append("g")
        .attr("class", "x_axis")
        .call(d3.axisBottom(x_scale)
            .ticks(ticks_unit)
            .tickFormat(d3.timeFormat("%b %d")))
        .attr("transform", "translate(0," + height + ")")
    
    // y axis
    var y_scale = d3.scaleBand()
        .domain(states)
        .range([0, height]);

    svg.append("g")
        .attr("class", "y_axis")
        .call( d3.axisLeft(y_scale) );

    // assign y-axis labels (the state codes) an id so that their style attributes can be manipulated in mouseover/out events    
    svg.select(".y_axis")
        .selectAll("text")
        .attr("id", function(d, i) { return data[i].Code; });

    /* DOT PLOT */ 
    // create lines that connect the circles
    var lines_btwn = svg.selectAll("lines")
        .data(data)
        .enter()
        .append("line")
        .attr("class", "line_between")
        .attr("id", function(d) { return d.Code })
        .attr("x1", function(d) {
            return x_scale(d.week_start_date);
        })
        .attr("y1", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("x2", function(d) {
            return x_scale(d.sah_week_start_date);
        })
        .attr("y2", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("stroke", "gray")
        .attr("stroke-width", line_width)
        .attr("opacity", 1)
        .on("mouseover", onMouseover)
        .on("mouseout", onMouseout);

    // create the circles for when the state observed its largest decline in mobility (week_start_date)
    var start_circs = svg.selectAll("circle.start")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "start")
        .attr("id", function(d) { return d.Code; })
        .attr("cx", function(d) {
            return x_scale(d.week_start_date);
        })
        .attr("cy", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("r", function(d) {
            return Math.log(d.weekly_avg_new_cases);
        })
        .style("fill", "blue")
        .on("mouseover", onMouseover) 
        .on("mouseout", onMouseout);

    // create the circles for when the state imposed a stay-at-home (sah) order (sah_week_start_date)
    var sah_circs = svg.selectAll("circle.sah")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "sah")
        .attr("id", function(d) { return d.Code; })
        .attr("cx", function(d) {
            return x_scale(d.sah_week_start_date);
        })
        .attr("cy", function(d, i) {
            return i * row_space + row_translate;
        })
        .attr("r", function(d) {
            return Math.log(d.sah_weekly_avg_new_cases);
        })
        .style("fill", "black")
        .on("mouseover", onMouseover)
        .on("mouseout", onMouseout);

    function onMouseover(e, d) {
        div.transition()
            .duration(100)
            .style("opacity", 1);

        var this_id = d3.select(this).attr("id");

        d3.selectAll("circle").attr("opacity", 0.1);
        d3.selectAll("line").attr("opacity", 0.1);
        d3.selectAll("text").attr("opacity", 0.1);

        d3.select("text").attr("font-weight", "bold");
        d3.selectAll("#" + this_id).attr("opacity", 1);
    }

    function onMouseout() {
        div.transition()
            .duration(1000)
            .style("opacity", 0);

        d3.selectAll("circle").attr("opacity", 1);
        d3.selectAll("line").attr("opacity", 1);
        d3.selectAll("text").attr("opacity", 1);

        d3.selectAll("text").attr("font-weight", "normal");
    }

    // tooltip
    div
        // if user hovers on tooltip (and not circle) the tooltip stays visible!
        .on('mouseover', function(d) {
            div
                .transition()
                .style("opacity", "1");
        })
        .on('mouseout', function(d) {
            div
                .transition()
                .duration(200)
                .style("opacity", "0");
        });

    /* SCROLL TRIGGERS */

    // pin timeline in place
    ScrollTrigger.create({
        trigger: '.timeline',
        endTrigger: '#body_text1',
        start: 'center center',
        end: 'top 100%',
        pin: true,
        pinSpacing: false
    });
    
    // highlight the week with the biggest mobility drop (start_circ)
    ScrollTrigger.create({
        trigger: '#step1',
        start: 'bottom 90%', // start when the bottom of the trigger hits 90% down from the top of the viewport
        onEnter: highlight_start_circ,
        onEnterBack: highlight_start_circ,
        onLeave: highlight_sah_circ,
        onLeaveBack: full_opacity_everything,
        markers: false,
        id: 'highlight_start_circ'
        });

    // highlight the week when the stay at home order started (sah_circ)
    ScrollTrigger.create({
        trigger: '#step2',
        start: 'bottom 70%', // start when the bottom of the trigger hits 70% down from the top of the viewport
        onEnter: highlight_sah_circ,
        onEnterBack: highlight_sah_circ,
        onLeave: full_opacity_everything,
        onLeaveBack: highlight_start_circ,
        markers: false,
        id: 'highlight_sah_circ'
        });

    function highlight_start_circ() {
        start_circs
            .transition()
            .duration(500)
            .style("opacity", 1);

        sah_circs
            .transition()
            .duration(500)
            .style("opacity", 0.1);

        lines_btwn
            .transition()
            .duration(500)
            .style("opacity", 0.1);
        }

    function highlight_sah_circ() {
        start_circs
            .transition()
            .duration(500)
            .style("opacity", 0.1);

        sah_circs
            .transition()
            .duration(500)
            .style("opacity", 1);

        lines_btwn
            .transition()
            .duration(500)
            .style("opacity", 0.1);
        }

    function full_opacity_everything() {
        start_circs
            .transition()
            .duration(500)
            .style("opacity", 1);

        sah_circs
            .transition()
            .duration(500)
            .style("opacity", 1);

        lines_btwn
            .transition()
            .duration(500)
            .style("opacity", 1);
    }

})
