document.addEventListener("DOMContentLoaded", function() {
    fetch('/api/pca')
        .then(response => response.json())
        .then(data => {
            renderScreePlot(data.eigenvalues);
            renderBiPlot(data.scores, data.loadings);
        })
        .catch(error => console.error("Error fetching PCA data:", error));
});

const margin = {top: 30, right: 40, bottom: 30, left: 60},
width = 600 - margin.left - margin.right,
height = 400 - margin.top - margin.bottom;

function renderScreePlot(eigenvalues) {

    // Append SVG object to the body
    const svg = d3.select("#screePlot")
                  .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
                .domain([1, eigenvalues.length])
                .range([0, width]);
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).ticks(eigenvalues.length));

    // Add Y axis
    const y = d3.scaleLinear()
                .domain([0, d3.max(eigenvalues)])
                .range([height, 0]);
    svg.append("g")
       .call(d3.axisLeft(y));

    // Add a line for the eigenvalues
    const line = d3.line()
                   .x((d, i) => x(i + 1))
                   .y(d => y(d));
    svg.append("path")
       .datum(eigenvalues)
       .attr("fill", "none")
       .attr("stroke", "red")
       .attr("stroke-width", 1.5)
       .attr("d", line);

    // Add points for each eigenvalue
    svg.selectAll(".dot")
       .data(eigenvalues)
       .enter()
       .append("circle")
         .attr("cx", (d, i) => x(i + 1))
         .attr("cy", d => y(d))
         .attr("r", 4)
         .attr("fill", "green");

    // Add the title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Scree Plot");
}



function renderBiPlot(scores, loadings) {
    // Append SVG object to the body, set dimensions
    const svg = d3.select("#biPlot")
                  .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X and Y axes domains
    const x = d3.scaleLinear()
                .domain(d3.extent(scores, d => d[0]))
                .range([0, width]);
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x));

    const y = d3.scaleLinear()
                .domain(d3.extent(scores, d => d[1]))
                .range([height, 0]);
    svg.append("g")
       .call(d3.axisLeft(y));

    // Add dots for scores
    svg.selectAll("dot")
       .data(scores)
       .enter()
       .append("circle")
         .attr("cx", d => x(d[0]))
         .attr("cy", d => y(d[1]))
         .attr("r", 3)
         .style("fill", "#77b3d4");

    // Add lines for loadings
    loadings.forEach((loading, i) => {
        svg.append("line")
           .attr("x1", x(0))
           .attr("y1", y(0))
           .attr("x2", x(loading[0]) * 100) // Scale factor for visualization
           .attr("y2", y(loading[1]) * 100) // Scale factor for visualization
           .attr("stroke", "red");

        svg.append("text")
           .attr("x", x(loading[0]) * 100)
           .attr("y", y(loading[1]) * 100)
           .text(`Var${i+1}`)
           .style("font-size", "12px")
           .attr("fill", "red");
    });
}

