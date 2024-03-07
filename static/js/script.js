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
      renderBiPlot(scoresWithClusterId, pcaData.loadings, pcaData.attributeNames, pcaData.kmeans_results[pcaData.initial_k].labels);
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
           renderBiPlot(scoresWithClusterId, pcaData.loadings, pcaData.attributeNames, pcaData.kmeans_results[selectedK].labels);
           renderScatterMatrix(topAttributes, scoresWithClusterId, pcaData.attributeNames, pcaData.kmeans_results[selectedK].labels)
           renderKMeansPlot(pcaData.kmeans_results, selectedK, updatePlotsForKMeans); // Pass self as callback
       };
       updatePlotsForKMeans(pcaData.initial_k); // Initial call with the initial k
   }).catch(error => console.error("Error fetching data:", error));
});


const margin = {top: 60, right: 60, bottom: 60, left: 60},
width = 700 - margin.left - margin.right,
height = 700 - margin.top - margin.bottom;

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

   let cumulativeSum = eigenvalues.reduce((acc, value, i) => {
      if (i === 0) return [value];
      acc.push(acc[i - 1] + value);
      return acc;
      }, []);

   const svg = d3.select("#screePlot")
                 .append("svg")
                 .attr("width", width + margin.left + margin.right)
                 .attr("height", height + margin.top + margin.bottom)
                 .append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

   // Update the x scale for the scree plot
   const x = d3.scaleBand()
               .rangeRound([0, width])
               .padding(0.1)
               .domain(eigenvalues.map((d, i) => i + 1));

   // Update the y scale for the scree plot
   const y = d3.scaleLinear()
               .rangeRound([height, 0])
               .domain([0, d3.max(cumulativeSum)]); // Updated to use cumulativeSum


   // Append the bars for the scree plot
   
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

   // Append the cumulative sum line to the scree plot
   svg.append("path")
      .datum(cumulativeSum)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
                  .x((d, i) => x(i + 1) + x.bandwidth() / 2)
                  .y((d) => y(d)));

   svg.selectAll(".dot")
   .data(cumulativeSum)
   .enter().append("circle") // Uses enter selection to create new circle for each data point
   .attr("class", "dot")
   .attr("cx", (d, i) => x(i + 1) + x.bandwidth() / 2) // Center the dot in the band
   .attr("cy", d => y(d))
   .attr("r", 5)
   .attr("fill", (d, i) => (i === selectedDimensionality - 1) ? "red" : "steelblue")
   .on("click", function(event, d) {
         const di = cumulativeSum.indexOf(d) + 1; // Get the index + 1 of the clicked dot
         updateCallback(di); // Update the plot with the new selected dimensionality
   });
               
   
   svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

   svg.append("g")
      .call(d3.axisLeft(y));

   const legendData = [
      { color: "red", label: "Selected Dimensionality" },
      { color: "steelblue", label: "Other Dimensionalities" }
   ];

   // Create legend container
   const legend = svg.selectAll(".legend")
                     .data(legendData)
                     .enter().append("g")
                     .attr("class", "legend")
                     .attr("transform", (d, i) => `translate(0,${i * 20})`);

   // Append color squares to legend
   legend.append("rect")
         .attr("x", width - 18) // Adjust position based on your plot's dimensions
         .attr("y", 41)
         .attr("width", 36)
         .attr("height", 18)
         .style("fill", d => d.color);

   // Append text labels to legend
   legend.append("text")
         .attr("x", width - 24) // Adjust position based on your plot's dimensions
         .attr("y", 50)
         .attr("dy", ".5em")
         .style("text-anchor", "end")
         .text(d => d.label);

   svg.append("text")
      .attr("x", (width / 2))             
      .attr("y", 0 - (margin.top / 2))
      .attr("text-anchor", "middle")  
      .style("font-size", "16px") 
      .style("text-decoration", "underline")  
      .text("Scree Plot");

   svg.append("text")
   .attr("x", width / 2)
   .attr("y", height + margin.bottom - 20)
   .style("font-size", "16px") 
   .attr("text-anchor", "middle")
   .text("Principal Component");

   svg.append("text")
   .attr("transform", "rotate(-90)")
   .attr("y", 0 - margin.left + 10)
   .attr("x",0 - (height / 2))
   .style("font-size", "16px") 
   .attr("dy", "1em")
   .attr("text-anchor", "middle")
   .text("Eigenvalue");

   
}



function renderBiPlot(scores, loadings, attributeNames, clusterLabels) {
   d3.select("#biPlot").selectAll("*").remove();
   d3.select("#biPlot").selectAll(".legend").remove(); 
   
   // Append SVG object to the body, set dimensions
    const svg = d3.select("#biPlot")
                  .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

   // Find the max range for the scores and loading vectors
   let xMax = d3.max(scores, d => d[0]);
   let yMax = d3.max(scores, d => d[1]);
   let xMin = d3.min(scores, d => d[0]);
   let yMin = d3.min(scores, d => d[1]);

   // Factor to scale the loading vectors appropriately
   const loadingScaleFactor = 0.1;

   loadings.forEach((loading) => {
      xMax = Math.max(xMax, loading[0] * loadingScaleFactor);
      yMax = Math.max(yMax, loading[1] * loadingScaleFactor);
      xMin = Math.min(xMin, loading[0] * loadingScaleFactor);
      yMin = Math.min(yMin, loading[1] * loadingScaleFactor);
   });

   // Now set the domain of the x and y scales
   const x = d3.scaleLinear()
               .domain([xMin, xMax]).nice()
               .range([0, width]);
   const y = d3.scaleLinear()
               .domain([yMin, yMax]).nice()
               .range([height, 0]);

   // Add the X axis to the biPlot
   svg.append("g")
   .attr("transform", `translate(0,${y(0)})`)
   .call(d3.axisBottom(x));

   // Add the Y axis to the biPlot
   svg.append("g")
   .attr("transform", `translate(${x(0)},0)`)
   .call(d3.axisLeft(y));

   svg.append("defs")
   .append("marker")
   .attr("id", "arrowhead")
   .attr("viewBox", "-0 -5 10 10")
   .attr("refX", 5)
   .attr("refY", 0)
   .attr("orient", "auto")
   .attr("markerWidth", 8)
   .attr("markerHeight", 8)
   .attr("xoverflow", "visible")
   .append("svg:path")
   .attr("d", "M 0,-5 L 10 ,0 L 0,5")
   .attr("fill", "black")
   .style("stroke", "none");
 

    
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

   const scoreXRange = d3.extent(scores, d => d[0]);
   const scoreYRange = d3.extent(scores, d => d[1]);
   const scoreMaxRange = Math.min(
      scoreXRange[1] - scoreXRange[0], 
      scoreYRange[1] - scoreYRange[0]
   );

   // Assume we want the length of the loadings to be at most half the range of scores
   const loadingsScalingFactor = scoreMaxRange / 2;
   

   loadings.forEach((loading, i) => {
      const loadingScaled = [loading[0] * loadingsScalingFactor, loading[1] * loadingsScalingFactor];

      svg.append("line")
         .attr("x1", x(0))
         .attr("y1", y(0))
         .attr("x2", x(loadingScaled[0]))
         .attr("y2", y(loadingScaled[1]))
         .attr("stroke", "red")
         .attr("marker-end", "url(#arrowhead)");

      // // Adding feature names as labels at the end of the eigenvector lines
      // svg.append("text")
      //    .attr("x", x(loadingScaled[0]))
      //    .attr("y", y(loadingScaled[1]))
      //    .text(attributeNames[i]) // Use the attribute name for label
      //    .style("font-size", "12px")
      //    .attr("fill", "red")
      //    .attr("alignment-baseline", "middle")
      //    .attr("text-anchor", "middle");

   });

   svg.selectAll(".legend").remove();

   // Recreate the legend with updated data
   const legend = svg.selectAll(".legend")
                     .data(colorScale.domain())
                     .enter().append("g")
                     .attr("class", "legend")
                     .attr("transform", (d, i) => `translate(0,${i * 20})`);

   legend.append("rect")
         .attr("x", width - 18)
         .attr("width", 36)
         .attr("height", 18)
         .style("fill", colorScale);

   legend.append("text")
         .attr("x", width - 24)
         .attr("y", 9)
         .attr("dy", ".5em")
         .style("text-anchor", "end")
         .text(d => "Cluster " + (d+1));

   svg.append("text")
   .attr("x", (width / 2))             
   .attr("y", 0 - (margin.top / 2))
   .attr("text-anchor", "middle")  
   .style("font-size", "16px") 
   .style("text-decoration", "underline")  
   .text("Bi Plot");

   svg.append("text")
   .attr("x", width / 2)
   .attr("y", height + margin.bottom - 20)
   .style("font-size", "16px") 
   .attr("text-anchor", "middle")
   .text("PC 1");

   svg.append("text")
   .attr("transform", "rotate(-90)")
   .attr("y", 0 - margin.left + 10)
   .attr("x",0 - (height / 2))
   .style("font-size", "16px") 
   .attr("dy", "1em")
   .attr("text-anchor", "middle")
   .text("PC 2");
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

  svg.append("text")
  .attr("x", 300)             
  .attr("y", 15)
  .attr("text-anchor", "middle")  
  .style("font-size", "16px") 
  .style("text-decoration", "underline")  
  .text("Scatter Plot Matrix");

//    // Legend setup
//    const legendData = colorScale.domain().map((label) => {
//       return { label: `Group ${label}`, color: colorScale(label) };
//   });

//   // Create legend container, adjust positions as needed
//   const legend = svg.append("g")
//                     .attr("class", "legend")
//                     .attr("transform", `translate(${size * topAttributes.length - 100}, ${padding})`);

//   // Append color squares to legend
//   legend.selectAll(null)
//         .data(legendData)
//         .enter().append("rect")
//         .attr("x", 60)
//         .attr("y", (d, i) => i * 20 - 10) // Position rectangles
//         .attr("width", 18)
//         .attr("height", 18)
//         .style("fill", d => d.color);

//   // Append text labels to legend
//   legend.selectAll(null)
//         .data(legendData)
//         .enter().append("text")
//         .attr("x", 80) // Position text next to rectangles
//         .attr("y", (d, i) => i * 20 + 9 - 10) // Align text with rectangles
//         .attr("dy", ".35em")
//         .text(d => d.label);
}





function renderKMeansPlot(kmeansResults, selectedK, updateBiPlotCallback, updateScatterMatrixCallback) {
   d3.select("#kmeansPlot").selectAll("*").remove(); // Clear the existing plot

   const svg = d3.select("#kmeansPlot")
                 .append("svg")
                 .attr("width", width + margin.left + margin.right -10)
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
      .attr("fill", d => d[0] == selectedK ? "red" : "steelblue");

   // Legend setup
   const legendData = [
      { color: "red", label: "Selected K" },
      { color: "steelblue", label: "Other K values" }
   ];

   // Create legend container
   const legend = svg.selectAll(".legend")
                     .data(legendData)
                     .enter().append("g")
                     .attr("class", "legend")
                     .attr("transform", (d, i) => `translate(0,${i * 20})`);

   // Append color squares to legend
   legend.append("rect")
         .attr("x", width - 18) // Adjust this value to position the legend within the viewable area
         .attr("width", 36)
         .attr("height", 18)
         .style("fill", d => d.color);

   // Append text labels to legend
   legend.append("text")
         .attr("x", width - 24) // Adjust this value to ensure text aligns with the squares
         .attr("y", 9)
         .attr("dy", ".5em")
         .style("text-anchor", "end")
         .text(d => d.label);

   svg.append("text")
   .attr("x", (width / 2))             
   .attr("y", 0 - (margin.top / 2))
   .attr("text-anchor", "middle")  
   .style("font-size", "16px") 
   .style("text-decoration", "underline")  
   .text("K-Means Plot");

   svg.append("text")
   .attr("x", width / 2)
   .attr("y", height + margin.bottom - 20)
   .style("font-size", "16px") 
   .attr("text-anchor", "middle")
   .text("Number of Clusters (K)");

   svg.append("text")
   .attr("transform", "rotate(-90)")
   .attr("y", 0 - margin.left )
   .attr("x",0 - (height / 2) -10)
   .style("font-size", "16px") 
   .attr("dy", "1em")
   .attr("text-anchor", "middle")
   .text("Mean Squared Error (MSE) ");

}




