// Kaimak Interactive Knowledge Graph Navigator - Version B
// Point-and-click exploration with transparent token usage

// Prevent double-loading
if (window.interactiveKGLoaded) {
    console.log('⚠️ Interactive KG already loaded, skipping...');
} else {
    window.interactiveKGLoaded = true;

// Auto-detect API base URL (works for local dev, DEV, and production)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://localhost:${window.location.port || 8002}`  // Local: port 8002 for Version B
    : (window.location.hostname.includes('ontokai-dev.onrender.com')
        ? 'https://ontokai-api-dev.onrender.com'  // DEV environment
        : (window.location.hostname.includes('ontokai.onrender.com')
            ? 'https://ontokai-api.onrender.com'  // PROD environment
            : window.location.origin));  // Fallback: same origin

console.log('📍 Interactive Navigation API Base:', API_BASE);

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

// Make graphState globally accessible for export functionality
window.graphState = {
    nodes: [],
    links: [],
    selectedNodeId: null,
    companyName: '',
    industry: '',
    country: '',
    sessionTokens: 0,
    sessionCost: 0,
    cacheHits: 0,
    nodesDiscovered: 0
};

// Local reference for convenience
const graphState = window.graphState;

let simulation = null;
let svg = null;
let zoom = null;
let graphGroup = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the interactive KG with only the company node
 * This function is called from the HTML after wizard completes
 */
window.initializeInteractiveKG = async function initializeInteractiveKG(companyName) {
    console.log('🎯 initializeInteractiveKG called with:', companyName);
    graphState.companyName = companyName;

    // Update header (use correct element IDs from interactive-kg-section)
    const headerElement = document.getElementById('company-name-header-kg');
    if (headerElement) {
        headerElement.textContent = companyName;
    } else {
        console.warn('⚠️ company-name-header-kg element not found');
    }

    // Get canvas dimensions early
    const container = document.getElementById('graph-canvas');
    if (!container) {
        console.error('❌ graph-canvas element not found!');
        return;
    }

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    console.log('📐 Canvas dimensions:', { width: container.clientWidth, height: container.clientHeight, centerX, centerY });

    // Try to fetch company metadata from backend
    let companyData = null;
    try {
        // Build URL with wizard context (industry, hq_location)
        const wizardData = window.wizardData || {};
        let url = `${API_BASE}/api/node/company-root?company=${encodeURIComponent(companyName)}`;

        if (wizardData.industry) {
            url += `&industry=${encodeURIComponent(wizardData.industry)}`;
        }
        if (wizardData.hqLocation) {
            url += `&hq_location=${encodeURIComponent(wizardData.hqLocation)}`;
        }

        console.log('🌐 Fetching company data from:', url);
        const response = await fetch(url);

        if (!response.ok) {
            console.warn('⚠️ API returned status:', response.status);
            throw new Error('Failed to fetch company data');
        }

        companyData = await response.json();
        console.log('✅ Fetched company data:', companyData);

        // Store industry and country in graphState for regulation exploration
        if (companyData.metadata?.industry) {
            graphState.industry = companyData.metadata.industry;
            const industryElement = document.getElementById('company-industry-kg');
            if (industryElement) {
                industryElement.textContent = companyData.metadata.industry;
            }
        }

        if (companyData.metadata?.hq_location) {
            graphState.country = companyData.metadata.hq_location;
        }

        // Initialize graph with only company node
        // Set initial position to center of viewport
        const container = document.getElementById('graph-canvas');
        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;

        graphState.nodes = [{
            id: companyData.node_id,
            label: companyName, // Use actual company name from wizard
            type: companyData.type || 'company', // Use type from API (party for Version B)
            metadata: companyData.metadata || {},
            explorationOptions: companyData.exploration_options || [],
            x: centerX,
            y: centerY
            // Note: Not setting fx/fy so force simulation can work properly with new nodes
        }];

        console.log('📍 Company node created at center:', { x: centerX, y: centerY, label: companyName });

        graphState.links = [];
        graphState.nodesDiscovered = 1;

        // Render initial graph
        renderKnowledgeGraph();
        updateStats();

        // Auto-select company node to show exploration options
        setTimeout(() => {
            if (graphState.nodes.length > 0) {
                const companyNode = graphState.nodes[0];
                graphState.selectedNodeId = companyNode.id;
                renderNodeDetailsPanel(companyNode);

                // Highlight the selected node
                d3.selectAll('.node-circle')
                    .attr('stroke', d => d.id === companyNode.id ? '#fff' : '#1e293b')
                    .attr('stroke-width', d => d.id === companyNode.id ? 3 : 2);

                console.log('✅ Auto-selected company node for exploration');
            }
        }, 1500);

        console.log('✅ Interactive KG initialized with company node:', companyName);

    } catch (error) {
        console.error('❌ Error initializing KG:', error);

        // Create fallback node with dummy data
        console.log('🔄 Creating fallback company node...');

        graphState.nodes = [{
            id: 'company-root',
            label: companyName,
            type: 'party', // Version B uses 'party' type
            metadata: {
                description: 'Click to start exploration',
                hint: 'Explore regulations or business lines'
            },
            explorationOptions: [
                { type: 'regulations', label: 'Explore Regulations', estimated_tokens: 1500 },
                { type: 'business_lines', label: 'Explore Business Lines', estimated_tokens: 1200 }
            ],
            x: centerX,
            y: centerY
            // Not fixing position so force simulation can work
        }];

        graphState.links = [];
        graphState.nodesDiscovered = 1;

        // Render fallback graph
        renderKnowledgeGraph();
        updateStats();

        // Auto-select company node
        setTimeout(() => {
            if (graphState.nodes.length > 0) {
                const companyNode = graphState.nodes[0];
                graphState.selectedNodeId = companyNode.id;
                renderNodeDetailsPanel(companyNode);

                d3.selectAll('.node-circle')
                    .attr('stroke', d => d.id === companyNode.id ? '#fff' : '#1e293b')
                    .attr('stroke-width', d => d.id === companyNode.id ? 3 : 2);

                console.log('✅ Auto-selected fallback company node');
            }
        }, 1500);

        console.log('✅ Interactive KG initialized with fallback data');
    }
}

// ============================================================================
// GRAPH RENDERING (D3.js Force-Directed Layout)
// ============================================================================

/**
 * Render the knowledge graph using D3.js force simulation
 */
function renderKnowledgeGraph() {
    const container = document.getElementById('graph-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous SVG only (preserve navigation buttons)
    const existingSvg = container.querySelector('svg');
    if (existingSvg) {
        existingSvg.remove();
    }

    // Create SVG with zoom/pan support
    svg = d3.select('#graph-canvas')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('position', 'absolute')
        .style('top', '0')
        .style('left', '0');

    // Create a group for all graph elements (enables zoom/pan)
    graphGroup = svg.append('g');

    // Add zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 4]) // Allow zoom from 10% to 400%
        .on('zoom', (event) => {
            graphGroup.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Reset zoom to identity (100%, centered) on each render
    svg.call(zoom.transform, d3.zoomIdentity);

    // Store zoom behavior for later use (reset, center, etc.) - for backward compatibility
    window.graphZoom = zoom;
    window.graphSvg = svg;
    window.graphGroup = graphGroup;

    console.log('📐 SVG created and stored in global variables:', {
        svgExists: !!svg,
        zoomExists: !!zoom,
        graphGroupExists: !!graphGroup,
        width,
        height
    });

    // Click on background to deselect and re-center on company node
    svg.on('click', function(event) {
        // Only trigger if clicking directly on SVG (not on nodes/links)
        if (event.target === this || event.target.tagName === 'svg') {
            graphState.selectedNodeId = null;

            // Reset node visuals (remove highlights)
            d3.selectAll('.node-circle')
                .attr('stroke', '#1e293b')
                .attr('stroke-width', 2);

            // Hide node details panel
            document.getElementById('no-selection-state').classList.remove('hidden');
            document.getElementById('node-details-content').classList.add('hidden');

            // Re-center on company node
            const companyNode = graphState.nodes.find(n => n.type === 'company' || n.type === 'party');
            if (companyNode) {
                centerViewportOnNode(companyNode);
                console.log('📍 Deselected - recentered on company node');
            }
        }
    });

    console.log('✅ Zoom and pan enabled (scroll to zoom, drag to pan)');

    // Create arrow markers for directed links
    svg.append('defs').selectAll('marker')
        .data(['regulation', 'business_line', 'process', 'term'])
        .join('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#475569');

    // Pin company node to center of viewport
    const companyNode = graphState.nodes.find(n => n.type === 'company' || n.type === 'party');
    if (companyNode) {
        companyNode.fx = width / 2;
        companyNode.fy = height / 2;
        console.log('📍 Company node pinned to center:', { x: companyNode.fx, y: companyNode.fy });
    }

    // Create force simulation with ULTRA-STRONG anti-stacking forces
    simulation = d3.forceSimulation(graphState.nodes)
        .force('link', d3.forceLink(graphState.links).id(d => d.id).distance(180)) // Maximum link distance
        .force('charge', d3.forceManyBody().strength(-2000)) // EXTREME repulsion (doubled from -1000)
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.02)) // Very weak center force
        .force('collision', d3.forceCollide().radius(d => {
            // EXTREME collision radius to prevent ANY overlap
            return getNodeRadius(d.type) + 50; // Maximum padding (was +35)
        }).strength(1).iterations(8)) // Maximum collision force with EIGHT iterations (was 5)
        .force('boundary', () => {
            // Keep nodes within viewport boundaries
            const padding = 80;
            graphState.nodes.forEach(node => {
                // Don't constrain company node (it's pinned to center)
                if (node.type !== 'company' && node.type !== 'party') {
                    node.x = Math.max(padding, Math.min(width - padding, node.x));
                    node.y = Math.max(padding, Math.min(height - padding, node.y));
                }
            });
        })
        .alpha(3.0) // ABSOLUTE MAXIMUM energy (was 2.0)
        .alphaDecay(0.005) // EXTREMELY slow decay = maximum time to separate (was 0.01)
        .velocityDecay(0.2); // Minimum friction = maximum movement to spread out (was 0.3)

    console.log('🔥 Force simulation initialized with EXTREME anti-stacking forces:', {
        repulsion: -2000,
        collisionPadding: 50,
        collisionIterations: 8,
        alpha: 3.0,
        alphaDecay: 0.005
    });

    // Draw links (inside the zoomable group)
    const link = graphGroup.append('g')
        .selectAll('line')
        .data(graphState.links)
        .join('line')
        .attr('class', 'link-line')
        .attr('marker-end', d => `url(#arrow-${d.target.type || 'regulation'})`);

    // Draw nodes (inside the zoomable group)
    const node = graphGroup.append('g')
        .selectAll('g')
        .data(graphState.nodes)
        .join('g')
        .attr('class', 'node-group')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Node circles
    node.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => {
            const radius = getNodeRadius(d.type);
            console.log(`📍 Node circle: ${d.label}, radius: ${radius}, position: (${d.x}, ${d.y})`);
            return radius;
        })
        .attr('fill', d => getNodeColor(d.type))
        .attr('stroke', d => d.id === graphState.selectedNodeId ? '#fff' : '#1e293b')
        .attr('stroke-width', d => d.id === graphState.selectedNodeId ? 3 : 2)
        .on('click', onNodeClick);

    // Node labels
    node.append('text')
        .attr('class', 'node-label')
        .attr('dy', d => -getNodeRadius(d.type) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', d => (d.type === 'company' || d.type === 'party') ? getNodeColor(d.type) : '#9ca3af')
        .text(d => truncateLabel(d.label, d.type));

    // Update positions on tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    console.log(`🎨 Rendered graph with ${graphState.nodes.length} nodes, ${graphState.links.length} links`);

    // Auto-center on company node after simulation stabilizes
    autoCenterOnCompany();
}

// ============================================================================
// NODE INTERACTION
// ============================================================================

/**
 * Handle node click events
 */
async function onNodeClick(event, nodeData) {
    event.stopPropagation();

    graphState.selectedNodeId = nodeData.id;

    // Update node visuals (highlight selected)
    d3.selectAll('.node-circle')
        .attr('stroke', d => d.id === nodeData.id ? '#fff' : '#1e293b')
        .attr('stroke-width', d => d.id === nodeData.id ? 3 : 2);

    // Always render what we have first (immediate feedback)
    renderNodeDetailsPanel(nodeData);

    // Center viewport on selected node
    centerViewportOnNode(nodeData);

    // Try to fetch fresh metadata if missing, but don't block
    if (!nodeData.metadata || !nodeData.explorationOptions) {
        await fetchNodeMetadata(nodeData.id);
    }

    console.log('📍 Node clicked:', nodeData.label);
}

/**
 * Fetch node metadata from backend
 */
async function fetchNodeMetadata(nodeId) {
    try {
        const response = await fetch(`${API_BASE}/api/node/${nodeId}?company=${encodeURIComponent(graphState.companyName)}`);

        if (!response.ok) {
            // 404 is expected for some nodes - they exist but don't have detailed metadata
            if (response.status === 404) {
                console.warn(`⚠️ No detailed metadata available for node: ${nodeId}`);
                // Node already rendered with basic info from exploration, no need to show error
                return;
            }
            throw new Error(`Failed to fetch node metadata: ${response.status}`);
        }

        const nodeData = await response.json();

        // Update node in graph state with fresh metadata
        const node = graphState.nodes.find(n => n.id === nodeId);
        if (node) {
            node.metadata = nodeData.metadata;
            node.explorationOptions = nodeData.exploration_options;

            // Re-render with updated metadata
            renderNodeDetailsPanel(node);
            console.log('✅ Updated node metadata:', nodeId);
        }

    } catch (error) {
        console.error('❌ Error fetching node metadata:', error);
        // Don't show alert - node is already displayed with basic info
    }
}

/**
 * Render node details in the right panel
 */
async function renderNodeDetailsPanel(node) {
    // Show details container, hide no-selection state
    document.getElementById('no-selection-state').classList.add('hidden');
    document.getElementById('node-details-content').classList.remove('hidden');

    // Set node icon and title
    const iconMap = {
        'party': '🏛️',  // Party/Organization icon
        'company': '🏢',
        'regulation': '📋',
        'business_line': '⚙️',
        'process': '🔄',
        'business_term': '📝'
    };

    const colorMap = {
        'party': 'bg-indigo-500',  // Indigo for party nodes
        'company': 'bg-cyan-500',
        'regulation': 'bg-green-500',
        'business_line': 'bg-purple-500',
        'process': 'bg-blue-500',
        'business_term': 'bg-yellow-500'
    };

    document.getElementById('node-icon').textContent = iconMap[node.type] || '📌';
    document.getElementById('node-icon').className = `w-10 h-10 rounded-lg flex items-center justify-center mr-3 text-2xl ${colorMap[node.type] || 'bg-gray-500'}`;

    document.getElementById('node-title').textContent = node.label;

    const typeBadge = document.getElementById('node-type-badge');
    typeBadge.textContent = formatNodeType(node.type);
    typeBadge.className = `text-xs px-2 py-1 rounded-full ${colorMap[node.type]?.replace('bg-', 'bg-') + '/20 text-white'}`;

    // Render metadata
    const metadataContainer = document.getElementById('node-metadata');
    metadataContainer.innerHTML = '';

    // For party nodes, render enriched party metadata
    if (node.type === 'party') {
        await renderPartyMetadata(node, metadataContainer);
    }
    // For business_term nodes, fetch AMDR metadata
    else if (node.type === 'business_term') {
        await renderAMDRMetadata(node, metadataContainer);
    }
    // For regulation nodes, fetch enriched regulation metadata
    else if (node.type === 'regulation') {
        await renderRegulationMetadata(node, metadataContainer);
    }
    else {
        // Render basic metadata for other node types
        if (node.metadata) {
            for (const [key, value] of Object.entries(node.metadata)) {
                if (value && value !== '') {
                    const metaItem = document.createElement('div');
                    metaItem.className = 'bg-kaimak-dark/50 rounded p-2';
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400">${formatMetadataKey(key)}</div>
                        <div class="text-sm font-semibold">${value}</div>
                    `;
                    metadataContainer.appendChild(metaItem);
                }
            }
        }
    }

    // Render exploration options
    const optionsContainer = document.getElementById('exploration-options');
    optionsContainer.innerHTML = '<h4 class="text-sm font-semibold text-gray-300 mb-2"><i class="fas fa-compass mr-1"></i>Explore Deeper</h4>';

    if (node.explorationOptions && node.explorationOptions.length > 0) {
        node.explorationOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'explore-button w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-between';
            button.innerHTML = `
                <span><i class="fas fa-search-plus mr-2"></i>${option.label}</span>
                <span class="text-xs opacity-75">~${option.estimated_tokens || 1500} tokens</span>
            `;
            button.onclick = () => exploreNode(node.id, option.type, option.estimated_tokens);
            optionsContainer.appendChild(button);
        });
    } else {
        optionsContainer.innerHTML += '<p class="text-sm text-gray-500 italic">No further exploration available</p>';
    }
}

/**
 * Render AMDR-compliant metadata for business terms
 */
async function renderAMDRMetadata(node, container) {
    // Show loading state
    container.innerHTML = `
        <div class="flex items-center justify-center py-4 text-gray-400">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            <span class="text-sm">Enriching metadata...</span>
        </div>
    `;

    try {
        // Fetch enriched metadata from API
        const response = await fetch(`${API_BASE}/api/term/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                term_name: node.label,
                company: graphState.companyName,
                source_regulation: node.metadata?.source_regulation || null,
                process_context: node.metadata?.process || null,
                use_cache: true
            })
        });

        if (!response.ok) {
            throw new Error(`Metadata enrichment failed: ${response.status}`);
        }

        const result = await response.json();
        const metadata = result.metadata;
        const cacheHit = result.cache_hit;

        // Clear loading state
        container.innerHTML = '';

        // Add cache indicator if data came from cache
        if (cacheHit) {
            const cacheIndicator = document.createElement('div');
            cacheIndicator.className = 'bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded mb-3 flex items-center';
            cacheIndicator.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Cached metadata (no API cost)';
            container.appendChild(cacheIndicator);
        }

        // Render AMDR metadata fields
        const amdrFields = [
            { key: 'DEFFINITION', label: 'Definition', value: metadata.definition || metadata.DEFFINITION },
            { key: 'SYNONIMS', label: 'Synonyms', value: metadata.synonyms || metadata.SYNONIMS },
            { key: 'ACRONYMS', label: 'Acronyms', value: metadata.acronyms || metadata.ACRONYMS },
            { key: 'TAGS', label: 'Tags', value: metadata.tags || metadata.TAGS },
            { key: 'BUSINESS_PROCESS_ENTITY', label: 'Business Entity', value: metadata.business_process_entity || metadata.BUSINESS_PROCESS_ENTITY },
            { key: 'ASSOCIATED_PROCESS', label: 'Associated Process', value: metadata.associated_process || metadata.ASSOCIATED_PROCESS },
            { key: 'DATA_SME', label: 'Data SME', value: metadata.data_subject_matter_expert || metadata.DATA_SME },
            { key: 'ASSET_STATUS', label: 'Status', value: metadata.asset_status || metadata.ASSET_STATUS },
            { key: 'UID', label: 'Unique ID', value: metadata.uid || metadata.UID },
            { key: 'source_regulation', label: 'Source Regulation', value: metadata.source_regulation }
        ];

        amdrFields.forEach(field => {
            if (field.value && field.value !== '' && field.value !== 'null') {
                const metaItem = document.createElement('div');
                metaItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';

                // Format definition with more space
                if (field.key === 'DEFFINITION') {
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400 mb-1">${field.label}</div>
                        <div class="text-sm leading-relaxed">${field.value}</div>
                    `;
                } else {
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400">${field.label}</div>
                        <div class="text-sm font-semibold">${field.value}</div>
                    `;
                }

                container.appendChild(metaItem);
            }
        });

        // Add enrichment info footer
        if (metadata.enriched_at) {
            const enrichmentInfo = document.createElement('div');
            enrichmentInfo.className = 'mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500';
            const enrichedDate = new Date(metadata.enriched_at).toLocaleDateString();
            enrichmentInfo.innerHTML = `
                <i class="fas fa-robot mr-1"></i>
                Enriched by ${metadata.enrichment_model || 'AI'} on ${enrichedDate}
            `;
            container.appendChild(enrichmentInfo);
        }

        console.log('✅ AMDR metadata rendered:', node.label, cacheHit ? '(cached)' : '(fresh)');

    } catch (error) {
        console.error('❌ Failed to render AMDR metadata:', error);

        // Show error state with fallback to basic metadata
        container.innerHTML = `
            <div class="bg-red-500/20 text-red-400 text-xs px-3 py-2 rounded mb-3">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Failed to enrich metadata: ${error.message}
            </div>
        `;

        // Fallback to basic metadata if available
        if (node.metadata) {
            for (const [key, value] of Object.entries(node.metadata)) {
                if (value && value !== '') {
                    const metaItem = document.createElement('div');
                    metaItem.className = 'bg-kaimak-dark/50 rounded p-2 mb-2';
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400">${formatMetadataKey(key)}</div>
                        <div class="text-sm font-semibold">${value}</div>
                    `;
                    container.appendChild(metaItem);
                }
            }
        }
    }
}

/**
 * Render enriched party metadata (AMDR-compliant)
 */
async function renderPartyMetadata(node, container) {
    // Check if party metadata is already enriched
    const partyMetadata = node.metadata?.party_metadata;
    const isEnriched = node.metadata?.enriched;

    if (!isEnriched || !partyMetadata) {
        // Show fallback metadata if not enriched
        container.innerHTML = '';
        if (node.metadata?.industry) {
            const metaItem = document.createElement('div');
            metaItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
            metaItem.innerHTML = `
                <div class="text-xs text-gray-400 mb-1">Industry</div>
                <div class="text-sm font-semibold">${node.metadata.industry}</div>
            `;
            container.appendChild(metaItem);
        }
        if (node.metadata?.hq_location) {
            const metaItem = document.createElement('div');
            metaItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
            metaItem.innerHTML = `
                <div class="text-xs text-gray-400 mb-1">Headquarters</div>
                <div class="text-sm font-semibold">${node.metadata.hq_location}</div>
            `;
            container.appendChild(metaItem);
        }
        return;
    }

    // Clear container
    container.innerHTML = '';

    // Add enrichment indicator
    const enrichmentBadge = document.createElement('div');
    enrichmentBadge.className = 'bg-indigo-500/20 text-indigo-400 text-xs px-2 py-1 rounded mb-3 flex items-center';
    enrichmentBadge.innerHTML = '<i class="fas fa-robot mr-2"></i>AI-Enriched AMDR Metadata';
    container.appendChild(enrichmentBadge);

    // Description (prominent)
    if (partyMetadata.DESCRIPTION) {
        const descItem = document.createElement('div');
        descItem.className = 'bg-kaimak-dark/70 rounded p-3 mb-3 border-l-4 border-indigo-500';
        descItem.innerHTML = `
            <div class="text-xs text-gray-400 mb-1">Description</div>
            <div class="text-sm text-gray-200 leading-relaxed">${partyMetadata.DESCRIPTION}</div>
        `;
        container.appendChild(descItem);
    }

    // Party Role & Classification
    const roleSection = document.createElement('div');
    roleSection.className = 'grid grid-cols-2 gap-2 mb-3';
    roleSection.innerHTML = `
        <div class="bg-kaimak-dark/50 rounded p-3">
            <div class="text-xs text-gray-400 mb-1">Party Role</div>
            <div class="text-sm font-semibold text-cyan-400">${partyMetadata.PARTY_ROLE_TYPE || 'N/A'}</div>
        </div>
        <div class="bg-kaimak-dark/50 rounded p-3">
            <div class="text-xs text-gray-400 mb-1">Party Type</div>
            <div class="text-sm font-semibold">${partyMetadata.PARTY_TYPE || 'N/A'}</div>
        </div>
    `;
    container.appendChild(roleSection);

    // Identifier & Location
    const identifierSection = document.createElement('div');
    identifierSection.className = 'grid grid-cols-2 gap-2 mb-3';
    identifierSection.innerHTML = `
        <div class="bg-kaimak-dark/50 rounded p-3">
            <div class="text-xs text-gray-400 mb-1">Identifier (LEI)</div>
            <div class="text-xs font-mono text-green-400">${partyMetadata.PARTY_IDENTIFIER || 'N/A'}</div>
        </div>
        <div class="bg-kaimak-dark/50 rounded p-3">
            <div class="text-xs text-gray-400 mb-1">Jurisdiction</div>
            <div class="text-sm font-semibold">${partyMetadata.JURISDICTION || partyMetadata.HQ_LOCATION || 'N/A'}</div>
        </div>
    `;
    container.appendChild(identifierSection);

    // Compliance & Risk
    const complianceSection = document.createElement('div');
    complianceSection.className = 'bg-kaimak-dark/50 rounded p-3 mb-3';
    complianceSection.innerHTML = `
        <div class="text-xs text-gray-400 mb-2">Compliance & Risk</div>
        <div class="grid grid-cols-3 gap-2">
            <div>
                <div class="text-xs text-gray-500">Due Diligence</div>
                <div class="text-sm font-semibold ${partyMetadata.DUE_DILIGENCE_STATUS === 'Completed' ? 'text-green-400' : 'text-yellow-400'}">
                    ${partyMetadata.DUE_DILIGENCE_STATUS || 'N/A'}
                </div>
            </div>
            <div>
                <div class="text-xs text-gray-500">Risk Rating</div>
                <div class="text-sm font-semibold ${partyMetadata.RISK_RATING === 'Low' ? 'text-green-400' : partyMetadata.RISK_RATING === 'Medium' ? 'text-yellow-400' : 'text-red-400'}">
                    ${partyMetadata.RISK_RATING || 'N/A'}
                </div>
            </div>
            <div>
                <div class="text-xs text-gray-500">Asset Status</div>
                <div class="text-sm font-semibold">${partyMetadata.ASSET_STATUS || 'N/A'}</div>
            </div>
        </div>
    `;
    container.appendChild(complianceSection);

    // Certifications (badges)
    if (partyMetadata.CERTIFICATIONS && Array.isArray(partyMetadata.CERTIFICATIONS) && partyMetadata.CERTIFICATIONS.length > 0) {
        const certsSection = document.createElement('div');
        certsSection.className = 'bg-kaimak-dark/50 rounded p-3 mb-3';
        certsSection.innerHTML = `
            <div class="text-xs text-gray-400 mb-2">Certifications</div>
            <div class="flex flex-wrap gap-2">
                ${partyMetadata.CERTIFICATIONS.map(cert => `
                    <span class="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                        <i class="fas fa-certificate mr-1"></i>${cert}
                    </span>
                `).join('')}
            </div>
        `;
        container.appendChild(certsSection);
    }

    // Contact Information
    if (partyMetadata.DATA_STEWARD || partyMetadata.CONTACT_EMAIL) {
        const contactSection = document.createElement('div');
        contactSection.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
        contactSection.innerHTML = `
            <div class="text-xs text-gray-400 mb-2">Data Governance Contact</div>
            ${partyMetadata.DATA_STEWARD ? `<div class="text-sm mb-1"><i class="fas fa-user-shield mr-2 text-cyan-400"></i>${partyMetadata.DATA_STEWARD}</div>` : ''}
            ${partyMetadata.CONTACT_EMAIL ? `<div class="text-sm"><i class="fas fa-envelope mr-2 text-gray-400"></i>${partyMetadata.CONTACT_EMAIL}</div>` : ''}
        `;
        container.appendChild(contactSection);
    }

    // Financial Info (if available)
    if (partyMetadata.ANNUAL_REVENUE || partyMetadata.EMPLOYEE_COUNT) {
        const financialSection = document.createElement('div');
        financialSection.className = 'grid grid-cols-2 gap-2 mb-2';
        financialSection.innerHTML = `
            ${partyMetadata.ANNUAL_REVENUE ? `
                <div class="bg-kaimak-dark/50 rounded p-3">
                    <div class="text-xs text-gray-400 mb-1">Annual Revenue</div>
                    <div class="text-sm font-semibold">${partyMetadata.ANNUAL_REVENUE}</div>
                </div>
            ` : ''}
            ${partyMetadata.EMPLOYEE_COUNT ? `
                <div class="bg-kaimak-dark/50 rounded p-3">
                    <div class="text-xs text-gray-400 mb-1">Employees</div>
                    <div class="text-sm font-semibold">${partyMetadata.EMPLOYEE_COUNT}</div>
                </div>
            ` : ''}
        `;
        container.appendChild(financialSection);
    }

    // Tags (if available)
    if (partyMetadata.TAGS) {
        const tagsSection = document.createElement('div');
        tagsSection.className = 'mt-2';
        const tags = typeof partyMetadata.TAGS === 'string' ? partyMetadata.TAGS.split(',').map(t => t.trim()) : partyMetadata.TAGS;
        tagsSection.innerHTML = `
            <div class="flex flex-wrap gap-1">
                ${tags.map(tag => `
                    <span class="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                        ${tag}
                    </span>
                `).join('')}
            </div>
        `;
        container.appendChild(tagsSection);
    }
}

/**
 * Render enriched regulation metadata using KME API
 */
async function renderRegulationMetadata(node, container) {
    // Show loading state
    container.innerHTML = `
        <div class="flex items-center justify-center py-4 text-gray-400">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            <span class="text-sm">Enriching regulation metadata...</span>
        </div>
    `;

    try {
        // Fetch enriched metadata from Regulation KME API
        const response = await fetch(`${API_BASE}/api/regulation/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                regulation_name: node.label,
                company: graphState.companyName,
                use_cache: true
            })
        });

        if (!response.ok) {
            throw new Error(`Regulation metadata enrichment failed: ${response.status}`);
        }

        const result = await response.json();
        const metadata = result.metadata;
        const cacheHit = result.cache_hit;

        // Clear loading state
        container.innerHTML = '';

        // Add cache indicator if data came from cache
        if (cacheHit) {
            const cacheIndicator = document.createElement('div');
            cacheIndicator.className = 'bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded mb-3 flex items-center';
            cacheIndicator.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Cached metadata (~$0.00)';
            container.appendChild(cacheIndicator);
        } else {
            const costIndicator = document.createElement('div');
            costIndicator.className = 'bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded mb-3 flex items-center';
            costIndicator.innerHTML = '<i class="fas fa-bolt mr-2"></i>Fresh metadata (~$0.001)';
            container.appendChild(costIndicator);
        }

        // Regulatory Entity Section
        if (metadata.regulatory_entity) {
            const entitySection = document.createElement('div');
            entitySection.className = 'bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-3';
            entitySection.innerHTML = `
                <div class="flex items-center mb-2">
                    <i class="fas fa-university text-cyan-400 mr-2"></i>
                    <span class="text-xs font-semibold text-cyan-400">REGULATORY AUTHORITY</span>
                </div>
                <div class="text-sm font-bold text-white">${metadata.regulatory_entity}</div>
                ${metadata.regulatory_entity_full_name ? `<div class="text-xs text-gray-400 mt-1">${metadata.regulatory_entity_full_name}</div>` : ''}
            `;
            container.appendChild(entitySection);
        }

        // Basic Information
        const basicFields = [
            { key: 'regulation_code', label: 'Regulation Code', icon: 'fas fa-tag' },
            { key: 'description', label: 'Description', icon: 'fas fa-info-circle' },
            { key: 'scope', label: 'Scope', icon: 'fas fa-crosshairs' },
            { key: 'effective_date', label: 'Effective Date', icon: 'fas fa-calendar-check' },
            { key: 'last_updated', label: 'Last Updated', icon: 'fas fa-clock' }
        ];

        basicFields.forEach(field => {
            if (metadata[field.key] && metadata[field.key] !== '') {
                const metaItem = document.createElement('div');
                metaItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';

                if (field.key === 'description') {
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400 mb-1 flex items-center">
                            <i class="${field.icon} mr-2"></i>${field.label}
                        </div>
                        <div class="text-sm leading-relaxed">${metadata[field.key]}</div>
                    `;
                } else {
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400 flex items-center">
                            <i class="${field.icon} mr-2"></i>${field.label}
                        </div>
                        <div class="text-sm font-semibold">${metadata[field.key]}</div>
                    `;
                }

                container.appendChild(metaItem);
            }
        });

        // Industry Sectors
        if (metadata.industry_sectors && metadata.industry_sectors.length > 0) {
            const sectorsItem = document.createElement('div');
            sectorsItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
            sectorsItem.innerHTML = `
                <div class="text-xs text-gray-400 mb-2 flex items-center">
                    <i class="fas fa-industry mr-2"></i>Industry Sectors
                </div>
                <div class="flex flex-wrap gap-1">
                    ${metadata.industry_sectors.map(sector =>
                        `<span class="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded">${sector}</span>`
                    ).join('')}
                </div>
            `;
            container.appendChild(sectorsItem);
        }

        // Tags
        if (metadata.tags && metadata.tags.length > 0) {
            const tagsItem = document.createElement('div');
            tagsItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
            tagsItem.innerHTML = `
                <div class="text-xs text-gray-400 mb-2 flex items-center">
                    <i class="fas fa-tags mr-2"></i>Tags
                </div>
                <div class="flex flex-wrap gap-1">
                    ${metadata.tags.map(tag =>
                        `<span class="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">#${tag}</span>`
                    ).join('')}
                </div>
            `;
            container.appendChild(tagsItem);
        }

        // Related Regulations
        if (metadata.related_regulations && metadata.related_regulations.length > 0) {
            const relatedItem = document.createElement('div');
            relatedItem.className = 'bg-kaimak-dark/50 rounded p-3 mb-2';
            relatedItem.innerHTML = `
                <div class="text-xs text-gray-400 mb-2 flex items-center">
                    <i class="fas fa-link mr-2"></i>Related Regulations
                </div>
                <div class="flex flex-wrap gap-1">
                    ${metadata.related_regulations.map(reg =>
                        `<span class="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">${reg}</span>`
                    ).join('')}
                </div>
            `;
            container.appendChild(relatedItem);
        }

        // Official Documentation Links
        if (metadata.relevant_links && metadata.relevant_links.length > 0) {
            const linksSection = document.createElement('div');
            linksSection.className = 'bg-kaimak-dark/50 rounded p-3 mb-3';
            linksSection.innerHTML = `
                <div class="text-xs text-gray-400 mb-2 flex items-center">
                    <i class="fas fa-external-link-alt mr-2"></i>Official Documentation
                </div>
                <div class="space-y-2">
                    ${metadata.relevant_links.map(link => `
                        <a href="${link.url}" target="_blank"
                           class="block bg-kaimak-darker/50 hover:bg-kaimak-darker rounded p-2 transition-colors group">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="text-sm text-blue-400 group-hover:text-blue-300 flex items-center">
                                        ${link.is_primary ? '<i class="fas fa-star text-yellow-400 mr-1 text-xs"></i>' : ''}
                                        ${link.title}
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        ${link.document_type}${link.published_date ? ' • ' + link.published_date : ''}
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-600 group-hover:text-blue-400 ml-2 mt-1"></i>
                            </div>
                        </a>
                    `).join('')}
                </div>
            `;
            container.appendChild(linksSection);
        }

        // Add enrichment info footer
        if (metadata.enriched_at) {
            const enrichmentInfo = document.createElement('div');
            enrichmentInfo.className = 'mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500';
            const enrichedDate = new Date(metadata.enriched_at).toLocaleDateString();
            enrichmentInfo.innerHTML = `
                <i class="fas fa-robot mr-1"></i>
                Enriched by ${metadata.enrichment_model || 'AI'} on ${enrichedDate}
            `;
            container.appendChild(enrichmentInfo);
        }

        console.log('✅ Regulation metadata rendered:', node.label, cacheHit ? '(cached)' : '(fresh)');

    } catch (error) {
        console.error('❌ Failed to render regulation metadata:', error);

        // Show error state with fallback to basic metadata
        container.innerHTML = `
            <div class="bg-red-500/20 text-red-400 text-xs px-3 py-2 rounded mb-3">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Failed to enrich regulation metadata: ${error.message}
            </div>
        `;

        // Fallback to basic metadata if available
        if (node.metadata) {
            for (const [key, value] of Object.entries(node.metadata)) {
                if (value && value !== '') {
                    const metaItem = document.createElement('div');
                    metaItem.className = 'bg-kaimak-dark/50 rounded p-2 mb-2';
                    metaItem.innerHTML = `
                        <div class="text-xs text-gray-400">${formatMetadataKey(key)}</div>
                        <div class="text-sm font-semibold">${value}</div>
                    `;
                    container.appendChild(metaItem);
                }
            }
        }
    }
}

/**
 * Show user-friendly error modal (NEVER expose technical errors!)
 */
function showErrorModal(message, showSupport = false) {
    // Remove any existing error modal
    const existingModal = document.getElementById('error-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'error-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70';
    modal.innerHTML = `
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
            <div class="flex items-start mb-4">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-circle text-yellow-400 text-3xl"></i>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-lg font-semibold text-white mb-2">Something went wrong</h3>
                    <p class="text-gray-300 text-sm">${message}</p>
                </div>
            </div>

            ${showSupport ? `
                <div class="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 mb-4">
                    <p class="text-xs text-blue-300">
                        <i class="fas fa-info-circle mr-1"></i>
                        If this persists, please contact support.
                    </p>
                </div>
            ` : ''}

            <div class="flex justify-end gap-2">
                <button onclick="closeErrorModal()" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm font-medium transition-colors">
                    OK
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeErrorModal();
        }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeErrorModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

/**
 * Close error modal
 */
function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Explore a node by fetching related nodes from backend
 */
async function exploreNode(nodeId, explorationType, estimatedTokens) {
    // Show loading state
    document.getElementById('exploration-options').classList.add('hidden');
    document.getElementById('exploration-loading').classList.remove('hidden');
    document.getElementById('loading-status').textContent = `Exploring ${explorationType}...`;

    const startTime = Date.now();

    try {
        // Get the node being explored to extract party metadata
        const node = graphState.nodes.find(n => n.id === nodeId);
        const partyMetadata = node?.metadata?.party_metadata || {};

        // Build rich context from party metadata (if available)
        const requestBody = {
            company: graphState.companyName,
            industry: graphState.industry,
            country: graphState.country,
            exploration_type: explorationType,
            depth: 1,
            // Include rich party context for AI magic
            party_context: {
                party_name: partyMetadata.PARTY_NAME || graphState.companyName,
                party_type: partyMetadata.PARTY_TYPE,
                party_role_type: partyMetadata.PARTY_ROLE_TYPE,
                industry_sector: partyMetadata.INDUSTRY_SECTOR || graphState.industry,
                sub_sector: partyMetadata.SUB_SECTOR,
                hq_location: partyMetadata.HQ_LOCATION || graphState.country,
                jurisdiction: partyMetadata.JURISDICTION,
                operating_countries: partyMetadata.OPERATING_COUNTRIES,
                certifications: partyMetadata.CERTIFICATIONS,
                regulatory_authorizations: partyMetadata.REGULATORY_AUTHORIZATIONS,
                risk_rating: partyMetadata.RISK_RATING,
                public_private: partyMetadata.PUBLIC_PRIVATE,
                description: partyMetadata.DESCRIPTION
            }
        };

        const response = await fetch(`${API_BASE}/api/node/${nodeId}/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // Try to get error details from response
            let errorMsg = 'Exploration failed';
            try {
                const errorData = await response.json();
                errorMsg = errorData.detail || errorData.message || errorMsg;
            } catch (e) {
                // Couldn't parse error response
            }
            console.error('❌ Exploration error:', response.status, errorMsg);
            throw new Error(errorMsg);
        }

        const result = await response.json();

        // Update token usage
        graphState.sessionTokens += result.tokens_used || 0;
        graphState.sessionCost += result.cost_usd || 0;
        if (result.cache_hit) {
            graphState.cacheHits++;
        }

        // Expand knowledge graph with new nodes
        expandKnowledgeGraph(nodeId, result.new_nodes);

        // Update stats
        updateStats();

        // Show success notification
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        showExplorationToast(result, elapsedTime);

        console.log('✅ Exploration complete:', result);

    } catch (error) {
        console.error('❌ Exploration error:', error);

        // Show user-friendly error modal (never show technical errors!)
        const errorMsg = error.message || 'Exploration failed';

        // Categorize error and show appropriate user-friendly message
        let userMessage = '';
        let showSupport = false;

        if (errorMsg.includes('No exploration options') || errorMsg.includes('already explored')) {
            userMessage = 'This exploration path has been exhausted. Try exploring a different node or option.';
        } else if (errorMsg.includes('SERVICE_UNAVAILABLE')) {
            // Groq rate limit hit and no valid Anthropic fallback
            userMessage = 'We\'ve reached our daily quota for free AI services. The system will be available again in a few minutes, or you can continue exploring cached data.';
            showSupport = false;
        } else if (errorMsg.includes('rate') || errorMsg.includes('limit') || errorMsg.includes('429')) {
            // Generic rate limit (shouldn't happen with fallback)
            userMessage = 'Our system is experiencing high demand. Please try again in a moment.';
            showSupport = false;
        } else if (errorMsg.includes('Both LLMs failed')) {
            userMessage = 'Unable to process your request at this time. Please try again later.';
            showSupport = true;
        } else {
            // Generic error - don't expose technical details
            userMessage = 'Unable to complete exploration. Please try again.';
        }

        showErrorModal(userMessage, showSupport);
    } finally {
        // Hide loading state
        document.getElementById('exploration-loading').classList.add('hidden');
        document.getElementById('exploration-options').classList.remove('hidden');
    }
}

/**
 * Expand the knowledge graph with new nodes from exploration
 */
function expandKnowledgeGraph(parentNodeId, newNodes) {
    if (!newNodes || newNodes.length === 0) {
        console.log('⚠️ No new nodes to add');
        return;
    }

    // Find parent node to position new nodes nearby
    const parentNode = graphState.nodes.find(n => n.id === parentNodeId);
    const parentX = parentNode ? (parentNode.x || 400) : 400;
    const parentY = parentNode ? (parentNode.y || 300) : 300;

    // Get viewport dimensions for boundary constraints
    const container = document.getElementById('graph-canvas');
    const viewportWidth = container ? container.clientWidth : 800;
    const viewportHeight = container ? container.clientHeight : 600;
    const padding = 80; // Keep nodes away from edges

    // ANTI-STACKING FIX: Track all node positions to prevent overlap
    const existingPositions = graphState.nodes.map(n => ({ x: n.x || 0, y: n.y || 0 }));
    const minSeparation = 100; // Minimum pixels between any two nodes

    // Helper function to check if position is too close to existing nodes
    function isTooCloseToExisting(x, y, existingPos) {
        for (let pos of existingPos) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minSeparation) {
                return true;
            }
        }
        return false;
    }

    // Add new nodes to graph state
    newNodes.forEach((nodeData, index) => {
        // Check if node already exists
        const existingNode = graphState.nodes.find(n => n.id === nodeData.node_id);
        if (!existingNode) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 50; // Try up to 50 times to find a non-overlapping position

            // Keep trying until we find a position that doesn't overlap
            do {
                // Give new nodes random positions in a circle around parent
                // Use MASSIVE angle variation to prevent stacking
                const angleBase = (index / newNodes.length) * 2 * Math.PI;
                const angleVariation = (Math.random() - 0.5) * (Math.PI / 2); // ±45 degrees (increased from ±30)
                const angle = angleBase + angleVariation;

                // Vary distance ENORMOUSLY to prevent overlap
                const baseDistance = 200; // Even further from parent (was 180)
                const distanceVariation = Math.random() * 120 - 60; // ±60px (was ±40px)
                const distance = baseDistance + distanceVariation;

                const randomOffset = (Math.random() - 0.5) * 80; // Even MORE randomness (was 60)

                // Calculate position
                x = parentX + Math.cos(angle) * distance + randomOffset;
                y = parentY + Math.sin(angle) * distance + randomOffset;

                // Constrain to viewport boundaries with padding
                x = Math.max(padding, Math.min(viewportWidth - padding, x));
                y = Math.max(padding, Math.min(viewportHeight - padding, y));

                attempts++;
            } while (isTooCloseToExisting(x, y, existingPositions) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                console.warn(`⚠️ Could not find non-overlapping position after ${maxAttempts} attempts, using last calculated position`);
            }

            console.log(`📍 Spawning node "${nodeData.label}" at (${Math.round(x)}, ${Math.round(y)}) after ${attempts} attempts`);

            // Add this position to existing positions for next node
            existingPositions.push({ x, y });

            const newNode = {
                id: nodeData.node_id,
                label: nodeData.label,
                type: nodeData.type,
                metadata: nodeData.metadata,
                explorationOptions: nodeData.exploration_options,
                x: x,
                y: y,
                // Add small initial velocity to help separation
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10
            };

            graphState.nodes.push(newNode);

            // Add link from parent to new node
            graphState.links.push({
                source: parentNodeId,
                target: nodeData.node_id
            });

            graphState.nodesDiscovered++;
        }
    });

    // Instead of full re-render, use D3 update pattern to add nodes organically
    updateGraphOrganically();

    console.log(`🔗 Added ${newNodes.length} new nodes to graph organically`);
}

/**
 * Update graph organically by adding new nodes without disturbing existing ones
 * Uses D3's update pattern instead of full re-render
 */
function updateGraphOrganically() {
    if (!svg || !graphGroup || !simulation) {
        console.warn('⚠️ Cannot update organically - missing SVG/simulation');
        return;
    }

    console.log('🌱 Updating graph organically (preserving existing positions)');

    // Update links with enter/exit pattern
    const linkSelection = graphGroup.select('g').selectAll('line')
        .data(graphState.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

    // Add new links
    linkSelection.enter()
        .append('line')
        .attr('class', 'link-line')
        .attr('marker-end', d => `url(#arrow-${d.target.type || 'regulation'})`);

    // Remove old links
    linkSelection.exit().remove();

    // Update nodes with enter/exit pattern
    const nodeSelection = graphGroup.selectAll('.node-group')
        .data(graphState.nodes, d => d.id);

    // Add new nodes
    const newNodeGroups = nodeSelection.enter()
        .append('g')
        .attr('class', 'node-group')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Add circle to new nodes
    newNodeGroups.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => getNodeRadius(d.type))
        .attr('fill', d => getNodeColor(d.type))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 2)
        .on('click', onNodeClick);

    // Add label to new nodes
    newNodeGroups.append('text')
        .attr('class', 'node-label')
        .attr('dy', d => getNodeRadius(d.type) + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .text(d => d.label.length > 20 ? d.label.substring(0, 18) + '...' : d.label);

    // Remove old nodes
    nodeSelection.exit().remove();

    // Update simulation with new data
    simulation.nodes(graphState.nodes);
    simulation.force('link').links(graphState.links);

    // Restart simulation GENTLY to accommodate new nodes
    // Use very low alpha so existing nodes don't move much
    simulation.alpha(0.3).restart();

    // Update positions on each tick
    simulation.on('tick', () => {
        // Update link positions
        graphGroup.select('g').selectAll('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Update node positions
        graphGroup.selectAll('.node-group')
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    console.log('✅ Graph updated organically - existing nodes preserved');
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update token tracker and statistics
 */
function updateTokenTracker(tokensUsed, costUsd) {
    graphState.sessionTokens += tokensUsed;
    graphState.sessionCost += costUsd;

    updateStats();
}

function updateStats() {
    // Update token display
    document.getElementById('tokens-used').textContent = graphState.sessionTokens.toLocaleString();
    document.getElementById('cost-usd').textContent = `$${graphState.sessionCost.toFixed(2)}`;

    // Update progress bar
    const progressPercent = Math.min((graphState.sessionTokens / 10000) * 100, 100);
    document.getElementById('token-progress-bar').style.width = `${progressPercent}%`;

    // Update node/link counts
    document.getElementById('node-count').textContent = `${graphState.nodes.length} nodes`;
    document.getElementById('link-count').textContent = `${graphState.links.length} links`;
    document.getElementById('nodes-discovered').textContent = graphState.nodesDiscovered;
    document.getElementById('cache-hits').textContent = graphState.cacheHits;
}

/**
 * Show exploration success toast notification
 */
function showExplorationToast(result, elapsedTime) {
    const toast = document.getElementById('exploration-toast');

    document.getElementById('toast-message').textContent = `${result.new_nodes?.length || 0} nodes discovered`;
    document.getElementById('toast-tokens').textContent = result.tokens_used || 0;
    document.getElementById('toast-cost').textContent = result.cache_hit ? '$0.00 (cached)' : `$${(result.cost_usd || 0).toFixed(4)}`;
    document.getElementById('toast-time').textContent = `${elapsedTime}s`;

    // Add cache indicator
    if (result.cache_hit) {
        document.getElementById('toast-message').innerHTML += ' <i class="fas fa-check-circle text-green-400 ml-1 cache-indicator"></i>';
    }

    toast.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// ============================================================================
// VIEWPORT CENTERING
// ============================================================================

/**
 * Center viewport on a specific node with smooth animation
 */
function centerViewportOnNode(nodeData) {
    if (!svg || !zoom) {
        console.warn('⚠️ SVG or zoom not initialized yet');
        return;
    }

    const container = document.getElementById('graph-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Calculate transform to center node in viewport
    const scale = d3.zoomTransform(svg.node()).k; // Keep current zoom level
    const x = width / 2 - nodeData.x * scale;
    const y = height / 2 - nodeData.y * scale;

    // Animate to center node
    svg.transition()
        .duration(750)
        .call(
            zoom.transform,
            d3.zoomIdentity.translate(x, y).scale(scale)
        );

    console.log(`🎯 Centered viewport on node: ${nodeData.label}`);
}

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================

/**
 * Handle window resize to make viewport responsive
 * IMPORTANT: Uses global variables svg, zoom, simulation, graphGroup
 * Uses debouncing to prevent too many rapid resize events
 */
let resizeTimeout = null;

window.addEventListener('resize', () => {
    console.log('📐 Window resize event triggered');

    // Clear previous timeout
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }

    // Debounce resize handler (wait 150ms after last resize event)
    resizeTimeout = setTimeout(() => {
        console.log('📐 Executing debounced resize handler (WIDTH ONLY)');
        console.log('📐 Variable check:', {
            svgExists: !!svg,
            zoomExists: !!zoom,
            simulationExists: !!simulation,
            graphGroupExists: !!graphGroup
        });

        if (!svg || !zoom || !simulation) {
            console.warn('⚠️ Resize handler: Missing required variables, skipping resize');
            return;
        }

        const container = document.getElementById('graph-canvas');
        if (!container) {
            console.warn('⚠️ Resize handler: graph-canvas container not found');
            return;
        }

        const newWidth = container.clientWidth;
        // Keep height STATIC - don't update it
        const currentHeight = parseInt(svg.attr('height'));

        console.log(`📐 Window resized WIDTH to: ${newWidth}px (height stays: ${currentHeight}px)`);

        // Update ONLY SVG width (not height)
        svg.attr('width', newWidth);
        console.log('✅ SVG width updated (height unchanged)');

        // Update force simulation center (only X coordinate changes)
        simulation.force('center', d3.forceCenter(newWidth / 2, currentHeight / 2).strength(0.02));
        console.log('✅ Force simulation center updated (X only)');

        // Update boundary force with new width
        const padding = 80;
        simulation.force('boundary', () => {
            graphState.nodes.forEach(node => {
                if (node.type !== 'company' && node.type !== 'party') {
                    // Only constrain X (width), keep Y unchanged
                    node.x = Math.max(padding, Math.min(newWidth - padding, node.x));
                }
            });
        });
        console.log('✅ Boundary force updated (width only)');

        // Re-pin company node to new horizontal center (keep Y same)
        const companyNode = graphState.nodes.find(n => n.type === 'company' || n.type === 'party');
        if (companyNode) {
            companyNode.fx = newWidth / 2;
            // DON'T change fy - keep vertical position
            console.log(`✅ Company node re-pinned to center X: ${companyNode.fx} (Y unchanged: ${companyNode.fy})`);
        }

        // Very gentle restart - only horizontal adjustment needed
        simulation.alpha(0.1).restart();

        console.log('✅ Viewport width adapted (height static)');
    }, 150); // 150ms debounce delay
});

// ============================================================================
// D3.js DRAG HANDLERS
// ============================================================================

function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);

    // Keep company node pinned to center, unpin other nodes
    if (d.type !== 'company' && d.type !== 'party') {
        d.fx = null;
        d.fy = null;
    } else {
        // Re-pin company node to center if user tried to drag it
        const container = document.getElementById('graph-canvas');
        d.fx = container.clientWidth / 2;
        d.fy = container.clientHeight / 2;
        console.log('📍 Company node re-pinned to center');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getNodeColor(type) {
    const colors = {
        'party': '#6366f1',        // indigo (party nodes)
        'company': '#06b6d4',      // cyan
        'regulation': '#4ade80',   // green
        'business_line': '#a78bfa', // purple
        'process': '#60a5fa',      // blue
        'business_term': '#fbbf24' // yellow
    };
    return colors[type] || '#9ca3af';
}

function getNodeRadius(type) {
    const sizes = {
        'party': 25,               // same size as company
        'company': 25,
        'regulation': 15,
        'business_line': 12,
        'process': 10,
        'business_term': 8
    };
    return sizes[type] || 10;
}

function truncateLabel(label, type) {
    const maxLength = (type === 'company' || type === 'party') ? 25 : 15;
    return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
}

function formatNodeType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatMetadataKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// NAVIGATION CONTROLS (Zoom, Pan, Center)
// ============================================================================

/**
 * Zoom in by 50%
 */
window.zoomIn = function() {
    if (window.graphSvg && window.graphZoom) {
        window.graphSvg.transition().duration(300).call(
            window.graphZoom.scaleBy, 1.5
        );
        console.log('🔍 Zoomed in');
    }
};

/**
 * Zoom out by 50%
 */
window.zoomOut = function() {
    if (window.graphSvg && window.graphZoom) {
        window.graphSvg.transition().duration(300).call(
            window.graphZoom.scaleBy, 0.67
        );
        console.log('🔍 Zoomed out');
    }
};

/**
 * Reset zoom to 100% and center view
 */
window.resetZoom = function() {
    if (window.graphSvg && window.graphZoom) {
        window.graphSvg.transition().duration(500).call(
            window.graphZoom.transform,
            d3.zoomIdentity
        );
        console.log('🔄 Reset zoom to 100%');
    }
};

/**
 * Center view on company node
 */
window.centerGraph = function() {
    if (!window.graphSvg || !window.graphZoom || !graphState.nodes.length) return;

    // Find company/party node (should be first node)
    const companyNode = graphState.nodes.find(n => n.type === 'company' || n.type === 'party') || graphState.nodes[0];

    if (!companyNode || !companyNode.x || !companyNode.y) {
        console.warn('⚠️ Company node position not available yet');
        return;
    }

    const container = document.getElementById('graph-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Calculate transform to center on company node
    const scale = 1.2; // Slight zoom in
    const x = width / 2 - companyNode.x * scale;
    const y = height / 2 - companyNode.y * scale;

    window.graphSvg.transition().duration(750).call(
        window.graphZoom.transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
    );

    console.log('🎯 Centered on company node:', companyNode.label);
};

/**
 * Auto-center on company node after graph stabilizes
 */
function autoCenterOnCompany() {
    // Wait for simulation to stabilize
    setTimeout(() => {
        if (graphState.nodes.length > 0) {
            window.centerGraph();
        }
    }, 1000);
}

console.log('✅ Interactive KG Navigator loaded (Version B)');

} // End of if (!window.interactiveKGLoaded)

/**
 * Export Knowledge Graph to Excel with multiple tabs for each KME type
 * Ready for import into Collibra, Alation, Informatica, Atlan, etc.
 */
window.exportKnowledgeGraphToExcel = async function() {
    console.log('📊 Starting Knowledge Graph Excel export...');
    console.log('🔍 XLSX library available:', typeof XLSX !== 'undefined');
    console.log('🔍 Graph state:', window.graphState);
    console.log('🔍 Nodes:', window.graphState?.nodes?.length || 0);
    console.log('🔍 Links:', window.graphState?.links?.length || 0);

    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please refresh the page.');
        }

        // Check if graph state exists
        if (!window.graphState || !window.graphState.nodes || window.graphState.nodes.length === 0) {
            throw new Error('No knowledge graph data to export. Please complete the wizard first.');
        }

        // Use local reference for convenience
        const graphState = window.graphState;

        // Show loading state on button
        const exportBtn = document.getElementById('export-kg-btn');
        const originalHTML = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
        exportBtn.disabled = true;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // ========================================
        // TAB 1: SUMMARY - KG Overview
        // ========================================
        const summaryData = [
            ['Knowledge Graph Export Summary'],
            ['Generated by Kaimak - AI-Powered Data Governance Accelerator'],
            ['Export Date', new Date().toISOString()],
            [''],
            ['Graph Statistics'],
            ['Total Nodes', graphState.nodes.length],
            ['Total Edges', graphState.links.length],
            [''],
            ['Node Type Breakdown'],
            ['Party/Company', graphState.nodes.filter(n => n.type === 'party' || n.type === 'company').length],
            ['Regulations', graphState.nodes.filter(n => n.type === 'regulation').length],
            ['Business Terms', graphState.nodes.filter(n => n.type === 'business_term').length],
            ['Business Lines', graphState.nodes.filter(n => n.type === 'business_line').length],
            ['Processes', graphState.nodes.filter(n => n.type === 'process').length],
            [''],
            ['Ready for Import Into'],
            ['✓ Collibra Data Intelligence Cloud'],
            ['✓ Alation Data Catalog'],
            ['✓ Informatica Enterprise Data Catalog'],
            ['✓ Atlan Active Metadata Platform'],
            ['✓ Any AMDR-compliant system']
        ];

        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Set column widths for summary
        summaryWS['!cols'] = [
            { wch: 30 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

        // ========================================
        // TAB 2: PARTY METADATA (AMDR Format)
        // ========================================
        const partyNodes = graphState.nodes.filter(n => n.type === 'party' || n.type === 'company');
        
        if (partyNodes.length > 0) {
            const partyRows = [];
            
            // Header row with all AMDR fields
            partyRows.push([
                'PARTY_NAME',
                'PARTY_IDENTIFIER',
                'PARTY_TYPE',
                'DESCRIPTION',
                'PARTY_ROLE_TYPE',
                'INDUSTRY_SECTOR',
                'SUB_SECTOR',
                'CONTACT_PERSON_NAME',
                'CONTACT_EMAIL',
                'CONTACT_PHONE',
                'DATA_STEWARD',
                'HQ_LOCATION',
                'JURISDICTION',
                'OPERATING_COUNTRIES',
                'DUE_DILIGENCE_STATUS',
                'DUE_DILIGENCE_DATE',
                'RISK_RATING',
                'CERTIFICATIONS',
                'REGULATORY_AUTHORIZATIONS',
                'RELATIONSHIP_TYPE',
                'RELATIONSHIP_START_DATE',
                'CONTRACT_RENEWAL_DATE',
                'ANNUAL_REVENUE',
                'EMPLOYEE_COUNT',
                'PUBLIC_PRIVATE',
                'STOCK_EXCHANGE',
                'ASSET_STATUS',
                'CLASS',
                'SUBCLASS',
                'UID',
                'TAGS',
                'ENRICHED',
                'ENRICHMENT_MODEL'
            ]);

            // Data rows
            for (const node of partyNodes) {
                const pm = node.metadata?.party_metadata || {};
                
                partyRows.push([
                    pm.PARTY_NAME || node.label || '',
                    pm.PARTY_IDENTIFIER || '',
                    pm.PARTY_TYPE || 'Company',
                    pm.DESCRIPTION || node.metadata?.description || '',
                    pm.PARTY_ROLE_TYPE || '',
                    pm.INDUSTRY_SECTOR || node.metadata?.industry || '',
                    pm.SUB_SECTOR || '',
                    pm.CONTACT_PERSON_NAME || '',
                    pm.CONTACT_EMAIL || '',
                    pm.CONTACT_PHONE || '',
                    pm.DATA_STEWARD || '',
                    pm.HQ_LOCATION || node.metadata?.hq_location || '',
                    pm.JURISDICTION || '',
                    Array.isArray(pm.OPERATING_COUNTRIES) ? pm.OPERATING_COUNTRIES.join('; ') : '',
                    pm.DUE_DILIGENCE_STATUS || '',
                    pm.DUE_DILIGENCE_DATE || '',
                    pm.RISK_RATING || '',
                    Array.isArray(pm.CERTIFICATIONS) ? pm.CERTIFICATIONS.join('; ') : '',
                    Array.isArray(pm.REGULATORY_AUTHORIZATIONS) ? pm.REGULATORY_AUTHORIZATIONS.join('; ') : '',
                    pm.RELATIONSHIP_TYPE || '',
                    pm.RELATIONSHIP_START_DATE || '',
                    pm.CONTRACT_RENEWAL_DATE || '',
                    pm.ANNUAL_REVENUE || '',
                    pm.EMPLOYEE_COUNT || '',
                    pm.PUBLIC_PRIVATE || '',
                    pm.STOCK_EXCHANGE || '',
                    pm.ASSET_STATUS || 'Draft',
                    pm.CLASS || 'Party',
                    pm.SUBCLASS || 'Organization',
                    pm.UID || 'Party_Organization_' + (node.label?.replace(/\s/g, '_') || ''),
                    pm.TAGS || '',
                    node.metadata?.enriched ? 'Yes' : 'No',
                    pm.enrichment_model || ''
                ]);
            }

            const partyWS = XLSX.utils.aoa_to_sheet(partyRows);
            
            // Set column widths
            partyWS['!cols'] = Array(33).fill({ wch: 20 });
            
            XLSX.utils.book_append_sheet(wb, partyWS, 'Party Metadata');
        }

        // ========================================
        // TAB 3: REGULATION METADATA (AMDR Format)
        // ========================================
        const regulationNodes = graphState.nodes.filter(n => n.type === 'regulation');
        
        if (regulationNodes.length > 0) {
            const regRows = [];
            
            // Header row
            regRows.push([
                'REGULATION_NAME',
                'REGULATION_CODE',
                'DESCRIPTION',
                'REGULATION_TYPE',
                'ISSUING_AUTHORITY',
                'JURISDICTION',
                'EFFECTIVE_DATE',
                'LAST_AMENDED_DATE',
                'COMPLIANCE_STATUS',
                'APPLICABILITY',
                'ENFORCEMENT_MECHANISM',
                'PENALTIES',
                'RELATED_REGULATIONS',
                'ASSET_STATUS',
                'CLASS',
                'SUBCLASS',
                'UID',
                'TAGS',
                'ENRICHED',
                'ENRICHMENT_MODEL',
                'OFFICIAL_URL'
            ]);

            // Data rows
            for (const node of regulationNodes) {
                const rm = node.metadata?.regulation_metadata || node.metadata || {};
                
                regRows.push([
                    rm.REGULATION_NAME || node.label || '',
                    rm.REGULATION_CODE || rm.code || '',
                    rm.DESCRIPTION || rm.description || '',
                    rm.REGULATION_TYPE || rm.type || '',
                    rm.ISSUING_AUTHORITY || rm.issuing_authority || '',
                    rm.JURISDICTION || rm.jurisdiction || '',
                    rm.EFFECTIVE_DATE || rm.effective_date || '',
                    rm.LAST_AMENDED_DATE || rm.last_amended || '',
                    rm.COMPLIANCE_STATUS || rm.compliance_status || '',
                    rm.APPLICABILITY || rm.applicability || '',
                    rm.ENFORCEMENT_MECHANISM || '',
                    rm.PENALTIES || '',
                    Array.isArray(rm.RELATED_REGULATIONS) ? rm.RELATED_REGULATIONS.join('; ') : '',
                    rm.ASSET_STATUS || 'Draft',
                    rm.CLASS || 'Regulation',
                    rm.SUBCLASS || 'Compliance',
                    rm.UID || 'Regulation_' + (node.label?.replace(/\s/g, '_') || ''),
                    rm.TAGS || rm.tags || '',
                    node.metadata?.enriched ? 'Yes' : 'No',
                    rm.enrichment_model || '',
                    rm.official_url || ''
                ]);
            }

            const regWS = XLSX.utils.aoa_to_sheet(regRows);
            regWS['!cols'] = Array(21).fill({ wch: 20 });
            
            XLSX.utils.book_append_sheet(wb, regWS, 'Regulation Metadata');
        }

        // ========================================
        // TAB 4: BUSINESS TERM METADATA (AMDR Format)
        // ========================================
        const termNodes = graphState.nodes.filter(n => n.type === 'business_term');
        
        if (termNodes.length > 0) {
            const termRows = [];
            
            // Header row
            termRows.push([
                'TERM_NAME',
                'DEFINITION',
                'BUSINESS_DEFINITION',
                'TECHNICAL_DEFINITION',
                'TERM_TYPE',
                'DOMAIN',
                'SUB_DOMAIN',
                'SYNONYMS',
                'ABBREVIATIONS',
                'RELATED_TERMS',
                'DATA_STEWARD',
                'BUSINESS_OWNER',
                'REGULATORY_REFERENCE',
                'USAGE_CONTEXT',
                'EXAMPLES',
                'CALCULATION_LOGIC',
                'DATA_TYPE',
                'ALLOWED_VALUES',
                'ASSET_STATUS',
                'CLASS',
                'SUBCLASS',
                'UID',
                'TAGS',
                'ENRICHED',
                'ENRICHMENT_MODEL'
            ]);

            // Data rows
            for (const node of termNodes) {
                const tm = node.metadata?.term_metadata || node.metadata || {};
                
                termRows.push([
                    tm.TERM_NAME || node.label || '',
                    tm.DEFINITION || tm.definition || '',
                    tm.BUSINESS_DEFINITION || '',
                    tm.TECHNICAL_DEFINITION || '',
                    tm.TERM_TYPE || tm.type || '',
                    tm.DOMAIN || tm.domain || '',
                    tm.SUB_DOMAIN || '',
                    Array.isArray(tm.SYNONYMS) ? tm.SYNONYMS.join('; ') : (tm.synonyms || ''),
                    Array.isArray(tm.ABBREVIATIONS) ? tm.ABBREVIATIONS.join('; ') : '',
                    Array.isArray(tm.RELATED_TERMS) ? tm.RELATED_TERMS.join('; ') : '',
                    tm.DATA_STEWARD || '',
                    tm.BUSINESS_OWNER || '',
                    tm.REGULATORY_REFERENCE || tm.regulation || '',
                    tm.USAGE_CONTEXT || tm.context || '',
                    tm.EXAMPLES || '',
                    tm.CALCULATION_LOGIC || '',
                    tm.DATA_TYPE || '',
                    tm.ALLOWED_VALUES || '',
                    tm.ASSET_STATUS || 'Draft',
                    tm.CLASS || 'Business Term',
                    tm.SUBCLASS || 'Glossary',
                    tm.UID || 'BusinessTerm_' + (node.label?.replace(/\s/g, '_') || ''),
                    tm.TAGS || tm.tags || '',
                    node.metadata?.enriched ? 'Yes' : 'No',
                    tm.enrichment_model || ''
                ]);
            }

            const termWS = XLSX.utils.aoa_to_sheet(termRows);
            termWS['!cols'] = Array(25).fill({ wch: 20 });
            
            XLSX.utils.book_append_sheet(wb, termWS, 'Business Term Metadata');
        }

        // ========================================
        // TAB 5: BUSINESS LINES
        // ========================================
        const lineNodes = graphState.nodes.filter(n => n.type === 'business_line');
        
        if (lineNodes.length > 0) {
            const lineRows = [];
            
            lineRows.push([
                'BUSINESS_LINE_NAME',
                'DESCRIPTION',
                'PARENT_ORGANIZATION',
                'ASSET_STATUS',
                'CLASS',
                'UID'
            ]);

            for (const node of lineNodes) {
                lineRows.push([
                    node.label || '',
                    node.metadata?.description || '',
                    graphState.nodes.find(n => n.type === 'party' || n.type === 'company')?.label || '',
                    'Draft',
                    'Business Line',
                    'BusinessLine_' + (node.label?.replace(/\s/g, '_') || '')
                ]);
            }

            const lineWS = XLSX.utils.aoa_to_sheet(lineRows);
            lineWS['!cols'] = Array(6).fill({ wch: 25 });
            
            XLSX.utils.book_append_sheet(wb, lineWS, 'Business Lines');
        }

        // ========================================
        // TAB 6: PROCESSES
        // ========================================
        const processNodes = graphState.nodes.filter(n => n.type === 'process');
        
        if (processNodes.length > 0) {
            const processRows = [];
            
            processRows.push([
                'PROCESS_NAME',
                'DESCRIPTION',
                'PARENT_BUSINESS_LINE',
                'ASSET_STATUS',
                'CLASS',
                'UID'
            ]);

            for (const node of processNodes) {
                processRows.push([
                    node.label || '',
                    node.metadata?.description || '',
                    '', // Could infer from graph relationships
                    'Draft',
                    'Process',
                    'Process_' + (node.label?.replace(/\s/g, '_') || '')
                ]);
            }

            const processWS = XLSX.utils.aoa_to_sheet(processRows);
            processWS['!cols'] = Array(6).fill({ wch: 25 });
            
            XLSX.utils.book_append_sheet(wb, processWS, 'Processes');
        }

        // ========================================
        // TAB 7: RELATIONSHIPS (Graph Edges)
        // ========================================
        if (graphState.links.length > 0) {
            const relRows = [];
            
            relRows.push([
                'SOURCE_NODE',
                'SOURCE_TYPE',
                'TARGET_NODE',
                'TARGET_TYPE',
                'RELATIONSHIP_TYPE',
                'RELATIONSHIP_STRENGTH'
            ]);

            for (const link of graphState.links) {
                const source = typeof link.source === 'object' ? link.source : graphState.nodes.find(n => n.id === link.source);
                const target = typeof link.target === 'object' ? link.target : graphState.nodes.find(n => n.id === link.target);
                
                relRows.push([
                    source?.label || link.source || '',
                    source?.type || '',
                    target?.label || link.target || '',
                    target?.type || '',
                    link.type || 'related_to',
                    link.value || 1
                ]);
            }

            const relWS = XLSX.utils.aoa_to_sheet(relRows);
            relWS['!cols'] = Array(6).fill({ wch: 20 });
            
            XLSX.utils.book_append_sheet(wb, relWS, 'Relationships');
        }

        // ========================================
        // Generate filename with timestamp
        // ========================================
        const companyName = graphState.nodes.find(n => n.type === 'party' || n.type === 'company')?.label || 'KnowledgeGraph';
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = companyName.replace(/\s/g, '_') + '_KG_Export_' + timestamp + '.xlsx';

        // ========================================
        // Write and download file
        // ========================================
        XLSX.writeFile(wb, filename);

        // Restore button state
        exportBtn.innerHTML = originalHTML;
        exportBtn.disabled = false;

        console.log('✅ Knowledge Graph exported to ' + filename);

        // Show success message
        alert('✅ Knowledge Graph exported successfully!\n\nFile: ' + filename + '\n\nTabs included:\n• Summary\n• Party Metadata (AMDR)\n• Regulation Metadata (AMDR)\n• Business Term Metadata (AMDR)\n• Business Lines\n• Processes\n• Relationships\n\nReady for import into:\n✓ Collibra\n✓ Alation\n✓ Informatica\n✓ Atlan\n✓ Ataccama');

    } catch (error) {
        console.error('❌ Export failed:', error);
        alert('Export failed. Please check the console for details.');
        
        // Restore button
        const exportBtn = document.getElementById('export-kg-btn');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-file-excel text-lg"></i><span>Export to Excel</span>';
            exportBtn.disabled = false;
        }
    }
};
