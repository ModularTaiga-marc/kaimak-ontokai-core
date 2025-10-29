# Alation Integration Guide

Import Ontokai ontologies into **Alation Data Catalog** to create a unified business glossary with regulatory lineage.

---

## 🎯 What You'll Achieve

- Import business terms from ontology into Alation
- Create custom fields for regulatory metadata
- Establish relationships between terms and data sources
- Link terms to compliance requirements

---

## 📋 Prerequisites

- Alation instance (Cloud or On-Premise)
- API access token with Catalog Admin permissions
- Python 3.8+ with `requests` library
- Ontokai ontology JSON file

---

## 🔑 Step 1: Generate API Token

1. Log into Alation
2. Navigate to **Settings → API Access Tokens**
3. Click **Create Token**
4. Set permissions: `Catalog Admin`, `Compose`
5. Copy the token (you won't see it again)

---

## 🚀 Step 2: Import Script

### Installation

```bash
pip install requests python-dotenv
```

### Create `.env` file

```env
ALATION_URL=https://your-instance.alation.com
ALATION_API_TOKEN=your_api_token_here
ALATION_CATALOG_ID=1  # Your business glossary catalog ID
```

### Import Script: `alation_import.py`

```python
#!/usr/bin/env python3
"""
Alation Ontology Importer
Import Ontokai ontologies into Alation Data Catalog
"""

import json
import os
import requests
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

# Configuration
ALATION_URL = os.getenv("ALATION_URL")
API_TOKEN = os.getenv("ALATION_API_TOKEN")
CATALOG_ID = int(os.getenv("ALATION_CATALOG_ID", "1"))

# API headers
HEADERS = {
    "token": API_TOKEN,
    "Content-Type": "application/json"
}


def create_custom_field(field_name: str, field_type: str, description: str) -> Dict:
    """Create custom field in Alation for regulatory metadata"""

    payload = {
        "name": field_name,
        "field_type": field_type,
        "description": description,
        "backref_name": f"{field_name.lower().replace(' ', '_')}_backref"
    }

    response = requests.post(
        f"{ALATION_URL}/integration/v1/custom_field/",
        headers=HEADERS,
        json=payload
    )

    if response.status_code in [200, 201]:
        print(f"✅ Created custom field: {field_name}")
        return response.json()
    else:
        print(f"⚠️  Field may already exist: {field_name}")
        return {}


def setup_custom_fields():
    """Create custom fields for regulatory metadata"""

    fields = [
        ("Source Regulation", "PICKER", "Regulation where term is defined"),
        ("Source Article", "RICH_TEXT", "Specific article or section reference"),
        ("Compliance Category", "PICKER", "Type of compliance requirement"),
        ("Risk Level", "PICKER", "Risk classification (Low/Medium/High/Critical)"),
    ]

    print("📝 Setting up custom fields...")
    for name, field_type, desc in fields:
        create_custom_field(name, field_type, desc)


def create_glossary_term(term: Dict, regulation_name: str) -> Dict:
    """Create or update business term in Alation glossary"""

    # Build term payload
    payload = {
        "title": term["name"],
        "description": term["definition"],
        "template_id": 9,  # Business Term template
        "custom_fields": [
            {
                "field_id": "source_regulation",
                "value": regulation_name
            },
            {
                "field_id": "source_article",
                "value": term.get("source_article", "")
            }
        ]
    }

    # Add short name if present
    if term.get("short_name"):
        payload["description"] = f"**{term['short_name']}**: {term['definition']}"

    # Add examples if present
    if term.get("examples"):
        examples_text = "\n\n**Examples:**\n" + "\n".join(f"- {ex}" for ex in term["examples"])
        payload["description"] += examples_text

    # Create term
    response = requests.post(
        f"{ALATION_URL}/integration/v2/term/",
        headers=HEADERS,
        json=payload
    )

    if response.status_code in [200, 201]:
        term_data = response.json()
        print(f"✅ Created term: {term['name']}")
        return term_data
    else:
        print(f"❌ Failed to create term: {term['name']}")
        print(f"   Error: {response.text}")
        return {}


def create_term_relationships(ontology: Dict, term_map: Dict):
    """Create relationships between related terms"""

    print("🔗 Creating term relationships...")

    for term in ontology["business_terms"]:
        if not term.get("related_terms"):
            continue

        source_id = term_map.get(term["id"])
        if not source_id:
            continue

        for related_id in term["related_terms"]:
            target_id = term_map.get(related_id)
            if not target_id:
                continue

            # Create relationship
            payload = {
                "source_id": source_id,
                "target_id": target_id,
                "relationship_type": "RELATES_TO"
            }

            response = requests.post(
                f"{ALATION_URL}/integration/v1/relationship/",
                headers=HEADERS,
                json=payload
            )

            if response.status_code in [200, 201]:
                print(f"✅ Linked: {term['name']} → {related_id}")


def create_data_steward(process: Dict) -> Dict:
    """Create stewardship assignment for business process"""

    payload = {
        "otype": "attribute",
        "oid": process["id"],
        "steward_id": process.get("owner", "Data Protection Officer")
    }

    response = requests.post(
        f"{ALATION_URL}/integration/v1/steward/",
        headers=HEADERS,
        json=payload
    )

    return response.json() if response.status_code in [200, 201] else {}


def import_ontology(ontology_path: str):
    """Main import function"""

    print(f"📖 Loading ontology from {ontology_path}")
    with open(ontology_path, 'r') as f:
        ontology = json.load(f)

    company = ontology["metadata"]["company"]
    print(f"🏢 Importing ontology for: {company}")

    # Setup custom fields
    setup_custom_fields()

    # Create regulation lookup
    regulation_map = {
        reg["id"]: reg["short_name"] or reg["name"]
        for reg in ontology["regulations"]
    }

    # Import business terms
    print("\n📚 Importing business terms...")
    term_map = {}  # Maps term IDs to Alation IDs

    for term in ontology["business_terms"]:
        regulation_name = regulation_map.get(term["source_regulation"], "Unknown")
        alation_term = create_glossary_term(term, regulation_name)

        if alation_term:
            term_map[term["id"]] = alation_term.get("id")

    # Create relationships
    create_term_relationships(ontology, term_map)

    # Assign stewards for processes
    print("\n👥 Assigning data stewards...")
    for process in ontology["business_processes"]:
        create_data_steward(process)

    print(f"\n✅ Import complete!")
    print(f"📊 Imported {len(term_map)} terms from {len(regulation_map)} regulations")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python alation_import.py <ontology.json>")
        sys.exit(1)

    ontology_file = sys.argv[1]

    if not os.path.exists(ontology_file):
        print(f"❌ File not found: {ontology_file}")
        sys.exit(1)

    import_ontology(ontology_file)
```

---

## 📊 Step 3: Run Import

```bash
python alation_import.py acme-insurance-ontology.json
```

**Expected output:**
```
📖 Loading ontology from acme-insurance-ontology.json
🏢 Importing ontology for: Acme Insurance
📝 Setting up custom fields...
✅ Created custom field: Source Regulation
✅ Created custom field: Source Article
✅ Created custom field: Compliance Category
✅ Created custom field: Risk Level

📚 Importing business terms...
✅ Created term: Personal Data
✅ Created term: Data Subject Rights
✅ Created term: Consent Management
✅ Created term: Solvency Capital Requirement
✅ Created term: Own Funds
✅ Created term: ORSA

🔗 Creating term relationships...
✅ Linked: Personal Data → Data Subject
✅ Linked: Personal Data → Processing

👥 Assigning data stewards...
✅ Assigned: Data Protection Officer

✅ Import complete!
📊 Imported 6 terms from 2 regulations
```

---

## 🔧 Step 4: Configure in Alation UI

### 4.1 Create Article Templates

1. Go to **Catalog → Article Templates**
2. Create template: "Regulatory Requirement"
3. Add fields:
   - Regulation Name
   - Article/Section
   - Description
   - Related Terms (reference field)
   - Compliance Deadline

### 4.2 Set Up Queries

Create saved queries to explore ontology:

```sql
-- Find all GDPR-related terms
SELECT
    term.title,
    term.description,
    term.source_regulation
FROM catalog.glossary_term term
WHERE term.source_regulation = 'GDPR';

-- Find terms without data stewards
SELECT
    term.title,
    term.source_regulation
FROM catalog.glossary_term term
LEFT JOIN catalog.steward s ON term.id = s.object_id
WHERE s.steward_id IS NULL;
```

### 4.3 Create Dashboards

1. Navigate to **Compose → Create Dashboard**
2. Add widgets:
   - **Terms by Regulation** (pie chart)
   - **Compliance Coverage** (progress bar)
   - **Stewardship Assignments** (table)
   - **Recent Changes** (activity feed)

---

## 🔄 Step 5: Incremental Updates

To update existing terms:

```python
def update_term(term_id: int, updates: Dict):
    """Update existing term in Alation"""

    response = requests.put(
        f"{ALATION_URL}/integration/v2/term/{term_id}/",
        headers=HEADERS,
        json=updates
    )

    return response.json() if response.status_code == 200 else {}

# Example: Update term definition
update_term(
    term_id=12345,
    updates={
        "description": "Updated definition with more context...",
        "custom_fields": [
            {"field_id": "risk_level", "value": "High"}
        ]
    }
)
```

---

## 🎨 Advanced Features

### Link Terms to Data Sources

```python
def link_term_to_column(term_id: int, schema_id: int, table_id: int, column_id: int):
    """Link business term to database column"""

    payload = {
        "term_id": term_id,
        "object_type": "attribute",
        "object_id": column_id
    }

    response = requests.post(
        f"{ALATION_URL}/integration/v1/term_assignment/",
        headers=HEADERS,
        json=payload
    )

    return response.json()

# Example: Link "Personal Data" term to customer table columns
link_term_to_column(
    term_id=12345,
    schema_id=1,
    table_id=100,
    column_id=1001  # customer.email column
)
```

### Bulk Operations

```python
def bulk_import_terms(terms: List[Dict]) -> Dict:
    """Bulk import multiple terms at once"""

    payload = {
        "terms": [
            {
                "title": term["name"],
                "description": term["definition"],
                "template_id": 9
            }
            for term in terms
        ]
    }

    response = requests.post(
        f"{ALATION_URL}/integration/v2/term/bulk/",
        headers=HEADERS,
        json=payload
    )

    return response.json()
```

---

## 📈 Best Practices

1. **Version Control**: Tag ontology imports with version numbers
2. **Validation**: Test imports in sandbox environment first
3. **Stewardship**: Assign owners before making terms public
4. **Lineage**: Connect terms to actual data sources
5. **Documentation**: Add rich descriptions with examples
6. **Monitoring**: Set up alerts for term updates

---

## 🔗 Resources

- [Alation API Documentation](https://developer.alation.com/)
- [Custom Fields Guide](https://developer.alation.com/dev/docs/custom-fields-overview)
- [Bulk Import Best Practices](https://developer.alation.com/dev/docs/bulk-import)
- [OntoKai Schema](../data-schemas/ontology-schema.json)

---

## 🐛 Troubleshooting

### Authentication Failed
```
Error 401: Unauthorized
```
**Solution**: Regenerate API token with correct permissions (Catalog Admin, Compose)

### Custom Field Not Found
```
Error: field_id 'source_regulation' does not exist
```
**Solution**: Run `setup_custom_fields()` first or create fields manually in UI

### Duplicate Terms
```
Error: Term with title 'Personal Data' already exists
```
**Solution**: Use PUT request to update instead of POST to create

### Rate Limiting
```
Error 429: Too Many Requests
```
**Solution**: Add delays between API calls:
```python
import time
time.sleep(0.5)  # 500ms between requests
```

---

## 💡 Next Steps

- Connect terms to your data sources (databases, files, BI tools)
- Set up data quality rules based on regulatory requirements
- Create compliance dashboards showing term coverage
- Configure workflows for term approval and governance

---

**Need help?** Contact [Modular Taiga](https://modulartaiga.com) for professional services.
