var dimension=1;
var k =1;

document.addEventListener("DOMContentLoaded", function() {
   fetch('/api/pca')
   .then(response => response.json())
   .then((pcaData) => {
      dimension = pcaData.elbow_point;
      k = pcaData.initial_k;
      renderScreePlot(pcaData.eigenvalues, pcaData.elbow_point);
      const loadings = pcaData.loadings;
      const scores = pcaData.scores;
      const topAttributes = getTopAttributes(loadings, pcaData.elbow_point, pcaData.attributeNames);
      const scoresWithClusterId = pcaData.scores.map((score, index) => [...score, pcaData.kmeans_results[pcaData.initial_k].labels[index]]);
      renderScatterMatrix(topAttributes, scoresWithClusterId, pcaData.attributeNames, pcaData.kmeans_results[pcaData.initial_k].labels);
      renderKMeansPlot(pcaData.kmeans_results, pcaData.initial_k);
      renderBiPlot(scoresWithClusterId, pcaData.loadings, pcaData.kmeans_results[pcaData.initial_k].labels);
  }).catch(error => console.error("Error fetching data:", error));
});

document.addEventListener("DOMContentLoaded", function() {
   fetch('/api/pca')
   .then(response => response.json())
   .then((pcaData) => {
       const updatePlots = (di) => {
            dimension = di;
           updateScatterMatrix(di);
           renderScreePlot(pcaData.eigenvalues, di, updatePlots); // Pass self as callback
       };
       renderScreePlot(pcaData.eigenvalues, pcaData.elbow_point, updatePlots);
       // Initial rendering of other plots...
   }).catch(error => console.error("Error fetching data:", error));
});

document.addEventListener("DOMContentLoaded", function() {
   fetch('/api/pca')
   .then(response => response.json())
   .then((pcaData) => {
       const updatePlotsForKMeans = (selectedK) => {
            k = selectedK;
           const topAttributes = getTopAttributes(pcaData.loadings, dimension, pcaData.attributeNames);
           const scoresWithClusterId = pcaData.scores.map((score, index) => [...score, pcaData.kmeans_results[selectedK].labels[index]]);
           renderBiPlot(scoresWithClusterId, pcaData.loadings, pcaData.kmeans_results[selectedK].labels);
           renderScatterMatrix(topAttributes, scoresWithClusterId, pcaData.attributeNames, pcaData.kmeans_results[selectedK].labels)
           renderKMeansPlot(pcaData.kmeans_results, selectedK, updatePlotsForKMeans); // Pass self as callback
       };
       updatePlotsForKMeans(pcaData.initial_k); // Initial call with the initial k
   }).catch(error => console.error("Error fetching data:", error));
});


const margin = {top: 30, right: 40, bottom: 30, left: 60},
width = 600 - margin.left - margin.right,
height = 600 - margin.top - margin.bottom;

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

function updateScatterMatrix(di) {
   d3.select("#scatterplotMatrix").selectAll("*").remove();

   fetch('/api/pca')
       .then(response => response.json())
       .then(data => {
         dimension = di;
           // Assuming 'data.loadings' contains the PCA loadings
           const loadings = data.loadings;
           const scores = data.scores;
           const topAttributes = getTopAttributes(loadings, di, data.attributeNames);
           const scoresWithClusterId = data.scores.map((score, index) => [...score, data.kmeans_results[k].labels[index]]);
           renderScatterMatrix(topAttributes, scoresWithClusterId, data.attributeNames, data.kmeans_results[k].labels);
       })
       .catch(error => console.error("Error fetching PCA loadings:", error));
}

function getTopAttributes(loadings, di, attributeNames) {
   // Calculate sum of squared loadings for each attribute
   let sumOfSquaredLoadings = loadings.map((attrLoadings) =>
       attrLoadings
           .slice(0, di) // Take only the loadings up to the selected di
           .reduce((sum, loading) => sum + loading * loading, 0)
   );

   // Get the indices of the top 4 attributes
   let indicesTopAttributes = [...sumOfSquaredLoadings.keys()]
       .sort((a, b) => sumOfSquaredLoadings[b] - sumOfSquaredLoadings[a])
       .slice(0, 4);

   // Return the top 4 attributes based on the indices
   return indicesTopAttributes.map(index => attributeNames[index]);
}

function renderScreePlot(eigenvalues, selectedDimensionality, updateCallback) {
   d3.select("#screePlot").selectAll("*").remove(); // Clear the existing plot

   const svg = d3.select("#screePlot")
                 .append("svg")
                 .attr("width", width + margin.left + margin.right)
                 .attr("height", height + margin.top + margin.bottom)
                 .append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

   const x = d3.scaleBand()
               .range([0, width])
               .domain(eigenvalues.map((d, i) => i + 1))
               .padding(0.1);

   const y = d3.scaleLinear()
               .domain([0, d3.max(eigenvalues)])
               .range([height, 0]);

   svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

   svg.append("g")
      .call(d3.axisLeft(y));

   svg.selectAll(".bar")
      .data(eigenvalues)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => x(i + 1))
      .attr("y", d => y(d))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d))
      .attr("fill", (d, i) => i === selectedDimensionality - 1 ? "red" : "steelblue")
      .on("click", (event, d) => {
          const di = eigenvalues.indexOf(d) + 1; // Get the dimensionality index
          updateCallback(di); // Call the update function with the new index
      });

   svg.append("text")
      .attr("x", (width / 2))             
      .attr("y", 0 - (margin.top / 2))
      .attr("text-anchor", "middle")  
      .style("font-size", "16px") 
      .style("text-decoration", "underline")  
      .text("Scree Plot");
}



function renderBiPlot(scores, loadings, clusterLabels) {
   d3.select("#biPlot").selectAll("*").remove(); 
   
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
   const circles = svg.selectAll("circle")
                       .data(scores);
   circles.enter()
         .append("circle")
         .attr("cx", d => x(d[0]))
         .attr("cy", d => y(d[1]))
         .attr("r", 3)
         .style("fill", (d,i) => colorScale(clusterLabels[i])) 
         .transition().duration(2000)
         .attr("cx", d => x(d[0]))
         .attr("cy", d => y(d[1]));

   // Apply transitions to updating elements
   circles.transition().duration(2000)
      .attr("cx", d => x(d[0]))
      .attr("cy", d => y(d[1]))
      .style("fill", (d,i) => colorScale(clusterLabels[i]));

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

function renderScatterMatrix(topAttributes, scores, attributeNames, clusterLabels) {
   d3.select("#scatterplotMatrix").selectAll("*").remove();

   const indicesTopAttributes = topAttributes.map(attr => attributeNames.indexOf(attr));
   const size = 142.5; // Size of each scatter plot
   const padding = 30; // Padding around scatter plots

   const svg = d3.select("#scatterplotMatrix")
                 .append("svg")
                 .attr("width", size * topAttributes.length + padding)
                 .attr("height", size * topAttributes.length + padding)
                 .append("g");

   // Create scale functions for each attribute based on the actual data range
   const xScales = indicesTopAttributes.map(attrIndex => {
       return d3.scaleLinear()
                .domain(d3.extent(scores, d => d[attrIndex]))
                .range([padding, size - padding]);
   });

   const yScales = indicesTopAttributes.map(attrIndex => {
       return d3.scaleLinear()
                .domain(d3.extent(scores, d => d[attrIndex]))
                .range([size - padding, padding]);
   });

   // Create the scatterplot matrix
   topAttributes.forEach((attrX, i) => {
       topAttributes.forEach((attrY, j) => {
           const xPos = i * size + padding;
           const yPos = j * size + padding;

           const plotArea = svg.append("g")
                               .attr("transform", `translate(${xPos}, ${yPos})`);

           if (i !== j) {
               // Draw scatter plot
               plotArea.selectAll("circle")
                       .data(scores)
                       .enter()
                       .append("circle")
                       .attr("cx", d => xScales[i](d[indicesTopAttributes[i]]))
                       .attr("cy", d => yScales[j](d[indicesTopAttributes[j]]))
                       .attr("r", 3)
                       .style("fill", (d, index) => colorScale(clusterLabels[index]));
           } else {
               // Place attribute name in the center box
               plotArea.append("text")
                       .attr("x", size / 2)
                       .attr("y", size / 2)
                       .attr("text-anchor", "middle")
                       .text(attributeNames[indicesTopAttributes[i]]);
           }
       });
   });

   // Now append the axes
   topAttributes.forEach((attr, index) => {
      const axisXPos = padding + index * size;
      const axisYPos = padding + (topAttributes.length - 1) * size; // Position at the bottom of the last row

      // Only draw the bottom axis for the last row
      if (index === topAttributes.length - 1) {
         svg.selectAll(".x-axis")
         .data(topAttributes)
         .enter()
         .append("g")
         .attr("class", "x-axis")
         .attr("transform", (d, i) =>`translate(${padding + i * size}, ${5+4*size})`)
         .call(d3.axisBottom(xScales[index]).ticks(5));
      }

      // Only draw the left axis for the first column
      if (index === 0) {
          svg.selectAll(".y-axis")
              .data(topAttributes)
              .enter()
              .append("g")
              .attr("class", "y-axis")
              .attr("transform", (d, i) => `translate(${15+padding}, ${padding + i * size})`)
              .call(d3.axisLeft(yScales[index]).ticks(5));
      }
  });
}





function renderKMeansPlot(kmeansResults, selectedK, updateBiPlotCallback, updateScatterMatrixCallback) {
   d3.select("#kmeansPlot").selectAll("*").remove(); // Clear the existing plot

   const svg = d3.select("#kmeansPlot")
                 .append("svg")
                 .attr("width", width + margin.left + margin.right)
                 .attr("height", height + margin.top + margin.bottom)
                 .append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

   const x = d3.scaleBand()
               .range([0, width])
               .domain(Object.keys(kmeansResults))
               .padding(0.1);

   const y = d3.scaleLinear()
               .domain([0, d3.max(Object.values(kmeansResults), d => d.inertia)])
               .range([height, 0]);

   svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

   svg.append("g")
      .call(d3.axisLeft(y));

   svg.selectAll(".bar")
      .data(Object.entries(kmeansResults)) // Convert object to array of [k, result] pairs
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d[0]))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d[1].inertia))
      .attr("height", d => height - y(d[1].inertia))
      // Initial fill before transition
      .attr("fill", "#77b3d4")
      .on("click", (event, d) => {
          updateBiPlotCallback(d[0]); // Update the biplot with the selected k
      })
      // Transition for fill color change
      .transition().duration(500)
      .attr("fill", d => d[0] == selectedK ? "red" : "#77b3d4");

}




