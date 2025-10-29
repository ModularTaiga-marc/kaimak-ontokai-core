# Informatica EDC Integration Guide

Import Ontokai ontologies into **Informatica Enterprise Data Catalog** to enrich metadata with regulatory business context.

---

## 🎯 What You'll Achieve

- Import business glossary from Ontokai ontology
- Link terms to Informatica data assets
- Create custom attributes for regulatory metadata
- Establish lineage between regulations and data

---

## 📋 Prerequisites

- Informatica EDC 10.5+ (Cloud or On-Premise)
- Administrator access with API permissions
- Python 3.8+ with `requests` library
- Ontokai ontology JSON file

---

## 🔑 Step 1: Generate API Credentials

### For Informatica Cloud (IDMC)

1. Log into Informatica Intelligent Data Management Cloud
2. Navigate to **Administrator → Security → API Access**
3. Create new **Service Account**:
   - Name: `ontokai-integration`
   - Permissions: `Catalog Administrator`
4. Generate API key and save credentials

### For On-Premise EDC

1. Log into EDC Administrator
2. Navigate to **Setup → Users and Permissions**
3. Create service account with REST API access
4. Note down username and password

---

## 🚀 Step 2: Import Script

### Installation

```bash
pip install requests python-dotenv xmltodict
```

### Create `.env` file

```env
# For Cloud (IDMC)
INFORMATICA_CLOUD_URL=https://dm-us.informaticacloud.com
INFORMATICA_USERNAME=your_username
INFORMATICA_PASSWORD=your_password

# For On-Premise
INFORMATICA_EDC_URL=https://edc.yourcompany.com:9085
INFORMATICA_API_KEY=your_api_key
```

### Import Script: `informatica_import.py`

```python
#!/usr/bin/env python3
"""
Informatica EDC Ontology Importer
Import Ontokai ontologies into Informatica Enterprise Data Catalog
"""

import json
import os
import requests
import base64
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Configuration
CLOUD_URL = os.getenv("INFORMATICA_CLOUD_URL")
EDC_URL = os.getenv("INFORMATICA_EDC_URL")
USERNAME = os.getenv("INFORMATICA_USERNAME")
PASSWORD = os.getenv("INFORMATICA_PASSWORD")
API_KEY = os.getenv("INFORMATICA_API_KEY")

# Determine if using Cloud or On-Premise
IS_CLOUD = bool(CLOUD_URL and USERNAME and PASSWORD)
BASE_URL = CLOUD_URL if IS_CLOUD else EDC_URL


class InformaticaClient:
    """Client for Informatica EDC REST API"""

    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self.headers = self._get_headers()
        self.session_token = None

        if IS_CLOUD:
            self._authenticate_cloud()
        else:
            self._authenticate_edc()

    def _get_headers(self) -> Dict:
        """Get base headers for API requests"""
        if IS_CLOUD:
            return {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        else:
            return {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "infa-api-key": API_KEY
            }

    def _authenticate_cloud(self):
        """Authenticate with Informatica Cloud"""
        payload = {
            "username": USERNAME,
            "password": PASSWORD
        }

        response = self.session.post(
            f"{self.base_url}/ma/api/v2/user/login",
            json=payload,
            headers=self.headers
        )

        if response.status_code == 200:
            data = response.json()
            self.session_token = data.get("icSessionId")
            self.headers["icSessionId"] = self.session_token
            print("✅ Authenticated with Informatica Cloud")
        else:
            raise Exception(f"Authentication failed: {response.text}")

    def _authenticate_edc(self):
        """Authenticate with on-premise EDC"""
        # EDC uses API key authentication
        print("✅ Using EDC API key authentication")

    def create_business_term(self, term: Dict, regulation: str) -> Optional[Dict]:
        """Create business term in EDC glossary"""

        # Build term payload
        payload = {
            "name": term["name"],
            "description": term["definition"],
            "status": "APPROVED",
            "termType": "BUSINESS_TERM",
            "customAttributes": [
                {
                    "name": "source_regulation",
                    "value": regulation
                },
                {
                    "name": "source_article",
                    "value": term.get("source_article", "")
                },
                {
                    "name": "short_name",
                    "value": term.get("short_name", "")
                }
            ]
        }

        # Add examples as part of description
        if term.get("examples"):
            examples_html = "<br/><br/><b>Examples:</b><ul>"
            examples_html += "".join(f"<li>{ex}</li>" for ex in term["examples"])
            examples_html += "</ul>"
            payload["description"] += examples_html

        endpoint = "/access/2/catalog/data/objects" if IS_CLOUD else "/access/2/catalog/data/objects"

        response = self.session.post(
            f"{self.base_url}{endpoint}",
            json=payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✅ Created term: {term['name']}")
            return result
        else:
            print(f"❌ Failed to create term: {term['name']}")
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text}")
            return None

    def create_custom_attributes(self):
        """Create custom attributes for regulatory metadata"""

        attributes = [
            {
                "name": "source_regulation",
                "displayName": "Source Regulation",
                "dataType": "STRING",
                "description": "Regulation where term is defined"
            },
            {
                "name": "source_article",
                "displayName": "Source Article",
                "dataType": "STRING",
                "description": "Specific article or section reference"
            },
            {
                "name": "compliance_category",
                "displayName": "Compliance Category",
                "dataType": "STRING",
                "description": "Type of compliance requirement"
            },
            {
                "name": "risk_classification",
                "displayName": "Risk Classification",
                "dataType": "STRING",
                "description": "Risk level (Low/Medium/High/Critical)"
            }
        ]

        print("📝 Setting up custom attributes...")

        for attr in attributes:
            endpoint = "/access/2/catalog/models/attributes"
            response = self.session.post(
                f"{self.base_url}{endpoint}",
                json=attr,
                headers=self.headers
            )

            if response.status_code in [200, 201]:
                print(f"✅ Created attribute: {attr['displayName']}")
            else:
                print(f"⚠️  Attribute may exist: {attr['displayName']}")

    def link_terms(self, source_id: str, target_id: str, relationship_type: str = "RELATED_TO"):
        """Create relationship between terms"""

        payload = {
            "sourceId": source_id,
            "targetId": target_id,
            "relationshipType": relationship_type
        }

        endpoint = "/access/2/catalog/data/relationships"
        response = self.session.post(
            f"{self.base_url}{endpoint}",
            json=payload,
            headers=self.headers
        )

        return response.status_code in [200, 201]

    def create_business_policy(self, process: Dict, regulation: str) -> Optional[Dict]:
        """Create business policy from process"""

        payload = {
            "name": process["name"],
            "description": process["description"],
            "policyType": "BUSINESS_PROCESS",
            "status": "ACTIVE",
            "customAttributes": [
                {
                    "name": "required_by_regulation",
                    "value": regulation
                },
                {
                    "name": "process_owner",
                    "value": process.get("owner", "")
                }
            ]
        }

        # Add key activities
        if process.get("key_activities"):
            activities_html = "<br/><br/><b>Key Activities:</b><ul>"
            activities_html += "".join(f"<li>{act}</li>" for act in process["key_activities"])
            activities_html += "</ul>"
            payload["description"] += activities_html

        endpoint = "/access/2/catalog/data/objects"
        response = self.session.post(
            f"{self.base_url}{endpoint}",
            json=payload,
            headers=self.headers
        )

        if response.status_code in [200, 201]:
            print(f"✅ Created policy: {process['name']}")
            return response.json()
        else:
            print(f"⚠️  Failed to create policy: {process['name']}")
            return None


def import_ontology(client: InformaticaClient, ontology_path: str):
    """Main import function"""

    print(f"📖 Loading ontology from {ontology_path}")
    with open(ontology_path, 'r') as f:
        ontology = json.load(f)

    company = ontology["metadata"]["company"]
    print(f"🏢 Importing ontology for: {company}\n")

    # Setup custom attributes
    client.create_custom_attributes()

    # Create regulation lookup
    regulation_map = {
        reg["id"]: reg["short_name"] or reg["name"]
        for reg in ontology["regulations"]
    }

    # Import business terms
    print("\n📚 Importing business terms...")
    term_map = {}  # Maps term IDs to EDC IDs

    for term in ontology["business_terms"]:
        regulation_name = regulation_map.get(term["source_regulation"], "Unknown")
        edc_term = client.create_business_term(term, regulation_name)

        if edc_term:
            term_map[term["id"]] = edc_term.get("id")

    # Create relationships between related terms
    print("\n🔗 Creating term relationships...")
    for term in ontology["business_terms"]:
        if not term.get("related_terms"):
            continue

        source_id = term_map.get(term["id"])
        if not source_id:
            continue

        for related_id in term["related_terms"]:
            target_id = term_map.get(related_id)
            if target_id and client.link_terms(source_id, target_id):
                print(f"✅ Linked: {term['name']} → {related_id}")

    # Import business processes as policies
    print("\n📋 Importing business processes...")
    for process in ontology["business_processes"]:
        reg_ids = process.get("required_by", [])
        if not reg_ids:
            continue

        regulation_name = regulation_map.get(reg_ids[0], "Unknown")
        client.create_business_policy(process, regulation_name)

    print(f"\n✅ Import complete!")
    print(f"📊 Imported {len(term_map)} terms from {len(regulation_map)} regulations")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python informatica_import.py <ontology.json>")
        sys.exit(1)

    ontology_file = sys.argv[1]

    if not os.path.exists(ontology_file):
        print(f"❌ File not found: {ontology_file}")
        sys.exit(1)

    try:
        client = InformaticaClient()
        import_ontology(client, ontology_file)
    except Exception as e:
        print(f"❌ Import failed: {e}")
        sys.exit(1)
```

---

## 📊 Step 3: Run Import

```bash
python informatica_import.py acme-insurance-ontology.json
```

**Expected output:**
```
📖 Loading ontology from acme-insurance-ontology.json
✅ Authenticated with Informatica Cloud
🏢 Importing ontology for: Acme Insurance

📝 Setting up custom attributes...
✅ Created attribute: Source Regulation
✅ Created attribute: Source Article
✅ Created attribute: Compliance Category
✅ Created attribute: Risk Classification

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

📋 Importing business processes...
✅ Created policy: Data Protection Process
✅ Created policy: Risk Management Process

✅ Import complete!
📊 Imported 6 terms from 2 regulations
```

---

## 🔧 Step 4: Link Terms to Data Assets

### Using EDC UI

1. Navigate to **Catalog → Data Objects**
2. Find your data asset (table/file/API)
3. Click **Business Terms** tab
4. Search and assign terms from imported glossary

### Using API

```python
def assign_term_to_asset(client: InformaticaClient, term_id: str, asset_id: str):
    """Link business term to data asset (table, column, etc.)"""

    payload = {
        "associations": [
            {
                "sourceId": term_id,
                "targetId": asset_id,
                "associationType": "BUSINESS_TERM_ASSIGNMENT"
            }
        ]
    }

    response = client.session.post(
        f"{client.base_url}/access/2/catalog/data/associations",
        json=payload,
        headers=client.headers
    )

    return response.status_code in [200, 201]

# Example: Link "Personal Data" to customer table
assign_term_to_asset(
    client=client,
    term_id="bt_personal_data_001",
    asset_id="table_customer_001"
)
```

---

## 📈 Step 5: Create Axon Data Governance Policies

For Informatica Axon (Data Governance):

```python
def create_governance_policy(client: InformaticaClient, regulation: Dict, processes: List[Dict]):
    """Create governance policy in Axon"""

    payload = {
        "name": f"{regulation['short_name']} Compliance Policy",
        "description": regulation["description"],
        "policyType": "REGULATORY_COMPLIANCE",
        "regulations": [regulation["identifier"]],
        "controlPoints": [
            {
                "processName": proc["name"],
                "controlType": "MANDATORY",
                "owner": proc.get("owner", "")
            }
            for proc in processes
        ],
        "customAttributes": [
            {
                "name": "jurisdiction",
                "value": regulation["jurisdiction"]
            },
            {
                "name": "official_url",
                "value": regulation["url"]
            }
        ]
    }

    endpoint = "/axonhome/api/2/policies"
    response = client.session.post(
        f"{client.base_url}{endpoint}",
        json=payload,
        headers=client.headers
    )

    return response.json() if response.status_code in [200, 201] else None
```

---

## 🔄 Advanced Features

### Bulk Import with CSV

Informatica also supports CSV import:

```python
import csv

def export_to_edc_csv(ontology: Dict, output_file: str):
    """Export ontology to EDC-compatible CSV format"""

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Header
        writer.writerow([
            "Term Name",
            "Description",
            "Status",
            "Source Regulation",
            "Source Article",
            "Short Name",
            "Examples"
        ])

        # Get regulation map
        regulation_map = {
            reg["id"]: reg["short_name"] or reg["name"]
            for reg in ontology["regulations"]
        }

        # Write terms
        for term in ontology["business_terms"]:
            regulation = regulation_map.get(term["source_regulation"], "")
            examples = "; ".join(term.get("examples", []))

            writer.writerow([
                term["name"],
                term["definition"],
                "APPROVED",
                regulation,
                term.get("source_article", ""),
                term.get("short_name", ""),
                examples
            ])

    print(f"✅ Exported to {output_file}")
    print(f"   Import via: EDC → Import → Business Glossary → CSV")

# Usage
export_to_edc_csv(ontology, "edc_glossary_import.csv")
```

### Lineage Tracking

```python
def create_lineage_link(client: InformaticaClient,
                       regulation_id: str,
                       process_id: str,
                       term_id: str,
                       asset_id: str):
    """Create end-to-end lineage: Regulation → Process → Term → Data Asset"""

    links = [
        (regulation_id, process_id, "REQUIRES"),
        (process_id, term_id, "USES"),
        (term_id, asset_id, "GOVERNS")
    ]

    for source, target, rel_type in links:
        payload = {
            "sourceId": source,
            "targetId": target,
            "relationshipType": rel_type
        }

        client.session.post(
            f"{client.base_url}/access/2/catalog/data/relationships",
            json=payload,
            headers=client.headers
        )

    print(f"✅ Created full lineage chain")
```

---

## 📊 Best Practices

1. **Use Staging Environment**: Test imports in dev/test EDC first
2. **Version Control**: Tag imports with ontology version
3. **Incremental Updates**: Use PATCH for updates, POST for new objects
4. **Workflow Integration**: Configure approval workflows for new terms
5. **Access Control**: Set appropriate permissions on imported content
6. **Monitoring**: Set up EDC monitoring for import jobs

---

## 🔗 Resources

- [Informatica EDC REST API Docs](https://docs.informatica.com/data-catalog)
- [Axon Data Governance Guide](https://docs.informatica.com/axon)
- [Custom Attributes Documentation](https://docs.informatica.com/data-catalog/custom-attributes)
- [OntoKai Schema](../data-schemas/ontology-schema.json)

---

## 🐛 Troubleshooting

### Authentication Failed (Cloud)
```
Error 401: Invalid credentials
```
**Solution**: Check username/password. Regenerate session token if expired.

### SSL Certificate Error (On-Premise)
```
SSLError: certificate verify failed
```
**Solution**: Add certificate verification:
```python
client.session.verify = '/path/to/ca-bundle.crt'
# Or disable (not recommended for production):
client.session.verify = False
```

### Custom Attribute Not Created
```
Error 400: Attribute already exists
```
**Solution**: Query existing attributes first:
```python
response = client.session.get(
    f"{client.base_url}/access/2/catalog/models/attributes"
)
existing_attrs = response.json()
```

### Rate Limiting
```
Error 429: Too many requests
```
**Solution**: Implement exponential backoff:
```python
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
client.session.mount("https://", adapter)
```

---

## 💡 Next Steps

- Configure Axon workflows for term approval
- Set up data quality rules based on regulatory requirements
- Create compliance dashboards in Informatica
- Enable auto-classification using imported terms
- Schedule regular ontology synchronization

---

**Need professional services?** [Modular Taiga](https://modulartaiga.com) offers Informatica integration consulting.
