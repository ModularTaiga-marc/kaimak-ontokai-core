# Atlan Integration Guide

Import Ontokai ontologies into **Atlan** to create a modern, collaborative business glossary with regulatory context.

---

## 🎯 What You'll Achieve

- Import business terms with full metadata
- Create custom metadata for regulatory attributes
- Link terms to data assets automatically
- Enable collaborative governance workflows

---

## 📋 Prerequisites

- Atlan workspace (Cloud)
- API token with Admin permissions
- Python 3.8+ with `requests` library
- Ontokai ontology JSON file

---

## 🔑 Step 1: Generate API Token

1. Log into your Atlan workspace
2. Click your profile (bottom left) → **Settings**
3. Navigate to **API Tokens** section
4. Click **Create New Token**
5. Set permissions: `Admin` or `Glossary Manager`
6. Copy the token (won't be shown again)

---

## 🚀 Step 2: Import Script

### Installation

```bash
pip install requests python-dotenv
```

### Create `.env` file

```env
ATLAN_BASE_URL=https://your-workspace.atlan.com
ATLAN_API_TOKEN=your_api_token_here
ATLAN_GLOSSARY_GUID=your_glossary_guid  # Get from UI or API
```

### Import Script: `atlan_import.py`

```python
#!/usr/bin/env python3
"""
Atlan Ontology Importer
Import Ontokai ontologies into Atlan as business glossary
"""

import json
import os
import requests
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Configuration
ATLAN_URL = os.getenv("ATLAN_BASE_URL")
API_TOKEN = os.getenv("ATLAN_API_TOKEN")
GLOSSARY_GUID = os.getenv("ATLAN_GLOSSARY_GUID")

# API headers
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}


class AtlanClient:
    """Client for Atlan REST API"""

    def __init__(self):
        self.base_url = ATLAN_URL
        self.headers = HEADERS
        self.glossary_guid = GLOSSARY_GUID

    def get_or_create_glossary(self, name: str = "Regulatory Ontology") -> str:
        """Get existing glossary or create new one"""

        # Search for existing glossary
        search_payload = {
            "dsl": {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"__typeName": "AtlasGlossary"}},
                            {"term": {"name": name}}
                        ]
                    }
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/api/meta/search/indexsearch",
            json=search_payload,
            headers=self.headers
        )

        if response.status_code == 200:
            results = response.json()
            if results.get("entities"):
                guid = results["entities"][0]["guid"]
                print(f"✅ Using existing glossary: {name} ({guid})")
                return guid

        # Create new glossary
        glossary_payload = {
            "entity": {
                "typeName": "AtlasGlossary",
                "attributes": {
                    "name": name,
                    "shortDescription": "Business glossary generated from regulatory ontology",
                    "longDescription": "Terms and definitions derived from applicable regulations using Ontokai"
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/api/meta/entity",
            json=glossary_payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            guid = response.json()["guidAssignments"]["-1"]
            print(f"✅ Created new glossary: {name} ({guid})")
            return guid
        else:
            raise Exception(f"Failed to create glossary: {response.text}")

    def create_custom_metadata(self):
        """Create custom metadata attributes for regulatory info"""

        custom_attributes = [
            {
                "name": "ontokai_source_regulation",
                "displayName": "Source Regulation",
                "typeName": "string",
                "isOptional": True,
                "cardinality": "SINGLE",
                "options": {
                    "customType": "regulatory"
                }
            },
            {
                "name": "ontokai_source_article",
                "displayName": "Source Article",
                "typeName": "string",
                "isOptional": True,
                "cardinality": "SINGLE"
            },
            {
                "name": "ontokai_compliance_category",
                "displayName": "Compliance Category",
                "typeName": "string",
                "isOptional": True,
                "cardinality": "SINGLE",
                "options": {
                    "enum": ["Data Privacy", "Risk Management", "Financial Reporting", "Security", "Other"]
                }
            },
            {
                "name": "ontokai_risk_level",
                "displayName": "Risk Level",
                "typeName": "string",
                "isOptional": True,
                "cardinality": "SINGLE",
                "options": {
                    "enum": ["Low", "Medium", "High", "Critical"]
                }
            }
        ]

        print("📝 Setting up custom metadata...")

        # Create custom metadata typedef
        typedef_payload = {
            "businessMetadataDefs": [
                {
                    "name": "OntoKai_Regulatory_Metadata",
                    "displayName": "OntoKai Regulatory Metadata",
                    "description": "Metadata from Ontokai regulatory ontologies",
                    "attributeDefs": custom_attributes
                }
            ]
        }

        response = requests.post(
            f"{self.base_url}/api/meta/types/typedefs",
            json=typedef_payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            print("✅ Created custom metadata typedef")
        else:
            print(f"⚠️  Custom metadata may already exist: {response.status_code}")

    def create_glossary_term(self, term: Dict, regulation: str, glossary_guid: str) -> Optional[Dict]:
        """Create business term in Atlan glossary"""

        # Build term payload
        attributes = {
            "name": term["name"],
            "anchor": {"guid": glossary_guid},
            "shortDescription": term["definition"][:250],  # Atlan has 250 char limit for short desc
            "longDescription": term["definition"]
        }

        # Add short name to description if present
        if term.get("short_name"):
            attributes["abbreviation"] = term["short_name"]

        # Add examples to long description
        if term.get("examples"):
            examples_md = "\n\n**Examples:**\n" + "\n".join(f"- {ex}" for ex in term["examples"])
            attributes["longDescription"] += examples_md

        # Build custom metadata
        business_attributes = {
            "OntoKai_Regulatory_Metadata": {
                "ontokai_source_regulation": regulation,
                "ontokai_source_article": term.get("source_article", ""),
                "ontokai_compliance_category": self._infer_category(term["name"])
            }
        }

        payload = {
            "entity": {
                "typeName": "AtlasGlossaryTerm",
                "attributes": attributes,
                "businessAttributes": business_attributes
            }
        }

        response = requests.post(
            f"{self.base_url}/api/meta/entity",
            json=payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            result = response.json()
            guid = result.get("guidAssignments", {}).get("-1")
            print(f"✅ Created term: {term['name']}")
            return {"guid": guid, "name": term["name"]}
        else:
            print(f"❌ Failed to create term: {term['name']}")
            print(f"   Error: {response.text}")
            return None

    def _infer_category(self, term_name: str) -> str:
        """Infer compliance category from term name"""
        name_lower = term_name.lower()

        if any(kw in name_lower for kw in ["data", "privacy", "consent", "subject"]):
            return "Data Privacy"
        elif any(kw in name_lower for kw in ["risk", "capital", "solvency", "assessment"]):
            return "Risk Management"
        elif any(kw in name_lower for kw in ["reporting", "disclosure", "accounting"]):
            return "Financial Reporting"
        elif any(kw in name_lower for kw in ["security", "access", "authentication"]):
            return "Security"
        else:
            return "Other"

    def create_term_relationship(self, source_guid: str, target_guid: str, relationship_type: str = "seeAlso"):
        """Create relationship between glossary terms"""

        payload = {
            "typeName": "AtlasGlossarySemanticAssignment" if relationship_type == "seeAlso" else "AtlasGlossaryRelatedTerm",
            "end1": {"guid": source_guid},
            "end2": {"guid": target_guid}
        }

        response = requests.post(
            f"{self.base_url}/api/meta/relationship",
            json=payload,
            headers=self.headers
        )

        return response.status_code in [200, 201]

    def create_category(self, name: str, description: str, glossary_guid: str) -> Optional[str]:
        """Create glossary category for organizing terms"""

        payload = {
            "entity": {
                "typeName": "AtlasGlossaryCategory",
                "attributes": {
                    "name": name,
                    "shortDescription": description,
                    "anchor": {"guid": glossary_guid}
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/api/meta/entity",
            json=payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            guid = response.json().get("guidAssignments", {}).get("-1")
            print(f"✅ Created category: {name}")
            return guid
        else:
            print(f"⚠️  Category creation failed: {name}")
            return None

    def assign_term_to_category(self, term_guid: str, category_guid: str):
        """Assign term to a category"""

        payload = {
            "typeName": "AtlasGlossaryCategorization",
            "end1": {"guid": category_guid},
            "end2": {"guid": term_guid}
        }

        response = requests.post(
            f"{self.base_url}/api/meta/relationship",
            json=payload,
            headers=self.headers
        )

        return response.status_code in [200, 201]


def import_ontology(ontology_path: str):
    """Main import function"""

    print(f"📖 Loading ontology from {ontology_path}")
    with open(ontology_path, 'r') as f:
        ontology = json.load(f)

    company = ontology["metadata"]["company"]
    print(f"🏢 Importing ontology for: {company}\n")

    # Initialize client
    client = AtlanClient()

    # Get or create glossary
    if not client.glossary_guid:
        glossary_name = f"{company} Regulatory Glossary"
        client.glossary_guid = client.get_or_create_glossary(glossary_name)

    # Setup custom metadata
    client.create_custom_metadata()

    # Create categories for each regulation
    print("\n📂 Creating regulation categories...")
    category_map = {}
    for regulation in ontology["regulations"]:
        cat_name = regulation["short_name"] or regulation["name"]
        cat_desc = regulation["description"]
        cat_guid = client.create_category(cat_name, cat_desc, client.glossary_guid)
        if cat_guid:
            category_map[regulation["id"]] = cat_guid

    # Create regulation lookup
    regulation_map = {
        reg["id"]: reg["short_name"] or reg["name"]
        for reg in ontology["regulations"]
    }

    # Import business terms
    print("\n📚 Importing business terms...")
    term_map = {}  # Maps term IDs to Atlan GUIDs

    for term in ontology["business_terms"]:
        regulation_name = regulation_map.get(term["source_regulation"], "Unknown")
        atlan_term = client.create_glossary_term(term, regulation_name, client.glossary_guid)

        if atlan_term:
            term_guid = atlan_term["guid"]
            term_map[term["id"]] = term_guid

            # Assign to category
            cat_guid = category_map.get(term["source_regulation"])
            if cat_guid:
                client.assign_term_to_category(term_guid, cat_guid)

    # Create relationships between related terms
    print("\n🔗 Creating term relationships...")
    for term in ontology["business_terms"]:
        if not term.get("related_terms"):
            continue

        source_guid = term_map.get(term["id"])
        if not source_guid:
            continue

        for related_id in term["related_terms"]:
            target_guid = term_map.get(related_id)
            if target_guid and client.create_term_relationship(source_guid, target_guid):
                print(f"✅ Linked: {term['name']} → {related_id}")

    print(f"\n✅ Import complete!")
    print(f"📊 Imported {len(term_map)} terms from {len(regulation_map)} regulations")
    print(f"🔗 View in Atlan: {client.base_url}/glossary/{client.glossary_guid}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python atlan_import.py <ontology.json>")
        sys.exit(1)

    ontology_file = sys.argv[1]

    if not os.path.exists(ontology_file):
        print(f"❌ File not found: {ontology_file}")
        sys.exit(1)

    try:
        import_ontology(ontology_file)
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
```

---

## 📊 Step 3: Run Import

```bash
python atlan_import.py acme-insurance-ontology.json
```

**Expected output:**
```
📖 Loading ontology from acme-insurance-ontology.json
🏢 Importing ontology for: Acme Insurance

✅ Created new glossary: Acme Insurance Regulatory Glossary (abc-123-def-456)
📝 Setting up custom metadata...
✅ Created custom metadata typedef

📂 Creating regulation categories...
✅ Created category: GDPR
✅ Created category: Solvency II

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

✅ Import complete!
📊 Imported 6 terms from 2 regulations
🔗 View in Atlan: https://your-workspace.atlan.com/glossary/abc-123-def-456
```

---

## 🔧 Step 4: Link Terms to Assets

### Auto-Propagation via Atlan UI

1. Navigate to **Glossary → Your Regulatory Glossary**
2. Select a term (e.g., "Personal Data")
3. Click **Link Assets** tab
4. Use Atlan's AI-powered suggestions to auto-link columns
5. Review and approve suggestions

### Programmatic Linking

```python
def link_term_to_asset(client: AtlanClient, term_guid: str, asset_guid: str):
    """Link glossary term to data asset (table, column, etc.)"""

    payload = {
        "typeName": "AtlasGlossarySemanticAssignment",
        "end1": {"guid": term_guid, "typeName": "AtlasGlossaryTerm"},
        "end2": {"guid": asset_guid, "typeName": "Column"}  # or Table, Dashboard, etc.
    }

    response = requests.post(
        f"{client.base_url}/api/meta/relationship",
        json=payload,
        headers=client.headers
    )

    if response.status_code in [200, 201]:
        print(f"✅ Linked term to asset")
        return True
    else:
        print(f"❌ Failed to link: {response.text}")
        return False

# Example: Link "Personal Data" term to customer.email column
link_term_to_asset(
    client=client,
    term_guid="term-guid-123",
    asset_guid="column-guid-456"
)
```

### Bulk Asset Linking

```python
def bulk_link_terms_by_name_match(client: AtlanClient, term_map: Dict):
    """Auto-link terms to columns with matching names"""

    # Search for all columns
    search_payload = {
        "dsl": {
            "query": {"term": {"__typeName": "Column"}},
            "size": 10000
        }
    }

    response = requests.post(
        f"{client.base_url}/api/meta/search/indexsearch",
        json=search_payload,
        headers=client.headers
    )

    if response.status_code != 200:
        print("❌ Failed to search columns")
        return

    columns = response.json().get("entities", [])
    linked_count = 0

    for column in columns:
        column_name = column["attributes"]["name"].lower()
        column_guid = column["guid"]

        # Try to match term names
        for term_id, term_guid in term_map.items():
            term_name = term_id.replace("term_", "").replace("_", " ").lower()

            if term_name in column_name or column_name in term_name:
                if link_term_to_asset(client, term_guid, column_guid):
                    linked_count += 1
                    break

    print(f"✅ Auto-linked {linked_count} columns to terms")
```

---

## 🎨 Step 5: Customize in Atlan UI

### Create Readme Documents

1. Go to glossary term in Atlan
2. Click **Add Readme**
3. Use markdown to add:
   - Regulatory context
   - Compliance requirements
   - Usage examples
   - Related processes

### Set Up Playbooks

1. Navigate to **Governance → Playbooks**
2. Create playbook: "GDPR Term Approval"
3. Add steps:
   - Legal review
   - Business owner approval
   - Technical validation
4. Assign to all terms in GDPR category

### Configure Slack/Teams Notifications

1. Go to **Settings → Integrations**
2. Connect Slack or Microsoft Teams
3. Create notification rule:
   - Event: "Term linked to asset"
   - Channel: `#data-governance`
   - Message: Include term name and regulation

---

## 🔄 Advanced Features

### Lineage Tracking

```python
def create_downstream_lineage(client: AtlanClient, source_guid: str, target_guid: str):
    """Create data lineage relationship"""

    payload = {
        "typeName": "Process",
        "attributes": {
            "name": "Regulatory Term Usage",
            "inputs": [{"guid": source_guid}],
            "outputs": [{"guid": target_guid}]
        }
    }

    response = requests.post(
        f"{client.base_url}/api/meta/entity",
        json=payload,
        headers=client.headers
    )

    return response.status_code in [200, 201]
```

### Classifications (Tags)

```python
def apply_classification(client: AtlanClient, asset_guid: str, classification: str):
    """Apply Atlan classification (tag) to term or asset"""

    payload = {
        "classification": {
            "typeName": classification,  # e.g., "PII", "Confidential"
            "entityGuid": asset_guid
        }
    }

    response = requests.post(
        f"{client.base_url}/api/meta/entity/guid/{asset_guid}/classifications",
        json=payload,
        headers=client.headers
    )

    return response.status_code in [200, 204]

# Auto-tag based on term
for term in ontology["business_terms"]:
    if "personal" in term["name"].lower() or "data subject" in term["name"].lower():
        apply_classification(client, term_guid, "PII")
```

---

## 📈 Best Practices

1. **Start Small**: Import one regulation at a time for initial testing
2. **Use Categories**: Organize terms by regulation for easy navigation
3. **Enable Playbooks**: Set up approval workflows before making glossary public
4. **Auto-Propagation**: Let Atlan suggest asset links using AI
5. **Collaborative Editing**: Enable term owners to refine definitions
6. **Monitoring**: Set up Slack/Teams alerts for term changes
7. **Version Control**: Use Atlan's built-in versioning for term updates

---

## 🔗 Resources

- [Atlan API Documentation](https://developer.atlan.com/)
- [Glossary Management Guide](https://docs.atlan.com/glossary)
- [Custom Metadata Tutorial](https://docs.atlan.com/custom-metadata)
- [OntoKai Schema](../data-schemas/ontology-schema.json)

---

## 🐛 Troubleshooting

### Authentication Failed
```
Error 401: Unauthorized
```
**Solution**: Regenerate API token. Ensure it has `Admin` or `Glossary Manager` permissions.

### Glossary Not Found
```
Error 404: Glossary GUID not found
```
**Solution**:
1. Get glossary GUID from UI: Navigate to glossary → copy from URL
2. Or omit from `.env` to auto-create new glossary

### Custom Metadata Not Applied
```
Warning: businessAttributes not set
```
**Solution**: Ensure typedef is created first:
```python
client.create_custom_metadata()  # Run this before creating terms
```

### Rate Limiting
```
Error 429: Too many requests
```
**Solution**: Add rate limiting:
```python
import time
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=10, period=1)  # 10 calls per second
def create_term_with_limit(client, term, regulation, glossary_guid):
    return client.create_glossary_term(term, regulation, glossary_guid)
```

---

## 💡 Next Steps

- **Enable AI**: Use Atlan's AI features to auto-suggest term links
- **Set Up Playbooks**: Create approval workflows for new terms
- **Configure Notifications**: Alert stakeholders on term changes
- **Build Dashboards**: Create compliance coverage dashboards
- **Schedule Sync**: Set up regular ontology updates via cron/scheduler

---

**Professional Support**: [Modular Taiga](https://modulartaiga.com) offers Atlan implementation services.
