# Collibra Integration Guide

This guide shows how to import Ontokai-generated ontologies into Collibra Data Governance Center.

## Overview

Ontokai generates business ontologies that can be imported into Collibra as:
- **Business Terms** with definitions
- **Business Processes** with descriptions
- **Regulations** as assets
- **Relationships** between all elements

## Prerequisites

- Collibra DGC instance (v5.5+)
- API access with appropriate permissions
- Ontokai JSON export file

## Step 1: Export from Ontokai

From the Ontokai wizard results page:

```javascript
// Click "Export" button, select "Collibra JSON"
// This generates a file like: ontokai-export-collibra.json
```

## Step 2: Map to Collibra Asset Types

Ontokai concepts map to Collibra asset types:

| Ontokai | Collibra Asset Type | Domain |
|---------|-------------------|--------|
| Business Term | Business Term | Business Glossary |
| Business Process | Business Process | Business Process Model |
| Regulation | Policy | Policy Management |
| Line of Business | Organization | Organization Structure |

## Step 3: Import via Collibra API

### Using Python

```python
import requests
import json

# Configuration
COLLIBRA_URL = "https://your-instance.collibra.com"
API_KEY = "your-api-key"
COMMUNITY_ID = "your-community-id"

# Load Ontokai export
with open('ontokai-export-collibra.json', 'r') as f:
    ontology = json.load(f)

# Create Business Terms
for term in ontology['terms']:
    payload = {
        "name": term['name'],
        "displayName": term['name'],
        "typeId": "00000000-0000-0000-0000-000000031008",  # Business Term
        "domainId": "your-glossary-domain-id",
        "attributes": [
            {
                "typeId": "00000000-0000-0000-0000-000000000219",  # Definition
                "value": term['definition']
            },
            {
                "typeId": "00000000-0000-0000-0000-000000003114",  # Source
                "value": f"Regulation: {term['source_regulation']}"
            }
        ]
    }

    response = requests.post(
        f"{COLLIBRA_URL}/rest/2.0/assets",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload
    )

    print(f"Created term: {term['name']} - Status: {response.status_code}")

# Create Business Processes
for process in ontology['processes']:
    payload = {
        "name": process['name'],
        "displayName": process['name'],
        "typeId": "00000000-0000-0000-0000-000000031302",  # Business Process
        "domainId": "your-process-domain-id",
        "attributes": [
            {
                "typeId": "00000000-0000-0000-0000-000000000219",  # Description
                "value": process['description']
            }
        ]
    }

    response = requests.post(
        f"{COLLIBRA_URL}/rest/2.0/assets",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload
    )

    print(f"Created process: {process['name']} - Status: {response.status_code}")

# Create Relationships
for relation in ontology['relationships']:
    payload = {
        "sourceId": relation['source_id'],
        "targetId": relation['target_id'],
        "typeId": "00000000-0000-0000-0000-000000007021"  # "uses" relation
    }

    response = requests.post(
        f"{COLLIBRA_URL}/rest/2.0/relations",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload
    )

print("✅ Import complete!")
```

## Step 4: Verify Import

1. Log into Collibra DGC
2. Navigate to Business Glossary domain
3. Check that terms, processes, and relationships are present
4. Verify definitions and lineage

## Best Practices

- **Map first:** Create asset type and attribute mapping before import
- **Test small:** Import a subset first to verify mappings
- **Tag imports:** Use labels to track Ontokai-imported assets
- **Version control:** Keep export files for audit trail

## Troubleshooting

**Issue:** API authentication fails
- **Solution:** Verify API key has correct permissions

**Issue:** Asset types don't match
- **Solution:** Update `typeId` values to match your Collibra instance

**Issue:** Domain IDs incorrect
- **Solution:** Query `/rest/2.0/domains` to find correct IDs

## Advanced: Excel Upload Alternative

For non-API access:

1. Export Ontokai as CSV
2. Convert to Collibra Excel template format
3. Use Collibra's Excel import feature
4. Map columns to Collibra attributes

## Support

- **Ontokai:** https://ontokai.onrender.com
- **Collibra Docs:** https://university.collibra.com
- **Issues:** https://github.com/ModularTaiga-marc/kaimak-ontokai-core/issues

---

**Author:** Marc Rafael Lafuente
**Company:** Modular Taiga
**License:** MIT
