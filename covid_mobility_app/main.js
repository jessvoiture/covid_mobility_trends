const margin = { top: 20, bottom: 0, left: 30, right: 30 };
const num_states = 43; // 43 states with stay at home orders (7 never implemented one)
const line_width = 2 // lines connecting dots
const week_filter = 27; // how many weeks to include on area chart / heatmap

// tooltip
const div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// viz
const svg_state = d3.select('.lag')
    .append('svg')

const svg_us = d3.select('.us-graph')
    .append('svg')

Promise.all([
        
    d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/state_data.csv?version=123"),
    d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/us_ntl_data.csv?version=123")])
    .then(function(data, error){

        if (error) {
            console.log("error reading file");
        }

        state_data = data[0];
        us_data = data[1]

        // sets up elements
        function setup(){
            /* FORMAT DATA TYPES */
            var parseTime = d3.timeParse("%Y-%m-%d");
            
    /* STATE TIMELINE */
            // sort by the day the stay-at-home (sah) order began
            state_data.sort(function(x, y){
                return d3.ascending(x.sah_week_start_date, y.sah_week_start_date);
            })

            // correct data types
            state_data.forEach(function(d) {
                d.week_start_date = parseTime(d.week_start_date);
                d.sah_week_start_date = parseTime(d.sah_week_start_date);
            });

            /* DOMAINS AND AXES */
            // find x and y domains from data
            var min_date = d3.min(state_data, function(d) { return d.week_start_date; });
            var x_min = d3.timeDay.offset(min_date, -3);

            var max_date = d3.max(state_data, function(d) { return d.sah_week_start_date; });
            var x_max = d3.timeDay.offset(max_date, 3);

            var states = state_data.map(function(d){ return d.Code});

            x_scale = d3.scaleTime()		
                .domain([x_min, x_max])

            // y axis
            y_scale = d3.scaleBand()
                .domain(states)

            /* DOT PLOT */ 
            // create lines that connect the circles
            lines_btwn = svg_state.selectAll("lines")
                .data(state_data)
                .enter()
                .append("line")
                .attr("class", "line_between")
                .attr("id", function(d) { return d.Code })
                .attr("stroke", "gray")
                .attr("stroke-width", line_width)
                .attr("opacity", 1)
                .on("mouseover", onMouseover)
                .on("mouseout", onMouseout);

            // create the circles for when the state observed its largest decline in mobility (week_start_date)
            start_circs = svg_state.selectAll("circle.start")
                .data(state_data)
                .enter()
                .append("circle")
                .attr("class", "start")
                .attr("id", function(d) { return d.Code; })
                .style("fill", "blue")
                .on("mouseover", onMouseover) 
                .on("mouseout", onMouseout);

            // create the circles for when the state imposed stay-at-home order
            sah_circs = svg_state.selectAll("circle.sah")
                .data(state_data)
                .enter()
                .append("circle")
                .attr("class", "sah")
                .attr("id", function(d) { return d.Code; })
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

    /* US NATIONAL GRAPH */
            us_data = us_data.filter(function(d, i) {return i < week_filter});
            
            us_data.forEach(function(d) {
                d.week_start_date = parseTime(d.week_start_date);
                d.weekly_avg_new_cases = +d.weekly_avg_new_cases;
            });

            us_data.sort(function(x, y){
                return d3.ascending(x.week_start_date, y.week_start_date);
            })

            heatmap_col_scale = d3.scaleLinear()
                .domain([-50, 6])
                .range(["blue", "white"]);

        }
        
        // sets height and width based on device
        function resize(){
            screen_height = window.innerHeight;   
            screen_width = window.innerWidth;

    /* STATE DATA */ 
            state_height = screen_height *  0.9;

            // desktop set up
            if (screen_width > 900) {
                state_width = screen_width / 2; 
                ticks_unit = d3.timeDay.every(4);
            // mobile set up
            } else {
                state_width = screen_width * 0.9;
                ticks_unit = d3.timeDay.every(7);
             }

            svg_state
                .attr('width', state_width)
                .attr('height', state_height);

            x_scale.range([0, state_width - (2 * margin.left)]);
            y_scale.range([0, state_height - (margin.top)]);

            var min_start_date = d3.min(state_data, function(d) { return d.week_start_date; });
            var max_start_date = d3.max(state_data, function(d) { return d.week_start_date; });
            var start_date_range = max_start_date - min_start_date;

            // x axis
            svg_state.append("g")
                .attr("class", "x_axis")
                .attr("id", "lag_x_axis")
                .call(d3.axisTop(x_scale)
                    .ticks(ticks_unit)
                    .tickFormat(d3.timeFormat("%b %d")))
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // y axis
            svg_state.append("g")
                .attr("class", "y_axis")
                .attr("id", "lag_y_axis")
                .call( d3.axisLeft(y_scale) )
                .attr('transform', "translate(" + margin.left + "," + margin.top + ")");

            // assign y-axis labels (the state codes) an id so that their style attributes can be manipulated in mouseover/out events    
            svg_state.select(".y_axis")
                .selectAll("text")
                .attr("id", function(d, i) { return state_data[i].Code; });

            lines_btwn 
                .attr("x1", function(d) {
                    return x_scale(d.week_start_date);
                })
                .attr("y1", function(d, i) {
                    return y_scale(d.Code);
                })
                .attr("x2", function(d) {
                    return x_scale(d.sah_week_start_date);
                })
                .attr("y2", function(d, i) {
                    return y_scale(d.Code);
                })
                .attr("transform", "translate(" + margin.left + "," + (margin.top + 8) + ")");
            
            start_circs
                .attr("cx", function(d) {
                    return x_scale(d.week_start_date);
                })
                .attr("cy", function(d, i) {
                    return y_scale(d.Code);
                })
                .attr("r", function(d) {
                    return Math.log(d.weekly_avg_new_cases);
                })
                .attr("transform", "translate(" + margin.left + "," + (margin.top + 8) + ")");
            
            sah_circs
                .attr("cx", function(d) {
                    return x_scale(d.sah_week_start_date);
                })
                .attr("cy", function(d, i) {
                    return y_scale(d.Code);
                })
                .attr("r", function(d) {
                    return Math.log(d.sah_weekly_avg_new_cases);
                })
                .attr("transform", "translate(" + margin.left + "," + (margin.top + 8) + ")"); 

     /* US LINE GRAPH DATA */
            var max_covid_cases = d3.max(us_data, function(d) { return d.weekly_avg_new_cases; });
            max_covid_cases = max_covid_cases;

            us_height = screen_height / 2;

            // desktop set up
            if (screen_width > 900) {
                us_width = screen_width / 2; 
            // mobile set up
            } else {
                us_width = screen_width * 0.9;
             }

            svg_us
                .attr('width', us_width)
                .attr('height', us_height);

            var area_height = (us_height * 0.80) - margin.top;
            var heatmap_start_height = area_height + 40;

            var cell_width = (us_width - 1.5 * margin.left) / week_filter;
            var cell_height = 2 * cell_width;

            // x axis
            x_scale_us = d3.scaleTime()		
                .domain(d3.extent(us_data, function(d) { return d.week_start_date; }))
                // 1.5 * margin.left so there is space for y axis label
                .range([1.5 * margin.left, us_width]);

            // y axis
            y_scale_us = d3.scaleLinear()
                .domain([0, max_covid_cases])
                .range([area_height, 0]);

            // x axis
            svg_us.append("g")
                .attr("class", "x_axis")
                .call(d3.axisBottom(x_scale_us)
                    .ticks(5)      
                    .tickFormat(d3.timeFormat("%b %Y")))
                .attr("transform", "translate(" + (1.5 * margin.left) + "," + area_height + ")");

            // y axis
            svg_us.append("g")
                .attr("class", "y_axis")
                .call( d3.axisLeft(y_scale_us) 
                    .ticks(5)
                    .tickFormat(d3.format(".0s")))
                .attr("transform", "translate(" + (1.5 * margin.left + 3) + "," + 0 + ")");

            // y axis label
            svg_us.append("text")
                .attr("class", "y_label")
                .attr("text-anchor", "end")
                .attr("y", 6)
                .attr("dy", ".75em")
                .attr("transform", "rotate(-90)")
                .text("Weekly Average New Covid Cases");

            // area chart for covid cases
            line_chart_area = svg_us.append("path")
                .data([us_data])
                .attr("class", "line_graph")
                .attr("fill", "red")
                .attr("fill-opacity", .3)
                .attr("stroke", "none")
                .attr("d", d3.area()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y0( area_height )
                    .y1(function(d) { return y_scale_us(d.weekly_avg_new_cases)})
                    )

            // line for area chart
            line_graph_path = svg_us.append("path")
                .data([us_data])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", line_width)
                .attr("d", d3.line()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y(function(d) { return y_scale_us(d.weekly_avg_new_cases)})
                    )
            
            // heat map of mobility
            heatmap = svg_us.selectAll(null)
                .data(us_data)
                .enter()
                .append('rect')
                .attr('class', 'heatmap_cell')
                .attr('width', cell_width)
                .attr('height', cell_height)
                .attr('y', heatmap_start_height)
                .attr('x', function(d) { return x_scale_us(d.week_start_date); })
                .attr('fill', function(d) { return heatmap_col_scale(d.percent_change); });
        }
        
        // draws everything
        function init(){
            setup()
            resize()
            ScrollTrigger.refresh();
            window.addEventListener('resize', resize)
        }
        
        init()

    /* SCROLL TRIGGERS FOR TIMELINE */
        // pin graph in place
        ScrollTrigger.create({
            trigger: '.lag',
            endTrigger: '#step2',
            start: 'top 5%', // graph is 90% of vh => 10% / 2 = 5%
            end: 'bottom -10%',
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
