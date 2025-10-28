# Quick Start Guide

Get started with Ontokai ontologies in 5 minutes.

## 🎯 What You'll Build

A simple web app that:
1. Loads an Ontokai ontology
2. Displays business terms with definitions
3. Shows relationships in a simple graph

## 📋 Prerequisites

- Basic HTML/JavaScript knowledge
- Modern web browser
- Text editor

## 🚀 Step 1: Load the Ontology

Create `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Ontokai App</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .term { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .term-name { font-size: 1.2em; font-weight: bold; color: #333; }
        .term-def { color: #666; margin-top: 10px; }
        .regulation { background: #e3f2fd; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Business Glossary</h1>
    <div id="terms-container"></div>

    <script>
        // Load Ontokai ontology
        fetch('../../sample-outputs/acme-insurance-ontology.json')
            .then(response => response.json())
            .then(ontology => {
                displayTerms(ontology);
            });

        function displayTerms(ontology) {
            const container = document.getElementById('terms-container');

            ontology.business_terms.forEach(term => {
                const termDiv = document.createElement('div');
                termDiv.className = 'term';

                termDiv.innerHTML = `
                    <div class="term-name">${term.name}</div>
                    ${term.short_name ? `<div style="color: #888;">(${term.short_name})</div>` : ''}
                    <div class="term-def">${term.definition}</div>
                    <div style="margin-top: 10px;">
                        <span class="regulation">Source: ${ontology.regulations.find(r => r.id === term.source_regulation)?.short_name}</span>
                    </div>
                `;

                container.appendChild(termDiv);
            });
        }
    </script>
</body>
</html>
```

## 📊 Step 2: Add Graph Visualization

Enhance with D3.js (add before `</body>`):

```html
<h2 style="margin-top: 40px;">Knowledge Graph</h2>
<svg id="graph" width="1000" height="600" style="border: 1px solid #ddd;"></svg>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
function visualizeGraph(ontology) {
    const svg = d3.select("#graph");
    const width = 1000, height = 600;

    // Prepare nodes
    const nodes = [
        { id: ontology.metadata.company, type: 'company', name: ontology.metadata.company }
    ];

    ontology.regulations.forEach(reg => {
        nodes.push({ id: reg.id, type: 'regulation', name: reg.short_name || reg.name });
    });

    ontology.business_processes.forEach(proc => {
        nodes.push({ id: proc.id, type: 'process', name: proc.name });
    });

    ontology.business_terms.forEach(term => {
        nodes.push({ id: term.id, type: 'term', name: term.name });
    });

    // Prepare links
    const links = ontology.relationships.map(rel => ({
        source: rel.source,
        target: rel.target,
        relation: rel.relation
    }));

    // Color by type
    const color = d3.scaleOrdinal()
        .domain(['company', 'regulation', 'process', 'term'])
        .range(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 2);

    // Draw nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", d => d.type === 'company' ? 15 : 8)
        .attr("fill", d => color(d.type))
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add labels
    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.name)
        .attr("font-size", 10)
        .attr("dx", 12)
        .attr("dy", 4);

    // Update positions
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Call after loading ontology
fetch('../../sample-outputs/acme-insurance-ontology.json')
    .then(response => response.json())
    .then(ontology => {
        displayTerms(ontology);
        visualizeGraph(ontology);
    });
</script>
```

## 🎨 Step 3: Style It

Add filtering and search:

```javascript
// Add search box
const searchBox = document.createElement('input');
searchBox.type = 'text';
searchBox.placeholder = 'Search terms...';
searchBox.style.cssText = 'width: 300px; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px;';
document.querySelector('h1').after(searchBox);

searchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.term').forEach(term => {
        const text = term.textContent.toLowerCase();
        term.style.display = text.includes(query) ? 'block' : 'none';
    });
});
```

## 🔌 Step 4: Export to CSV

Add export button:

```javascript
function exportToCSV(ontology) {
    const csv = [
        ['Term', 'Definition', 'Source Regulation', 'Article'].join(','),
        ...ontology.business_terms.map(term => [
            `"${term.name}"`,
            `"${term.definition}"`,
            `"${ontology.regulations.find(r => r.id === term.source_regulation)?.short_name}"`,
            `"${term.source_article || ''}"`
        ].join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-glossary.csv';
    a.click();
}

// Add export button
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export to CSV';
exportBtn.style.cssText = 'padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;';
exportBtn.onclick = () => exportToCSV(ontology);
searchBox.after(exportBtn);
```

## 📚 Next Steps

- **Integrate with your platform:** Import into Collibra, Alation, etc.
- **Add more visualizations:** Tree view, matrix view, timeline
- **Connect to backend:** Build your own ontology generator
- **Extend the data model:** Add custom attributes and relationships

## 🔗 Resources

- [Integration Guides](../integrations/)
- [Export Formats](../export-formats/)
- [Data Schema](../data-schemas/ontology-schema.json)
- [Sample Output](../sample-outputs/acme-insurance-ontology.json)

## 💡 Tips

1. **Start simple:** Display terms first, add graph later
2. **Use the schema:** Validate your data against `ontology-schema.json`
3. **Customize:** Add your company's colors, logo, branding
4. **Performance:** For large ontologies (>1000 terms), implement pagination

## 🤝 Community

- **Questions?** Open an [issue](https://github.com/ModularTaiga-marc/kaimak-ontokai-core/issues)
- **Share your work:** We'd love to see what you build!
- **Contribute:** Submit your integration guides or examples

---

**Happy coding!** 🚀
