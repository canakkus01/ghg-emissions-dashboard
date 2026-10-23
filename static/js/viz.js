// Colors for the bars
var colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#888888'];

// Stores the data that came back from the server
var chartData = [];


// Formats big numbers: 1200000 -> 1.2M, 5000 -> 5k
function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(0) + 'k';
    return Math.round(n).toString();
}


// Shows a tooltip box near the mouse
function showTooltip(html, event) {
    var t = document.getElementById('tooltip');
    t.innerHTML = html;
    t.style.display = 'block';
    t.style.left = (event.clientX + 12) + 'px';
    t.style.top  = (event.clientY + 12) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}


// Fetches data from Flask using the selected filters
function loadData() {
    var selected = [];
    document.querySelectorAll('.country-checkbox:checked').forEach(function(cb) {
        selected.push(cb.value);
    });

    var url = '/api/data?year_start=' + document.getElementById('year-start').value
                       + '&year_end=' + document.getElementById('year-end').value;

    selected.forEach(function(c) {
        url += '&countries=' + encodeURIComponent(c);
    });

    document.getElementById('loading').style.display = 'block';
    document.getElementById('chart').style.display   = 'none';
    document.getElementById('line-section').style.display = 'none';

    fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
            chartData = d;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('chart').style.display   = 'block';
            drawBarChart();
        });
}


// Draws the bar chart — total emissions per country
function drawBarChart() {
    var svg = d3.select('#chart');
    svg.selectAll('*').remove();

    if (chartData.length === 0) {
        svg.attr('height', 60).append('text')
           .attr('x', '50%').attr('y', 35)
           .attr('text-anchor', 'middle').attr('fill', '#999')
           .text('No data. Select at least one country.');
        return;
    }

    // Add up total emissions per country
    var totals = {};
    chartData.forEach(function(d) {
        totals[d.country] = (totals[d.country] || 0) + d.value;
    });

    // Convert to array and sort highest first
    var rows = Object.keys(totals).map(function(c) {
        return { country: c, total: totals[c] };
    });
    rows.sort(function(a, b) { return b.total - a.total; });

    // Chart size and margins
    var W = document.getElementById('chart-box').clientWidth - 40;
    var H = 380;
    var margin = { top: 20, right: 20, bottom: 110, left: 70 };
    var w = W - margin.left - margin.right;
    var h = H - margin.top  - margin.bottom;

    svg.attr('width', W).attr('height', H);
    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // X scale for countries, Y scale for emission values
    var xScale = d3.scaleBand().domain(rows.map(function(d) { return d.country; })).range([0, w]).padding(0.25);
    var yScale = d3.scaleLinear().domain([0, d3.max(rows, function(d) { return d.total; }) * 1.1]).nice().range([h, 0]);

    // Light background grid lines
    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(yScale).ticks(5).tickSize(-w).tickFormat(''))
     .call(function(a) { a.select('.domain').remove(); });

    // X axis with rotated country name labels
    g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + h + ')')
     .call(d3.axisBottom(xScale).tickSize(0))
     .call(function(a) {
         a.select('.domain').remove();
         a.selectAll('text').attr('transform', 'rotate(-40)').attr('text-anchor', 'end').attr('dx', '-5px').attr('dy', '5px');
     });

    // Y axis
    g.append('g').attr('class', 'axis').call(d3.axisLeft(yScale).ticks(5).tickFormat(formatNum));

    // Y axis label
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -55)
     .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 11).text('kt CO2-equivalent');

    // Draw bars
    g.selectAll('.bar').data(rows).enter().append('rect')
     .attr('class', 'bar')
     .attr('x',     function(d)    { return xScale(d.country); })
     .attr('width', xScale.bandwidth())
     .attr('y', h).attr('height', 0)
     .attr('fill',  function(d, i) { return colors[i % colors.length]; })
     .attr('rx', 3)
     .on('mouseover', function(event, d) {
         d3.select(this).attr('opacity', 0.75);
         showTooltip('<b>' + d.country + '</b><br>' + formatNum(d.total) + ' kt CO2-eq<br><i>Click to see trend over time</i>', event);
     })
     .on('mouseout', function() {
         d3.select(this).attr('opacity', 1);
         hideTooltip();
     })
     .on('click', function(event, d) {
         hideTooltip();
         drawLineChart(d.country);
     })
     .transition().duration(500).delay(function(d, i) { return i * 40; })
     .attr('y',      function(d) { return yScale(d.total); })
     .attr('height', function(d) { return h - yScale(d.total); });
}


// Draws a line chart for one country — shown when a bar is clicked
function drawLineChart(country) {
    // Get only the data points for the clicked country
    var points = chartData.filter(function(d) { return d.country === country; });
    points.sort(function(a, b) { return a.year - b.year; });

    document.getElementById('line-section').style.display = 'block';
    document.getElementById('line-title').textContent = country + ' — emissions over time';

    var svg = d3.select('#line-chart');
    svg.selectAll('*').remove();

    var W = document.getElementById('chart-box').clientWidth - 40;
    var H = 280;
    var margin = { top: 15, right: 20, bottom: 40, left: 65 };
    var w = W - margin.left - margin.right;
    var h = H - margin.top  - margin.bottom;

    svg.attr('width', W).attr('height', H);
    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear().domain(d3.extent(points, function(d) { return d.year; })).range([0, w]);
    var yScale = d3.scaleLinear().domain([0, d3.max(points, function(d) { return d.value; }) * 1.1]).nice().range([h, 0]);

    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(yScale).ticks(4).tickSize(-w).tickFormat(''))
     .call(function(a) { a.select('.domain').remove(); });

    g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + h + ')')
     .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.format('d')));

    g.append('g').attr('class', 'axis').call(d3.axisLeft(yScale).ticks(4).tickFormat(formatNum));

    // Year label on X axis
    g.append('text').attr('x', w / 2).attr('y', h + 36)
     .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 11).text('Year');

    // Draw the line
    g.append('path').datum(points)
     .attr('class', 'country-line').attr('stroke', '#e41a1c')
     .attr('d', d3.line()
         .x(function(d) { return xScale(d.year); })
         .y(function(d) { return yScale(d.value); })
         .curve(d3.curveMonotoneX));

    // Draw dots on each year — hoverable
    g.selectAll('.dot').data(points).enter().append('circle')
     .attr('class', 'dot')
     .attr('cx', function(d) { return xScale(d.year); })
     .attr('cy', function(d) { return yScale(d.value); })
     .attr('r', 4).attr('fill', '#e41a1c').attr('stroke', '#fff').attr('stroke-width', 1.5)
     .on('mouseover', function(event, d) {
         d3.select(this).attr('r', 7);
         showTooltip('<b>' + d.country + '</b><br>' + formatNum(d.value) + ' kt CO2-eq<br>Year: ' + d.year, event);
     })
     .on('mouseout', function() {
         d3.select(this).attr('r', 4);
         hideTooltip();
     });
}


// Apply button — reload chart with new filters
document.getElementById('apply-btn').addEventListener('click', loadData);

// Search box — filters the country checkbox list
document.getElementById('country-search').addEventListener('input', function() {
    var q = this.value.toLowerCase();
    document.querySelectorAll('.country-list label').forEach(function(el) {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
});

// Select all / deselect all buttons
document.getElementById('select-all').addEventListener('click', function() {
    document.querySelectorAll('.country-checkbox').forEach(function(cb) { cb.checked = true; });
});

document.getElementById('select-none').addEventListener('click', function() {
    document.querySelectorAll('.country-checkbox').forEach(function(cb) { cb.checked = false; });
});

// Pre-check a few countries when the page first loads
var defaults = ['United States of America', 'Germany', 'United Kingdom', 'France', 'Italy', 'Japan'];
document.querySelectorAll('.country-checkbox').forEach(function(cb) {
    cb.checked = defaults.includes(cb.value);
});

loadData();
