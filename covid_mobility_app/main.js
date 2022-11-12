const margin = { top: 20, bottom: 0, left: 30, right: 30 };
const num_states = 43; // 43 states with stay at home orders (7 never implemented one)
const line_width = 2 // lines connecting dots
const week_filter = 20; // how many weeks to include on area chart / heatmap
const lable_type_size = 8; // type size of axis labels

// colors
const light_green = "#E6F6D7"
const med_green = "#C1DAB0";
const dark_green = "#1D5902"
const light_pink = "#F8D7EB";
const med_pink = "#D9A4C5";
const dark_pink = "#B55997";
const grey = "#DBDBDB";

// covid milestones
const milestones = [
    { Name: 'WHO declares pandemic', milestone_date: "2020-03-11" },
    { Name: 'US records first COVID death', milestone_date: "2020-02-06" },
    { Name: 'More than 80,000 confirmed cases', milestone_date: "2020-03-27"} 
];

// tooltip
const div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// color scale for scatter plot
const colScale = d3.scaleOrdinal()
    .range([dark_green, dark_pink, med_pink, light_pink])
    .domain(["April 2020", "August 2020", "January 2021", "April 2021"]);

// viz
const svg_state = d3.select('.lag')
    .append('svg')

const svg_us = d3.select('.us-graph')
    .append('svg')

const svg_scatter = d3.select('.scatter')
    .append('svg')

Promise.all([
        
    d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/state_data.csv?version=123"),
    d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/us_ntl_data.csv?version=123"),
    d3.csv("https://raw.githubusercontent.com/jessvoiture/covid_mobility_trends/master/csv_files/lockdown_data.csv?version=123")])
    
    .then(function(data, error){

        if (error) {
            console.log("error reading file");
        }

        state_data = data[0];
        us_data = data[1]
        scatter_data = data[2];

// SETUP
// initiates elements
        function setup(){

            /* FORMAT DATA TYPES */
            var parseTime = d3.timeParse("%Y-%m-%d");
            
    /* STATE TIMELINE */
            // sort by lag time and the day the stay-at-home (sah) order began
            state_data.sort(function(x, y){
                return d3.ascending(x.mobility_lockdown_lag_wk, y.mobility_lockdown_lag_wk) ||
                d3.ascending(x.sah_week_start_date, y.sah_week_start_date);
            })

            // correct data types
            state_data.forEach(function(d) {
                d.week_start_date = parseTime(d.week_start_date);
                d.sah_week_start_date = parseTime(d.sah_week_start_date);
                d.pct_change_baseline = +d.pct_change_baseline;
                d.log_weekly_new_cases = Math.log(d.weekly_avg_new_cases);
                d.sah_log_weekly_new_cases = Math.log(d.sah_weekly_avg_new_cases);
            });

            /* DOMAINS AND AXES */
            // find x and y domains from data
            var min_date = d3.min(state_data, function(d) { return d.week_start_date; });
            var x_min = d3.timeDay.offset(min_date, -3);

            var max_date = d3.max(state_data, function(d) { return d.sah_week_start_date; });
            var x_max = d3.timeDay.offset(max_date, 3);

            var states = state_data.map(function(d){ return d.Code});

            // x axis
            x_scale = d3.scaleTime()		
                .domain([x_min, x_max])

            // y axis
            y_scale = d3.scaleBand()
                .domain(states)
            
            // x axis grid lines
            x_axis_grid = svg_state
                .append("g")			
                .attr("class", "grid")

            // create lines that connect the circles
            lines_btwn = svg_state
                .append("g")
                .attr("class", "lines_btwn_circs_g")
                .selectAll(null)
                .data(state_data)
                .enter()
                .append("line")
                .attr("class", "line_between")
                .attr("id", function(d) { return d.Code })
                .attr("stroke", grey)
                .attr("stroke-width", line_width)
                .attr("opacity", 1)
                .on("mouseover", onMouseover)
                .on("mouseout", onMouseout);

            // create the circles for when the state observed its largest decline in mobility (week_start_date)
            start_circs = svg_state
                .append("g")
                .attr("class", "start_circ_g")
                .selectAll(null)
                .data(state_data)
                .enter()
                .append("circle")
                .attr("class", "start")
                .attr("id", function(d) { return d.Code; })
                .style("fill", med_pink)
                .on("mouseover", onMouseover) 
                .on("mouseout", onMouseout);

            // create the circles for when the state imposed stay-at-home order
            sah_circs = svg_state
                .append("g")
                .attr("class", "sah_circ_g")
                .selectAll(null)
                .data(state_data)
                .enter()
                .append("circle")
                .attr("class", "sah")
                .attr("id", function(d) { return d.Code; })
                .style("fill", dark_green)
                .on("mouseover", onMouseover)
                .on("mouseout", onMouseout);

    /* US NATIONAL GRAPH */
            milestones.forEach(function(d) {
                d.milestone_date = parseTime(d.milestone_date);
            })

            us_data = us_data.filter(function(d, i) {return i < week_filter});
            
            us_data.forEach(function(d) {
                d.week_start_date = parseTime(d.week_start_date);
                d.weekly_avg_new_cases = +d.weekly_avg_new_cases;
                d.pct_change_baseline = +d.pct_change_baseline;
            });

            us_data.sort(function(x, y){
                return d3.ascending(x.week_start_date, y.week_start_date);
            })

            var max_covid_cases = d3.max(us_data, function(d) { return d.weekly_avg_new_cases; });

        // covid cases line and area chart

            x_scale_us = d3.scaleTime()		
                .domain(d3.extent(us_data, function(d) { return d.week_start_date; }));

            y_scale_cases = d3.scaleLinear()
                // 1000 = a little padding at the top
                .domain([0, (max_covid_cases + 1000)]);

            // x axis grid lines
            cases_y_grid = svg_us
                .append("g")			
                .attr("class", "grid")

            // x axis grid lines
            mobility_y_grid = svg_us
                .append("g")			
                .attr("class", "grid")

            // y axis label
            svg_us.append("text")
                .attr("class", "y_label")
                .attr("text-anchor", "end")
                .attr("y", lable_type_size)
                .attr("x", -10)
                .attr("transform", "rotate(-90)")
                .text("Weekly New Covid Cases");

            // area chart for covid cases
            cases_area = svg_us
                .append("g")
                .attr("class", "cases_area")
                .append("path")
                .data([us_data])
                .attr("class", "area_chart")
                .attr("fill", dark_green)
                .attr("opacity", 0.3)
                .attr("stroke", "none");

            cases_line = svg_us
                .append("g")
                .attr("class", "cases_line")
                .append("path")
                .data([us_data])
                .attr("class", "line_chart")
                .attr("fill", "none")
                .attr("stroke", dark_green)
                .attr("stroke-width", line_width);

        // change in mobility line and area chart

            var max_pct_change_baseline = d3.max(us_data, function(d) { return d.pct_change_baseline; });
            var min_pct_change_baseline = d3.min(us_data, function(d) { return d.pct_change_baseline; });

            y_scale_mobility = d3.scaleLinear()
                .domain([(min_pct_change_baseline - 5), (max_pct_change_baseline + 5)]);  

            // y axis label
            y_mobility_label = svg_us.append("text")
                .attr("class", "y_label")
                .attr("text-anchor", "end")
                .attr("y", lable_type_size) 
                .attr("transform", "rotate(-90)")
                .text("Change in Mobility from Baseline (%)");

            // area chart for covid cases
            mobility_area = svg_us
                .append("g")
                .attr("class", "mobility_area")
                .append("path")
                .data([us_data])
                .attr("class", "area_chart")
                .attr("fill", med_pink)
                .attr("opacity", 0.3)
                .attr("stroke", "none");

            mobility_line = svg_us
                .append("g")
                .attr("class", "mobility_line")
                .append("path")
                .data([us_data])
                .attr("class", "line_chart")
                .attr("fill", "none")
                .attr("stroke", med_pink)
                .attr("stroke-width", line_width);

    /* SCATTERPLOT! */
            scatter_data.forEach(function(d) {
                d.weekly_new_cases_per_100k = +d.weekly_new_cases_per_100k
                d.pct_change_baseline = +d.pct_change_baseline
                d.log_weekly_cases_per_100k = Math.log(d.weekly_new_cases_per_100k)
            });

            var scatter_x_min = d3.min(scatter_data, function(d) { return d.log_weekly_cases_per_100k; });
            var scatter_x_max = d3.max(scatter_data, function(d) { return d.log_weekly_cases_per_100k; });

            var scatter_y_min = d3.min(scatter_data, function(d) { return d.pct_change_baseline; });
            var scatter_y_max = d3.max(scatter_data, function(d) { return d.pct_change_baseline; });

            // x axis
            x_scale_scatter = d3.scaleLinear()
                .domain([scatter_x_min - 0.5, scatter_x_max + 0.5]);

            // y axis
            y_scale_scatter = d3.scaleLinear()
                .domain([scatter_y_min - 5, scatter_y_max + 5]);

            // x axis grid lines
            scatter_x_grid = svg_scatter
                .append("g")			
                .attr("class", "grid")

            // y axis grid lines
            scatter_y_grid = svg_scatter
                .append("g")			
                .attr("class", "grid")

            // make the dots
            scatter_dots = svg_scatter
                .append("g")
                .attr("class", "scatter_dots")
                .selectAll(null)
                .data(scatter_data)
                .enter()
                .append("circle")
                .attr("class", "scatter_circ")
                .attr("id", function(d){ return "circ_" + d.month.replaceAll(' ', '')})
                .attr("r", 4)
                .style("fill", function(d) { return colScale(d.month) })
                .on("mouseover", function(event, d) {

                    div.transition()
                        .duration(200)
                        .style("opacity", 1);

                    div.html("<span class = tooltip_text>" + d.month + "</span>")
                        .style("left", (event.pageX + 5 ) + "px")
                        .style("top", (event.pageY - 25) + "px");
          
                    // highlight all the dots that have the same month as the one hovered
                    var selected_month = d3.select(this).attr("id");
                    console.log(selected_month);

                    d3.selectAll("circle").attr("opacity", 0.1);
                    d3.selectAll("#" + selected_month).attr("opacity", 1);

                })                   
                .on("mouseout", function(d) {
                    div.transition()
                        .duration(200)
                        .style("opacity", 0);
                        
                    d3.selectAll("circle").attr("opacity", 1)
                });

            // checkboxes
            d3.selectAll(".checkbox").on("change", function() {
                var selected = this.value;
                opacity = this.checked ? 1 : 0;
            
            svg_scatter.selectAll(".scatter_circ")
                .filter(function(d) {return selected == d.month.replaceAll(' ', '');})
                .transition()
                .duration(250)
                .style("opacity", opacity);
            }); 

    /* TOOLTIP */
            div
                .on('mouseover', function(d) {
                    div
                        .transition()
                        .style("opacity", "1");
            })
                .on('mouseout', function(d) {
                    div
                        .transition()
                        .duration(500)
                        .style("opacity", "0");
            });
        }

// RESIZE
// sets height and width based on device
        function resize(){
            screen_height = window.innerHeight;   
            screen_width = window.innerWidth;

    /* STATE DATA */ 
            state_height = (screen_height *  0.80);

            // desktop set up
            if (screen_width > 900) {
                state_width = screen_width * 0.44; 
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

            // x axis
            svg_state.append("g")
                .attr("class", "x_axis")
                .attr("id", "lag_x_axis")
                .call(d3.axisTop(x_scale)
                    .ticks(ticks_unit)
                    .tickFormat(d3.timeFormat("%b %d")))
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // add x gridlines
            function make_state_x_gridlines() {		
                return d3.axisBottom(x_scale)
                    .ticks(ticks_unit)
            }

            x_axis_grid
                .attr("transform", "translate(" + margin.left + "," + state_height + ")")
                .call(make_state_x_gridlines()
                    .tickSize(-(state_height - margin.top))
                    .tickFormat("")
                    .tickSizeOuter(0)
                )

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
                    return d.log_weekly_new_cases;
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
                    return d.sah_log_weekly_new_cases;
                })
                .attr("transform", "translate(" + margin.left + "," + (margin.top + 8) + ")"); 

    /* US LINE GRAPH DATA */
            us_height = screen_height / 2;

            // desktop set up
            if (screen_width > 900) {
                us_width = screen_width / 1.7; 
            // mobile set up
            } else {
                us_width = screen_width * 0.9;
             }

            svg_us
                .attr('width', us_width)
                .attr('height', us_height);

            var cases_height = (us_height * .475) - margin.top;
            var mobility_start_height = us_height * 0.525;

            // x axis
            x_scale_us
                // 1.5 * margin.left so there is space for y axis label
                .range([(1.5 * margin.left + 3), us_width]);
            
            // area chart for covid cases
            // y axis
            y_scale_cases
                .range([cases_height, 0]);

            // x axis
            svg_us.append("g")
                .attr("class", "x_axis")
                .call(d3.axisBottom(x_scale_us)
                    .ticks(3)      
                    .tickFormat(d3.timeFormat("%b %Y"))
                    .tickSizeOuter(0)
                    .tickPadding(0.025 * us_height))
                .attr("transform", "translate(" + 0 + "," + cases_height + ")");

            // y axis
            svg_us.append("g")
                .attr("class", "y_axis")
                .attr("id", "cases_y_axis")
                .call( d3.axisLeft(y_scale_cases) 
                    .ticks(3)
                    .tickFormat(d3.format(".0s"))
                    .tickSizeOuter(0)
                    .tickPadding(-0.005 * us_height))
                .attr("transform", "translate(" + (1.5 * margin.left + 3) + "," + 0 + ")");


            // add y gridlines
            // cases graph
            function cases_y_gridlines() {		
                return d3.axisLeft(y_scale_cases)
                    .ticks(3)
            }
            
            cases_y_grid
                .call(cases_y_gridlines()
                    .tickSize(-us_width)
                    .tickFormat("")
                    .tickSizeOuter(0))
                .attr("transform", "translate(" + (1.5 * margin.left + 3) + "," + 0 + ")");

            cases_area 
                .attr("d", d3.area()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y0( cases_height )
                    .y1(function(d) { return y_scale_cases(d.weekly_avg_new_cases)})
                    );

            // line for area chart
            cases_line
                .attr("d", d3.line()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y(function(d) { return y_scale_cases(d.weekly_avg_new_cases)})
                    );

        // area chart for mobility change
            // y axis
            y_scale_mobility
                .range([(us_height - margin.top), mobility_start_height]);

            y_mobility_label
                .attr("x", -(mobility_start_height - 5))

            // add grid lines
            // mobility graph
            function mobility_y_gridlines() {		
                return d3.axisLeft(y_scale_mobility)
                    .ticks(3)
            }
            
            mobility_y_grid
                .call(mobility_y_gridlines()
                    .tickSize(-us_width)
                    .tickFormat("")
                    .tickSizeOuter(0))
                .attr("transform", "translate(" + (1.5 * margin.left + 3) + "," + 0 + ")");

            mobility_area  
                .attr("d", d3.area()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y0( mobility_start_height )
                    .y1(function(d) { return y_scale_mobility(d.pct_change_baseline)})
                    );

            // line for area chart
            mobility_line
                .attr("d", d3.line()
                    .x(function(d) { return x_scale_us(d.week_start_date) })
                    .y(function(d) { return y_scale_mobility(d.pct_change_baseline)})
                    );

            // x axis
            svg_us.append("g")
                .attr("class", "x_axis_mobility")
                .call(d3.axisBottom(x_scale_us)
                    .ticks(0)      
                    .tickSizeOuter(0))
                .attr("transform", "translate(" + 0 + "," + mobility_start_height + ")");

            // y axis
            svg_us.append("g")
                .attr("class", "y_axis")
                .attr("id", "mobility_y_axis")
                .call( d3.axisLeft(y_scale_mobility) 
                    .ticks(3)
                    .tickFormat(d => d + "%")
                    .tickSizeOuter(0)
                    .tickPadding(-0.005 * us_height))
                .attr("transform", "translate(" + (1.5 * margin.left + 3) + "," + 0 + ")");

    /* US LINE GRAPH DATA */
             // desktop set up
            if (screen_width > 900) {
                scatter_width = (screen_width * 0.44); 
            // mobile set up
            } else {
                scatter_width = (screen_width * 0.9);
             }

            scatter_height = (0.6 * screen_height);

            svg_scatter
                .attr('width', scatter_width)
                .attr('height', scatter_height);

            x_scale_scatter.range([0, scatter_width - 2 * margin.left]);
            y_scale_scatter.range([0, scatter_height - 2 * margin.top]);
    
            // x axis
            svg_scatter
                .append("g")
                .attr("class", "x_axis")
                .attr("id", "scatter_x_axis")
                .call(d3.axisBottom(x_scale_scatter)
                        .ticks(4)
                        .tickSizeOuter(0))
                .attr("transform", "translate(" + margin.left + "," + (scatter_height - margin.top) + ")")

            // y axis
            svg_scatter
                .append("g")
                .attr("class", "y_axis")
                .attr("id", "scatter_y_axis")
                .call( d3.axisLeft(y_scale_scatter)
                        .ticks(4)
                        .tickSizeOuter(0) )
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

            // add x gridlines
            function make_scatter_x_gridlines() {		
                return d3.axisBottom(x_scale_scatter)
                    .ticks(4)
            }

            scatter_x_grid
                .attr("transform", "translate(" + margin.left + "," + (scatter_height - margin.top) + ")")
                .call(make_scatter_x_gridlines()
                    .tickSize(-(scatter_height - 2 * margin.top))
                    .tickFormat("")
                    .tickSizeOuter(0)
                )
            
            // add y gridlines
            function make_scatter_y_gridlines() {		
                return d3.axisLeft(y_scale_scatter)
                    .ticks(4)
            }

            scatter_y_grid
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .call(make_scatter_y_gridlines()
                    .tickSize(-(scatter_width-2*margin.left))
                    .tickFormat("")
                    .tickSizeOuter(0)
                )

            scatter_dots
                .attr("cx", function (d) { 
                    return x_scale_scatter(d.log_weekly_cases_per_100k); })
                .attr("cy", function (d) { 
                    return y_scale_scatter(d.pct_change_baseline); } )
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        }

// INIT
// draws everything
        function init(){
            setup()
            resize()
            ScrollTrigger.refresh();
            //window.addEventListener('resize', resize)
        }
        
        init()

// FUNCTIONS
    
    /* MOUSEOVER FUNCTION */
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

    })
