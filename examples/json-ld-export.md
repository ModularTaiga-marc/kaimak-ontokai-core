# JSON-LD Export Format

Ontokai can export business ontologies as JSON-LD (JSON for Linked Data), a W3C standard for expressing linked data using JSON.

## Overview

JSON-LD format allows semantic web interoperability:
- Import into triple stores (Stardog, GraphDB, Virtuoso)
- Query with SPARQL
- Integrate with knowledge graphs
- Machine-readable semantics

## Export Structure

### Complete Example

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "ontokai": "https://ontokai.com/ontology#",
    "reg": "https://regulations.eu/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "dct": "http://purl.org/dc/terms/"
  },
  "@graph": [
    {
      "@id": "ontokai:company/acme-insurance",
      "@type": "Organization",
      "name": "Acme Insurance",
      "industry": "Insurance",
      "location": {
        "@type": "Place",
        "addressCountry": "ES",
        "addressRegion": "EU"
      },
      "ontokai:compliesWith": [
        { "@id": "reg:gdpr" },
        { "@id": "reg:solvency-ii" }
      ]
    },
    {
      "@id": "reg:gdpr",
      "@type": ["ontokai:Regulation", "dct:LegalResource"],
      "name": "General Data Protection Regulation",
      "alternateName": "GDPR",
      "identifier": "EU 2016/679",
      "jurisdiction": "EU",
      "datePublished": "2016-04-27",
      "inForce": "2018-05-25",
      "url": "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
      "ontokai:requires": [
        { "@id": "ontokai:process/data-protection" }
      ]
    },
    {
      "@id": "ontokai:process/data-protection",
      "@type": "ontokai:BusinessProcess",
      "name": "Data Protection Process",
      "description": "Ensure lawful processing of personal data and protect data subject rights",
      "ontokai:requiredBy": { "@id": "reg:gdpr" },
      "ontokai:uses": [
        { "@id": "ontokai:term/personal-data" },
        { "@id": "ontokai:term/data-subject-rights" },
        { "@id": "ontokai:term/consent-management" }
      ]
    },
    {
      "@id": "ontokai:term/personal-data",
      "@type": ["ontokai:BusinessTerm", "skos:Concept"],
      "skos:prefLabel": "Personal Data",
      "skos:definition": "Any information relating to an identified or identifiable natural person",
      "skos:broader": { "@id": "ontokai:term/data" },
      "dct:source": { "@id": "reg:gdpr" },
      "skos:example": "Name, email address, ID number, location data, online identifiers"
    },
    {
      "@id": "ontokai:term/data-subject-rights",
      "@type": ["ontokai:BusinessTerm", "skos:Concept"],
      "skos:prefLabel": "Data Subject Rights",
      "skos:definition": "Rights of individuals regarding their personal data under GDPR",
      "dct:source": { "@id": "reg:gdpr" },
      "skos:narrower": [
        { "@id": "ontokai:term/right-to-access" },
        { "@id": "ontokai:term/right-to-erasure" },
        { "@id": "ontokai:term/right-to-portability" }
      ]
    },
    {
      "@id": "reg:solvency-ii",
      "@type": ["ontokai:Regulation", "dct:LegalResource"],
      "name": "Solvency II Directive",
      "alternateName": "Solvency II",
      "identifier": "EU 2009/138/EC",
      "jurisdiction": "EU",
      "datePublished": "2009-11-25",
      "inForce": "2016-01-01",
      "url": "https://eur-lex.europa.eu/eli/dir/2009/138/oj",
      "ontokai:requires": [
        { "@id": "ontokai:process/risk-management" }
      ]
    },
    {
      "@id": "ontokai:process/risk-management",
      "@type": "ontokai:BusinessProcess",
      "name": "Risk Management Process",
      "description": "Identify, assess, and manage insurance risks under Solvency II framework",
      "ontokai:requiredBy": { "@id": "reg:solvency-ii" },
      "ontokai:uses": [
        { "@id": "ontokai:term/scr" },
        { "@id": "ontokai:term/own-funds" },
        { "@id": "ontokai:term/orsa" }
      ]
    },
    {
      "@id": "ontokai:term/scr",
      "@type": ["ontokai:BusinessTerm", "skos:Concept"],
      "skos:prefLabel": "SCR",
      "skos:altLabel": "Solvency Capital Requirement",
      "skos:definition": "Capital required to ensure insurance undertaking can meet obligations with 99.5% confidence over one year",
      "dct:source": { "@id": "reg:solvency-ii" }
    }
  ]
}
```

## Using the Export

### Import into GraphDB

```bash
# Using GraphDB Workbench
curl -X POST \
  http://localhost:7200/repositories/ontokai/import/upload/text \
  -H 'Content-Type: application/ld+json' \
  -d @ontokai-export.jsonld
```

### Query with SPARQL

```sparql
PREFIX ontokai: <https://ontokai.com/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

# Find all business terms related to GDPR
SELECT ?term ?label ?definition
WHERE {
  ?regulation a ontokai:Regulation ;
              rdfs:label "GDPR" .

  ?process ontokai:requiredBy ?regulation ;
           ontokai:uses ?term .

  ?term a ontokai:BusinessTerm ;
        skos:prefLabel ?label ;
        skos:definition ?definition .
}
```

### Convert to RDF/Turtle

```python
from rdflib import Graph

# Load JSON-LD
g = Graph()
g.parse('ontokai-export.jsonld', format='json-ld')

# Export as Turtle
g.serialize(destination='ontokai-export.ttl', format='turtle')

# Or N-Triples
g.serialize(destination='ontokai-export.nt', format='nt')
```

## Custom Context

You can extend the `@context` for your domain:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "ontokai": "https://ontokai.com/ontology#",
    "mycompany": "https://mycompany.com/ontology#",
    "mycompany:internalId": {
      "@type": "xsd:string"
    },
    "mycompany:owner": {
      "@type": "@id"
    }
  }
}
```

## Validation

Validate your JSON-LD export:

```bash
# Using jsonld.js
npm install -g jsonld-cli
jsonld format ontokai-export.jsonld

# Using Apache Jena
riot --validate ontokai-export.jsonld
```

## Integration Examples

### Neo4j Import

```cypher
// Using neosemantics (n10s)
CALL n10s.rdf.import.fetch(
  "file:///ontokai-export.jsonld",
  "JSON-LD"
);
```

### Python RDFLib

```python
from rdflib import Graph, Namespace

# Load graph
g = Graph()
g.parse('ontokai-export.jsonld', format='json-ld')

# Query
ONTOKAI = Namespace("https://ontokai.com/ontology#")
for term in g.subjects(RDF.type, ONTOKAI.BusinessTerm):
    label = g.value(term, SKOS.prefLabel)
    print(f"Business Term: {label}")
```

## Benefits

- ✅ **Semantic interoperability** - Standard web format
- ✅ **Machine-readable** - Automated processing
- ✅ **Queryable** - SPARQL support
- ✅ **Linked data** - Connect to other knowledge graphs
- ✅ **Schema.org compatible** - Search engine friendly

## Support

- **JSON-LD Spec:** https://www.w3.org/TR/json-ld11/
- **JSON-LD Playground:** https://json-ld.org/playground/
- **Ontokai:** https://ontokai.onrender.com

---

**Author:** Marc Rafael Lafuente
**License:** MIT
