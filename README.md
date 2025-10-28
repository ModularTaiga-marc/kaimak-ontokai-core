# Ontokai Core

**Open source framework for generating business ontologies from regulatory requirements.**

Turn regulations (GDPR, IFRS17, DORA, Solvency II) into structured business ontologies—automatically.

---

## 🚀 What is Ontokai?

Ontokai generates complete business ontologies by analyzing regulatory frameworks. Tell it your company, industry, and location—it outputs a knowledge graph with:

- **Regulations** that apply to you
- **Business processes** required for compliance
- **Business terms** with definitions
- **Relationships** between all elements

**Live Demo:** [ontokai.onrender.com](https://ontokai.onrender.com)

---

## 🌐 Open Core Model

Ontokai follows an **open-core** approach:

### This Repository (Open Source - MIT)
✅ Frontend UI components
✅ Interactive wizard and graph visualization
✅ Export templates and integration guides
✅ Data structures and schemas

**Use freely:** Build your own tools, fork it, extend it.

### Ontokai Cloud (Proprietary)
🔒 Regulatory knowledge bases (GDPR, IFRS17, DORA, etc.)
🔒 Generation engine and algorithms
🔒 Backend API and data processing
🔒 Enterprise features (SSO, audit logs, SLA)

**Available at:** [ontokai.onrender.com](https://ontokai.onrender.com)

---

## ✨ What's Included

```
landing/
├── index.html                     # Landing page
├── generate/                      # Interactive wizard
│   └── index.html
├── legal-notice/                  # Legal pages
├── privacy/
├── cookies/
├── app-semantic-catalyst.js       # Wizard logic
├── app-interactive-navigation.js  # Graph visualization (D3.js)
├── favicon.svg
└── styles/                        # Tailwind CSS
```

### Features

- **Interactive Wizard:** Collects company info, industry, location
- **Knowledge Graph Viz:** D3.js-powered exploration of ontology
- **Responsive Design:** Works on mobile, tablet, desktop
- **Export Ready:** Templates for Collibra, Alation, Informatica
- **Legal Pages:** Privacy, cookies, terms—GDPR compliant

---

## 🛠️ Tech Stack

- **HTML5/CSS3** - Semantic, accessible markup
- **Tailwind CSS** - Utility-first styling
- **Vanilla JavaScript** - No framework bloat
- **D3.js v7** - Interactive visualizations
- **Font Awesome** - Icons

---

## 🚀 Quick Start

### Use the Hosted Version
Visit [ontokai.onrender.com](https://ontokai.onrender.com) and generate your ontology in 2 minutes.

### Self-Host the Frontend
```bash
# Clone this repo
git clone https://github.com/ModularTaiga-marc/kaimak-ontokai-core.git
cd kaimak-ontokai-core

# Serve with any static server
python -m http.server 8000

# Or use Node
npx serve landing/

# Open http://localhost:8000
```

**Note:** Frontend only. To generate ontologies, you'll need:
- A backend API (build your own or use Ontokai Cloud)
- LLM integration (Claude/GPT)
- Regulatory knowledge bases

---

## 🎯 Use Cases

### For Developers
- Build custom data governance tools
- Create ontology generators for specific industries
- Integrate with your metadata platform
- Research and education projects

### For Companies
- Generate business glossaries from regulations
- Map compliance requirements to processes
- Build semantic layers for data platforms
- Accelerate data governance programs

---

## 📊 Example Output

Input:
```
Company: Acme Insurance
Industry: Insurance
Location: EU, Spain
Regulations: GDPR, Solvency II
```

Output (Knowledge Graph):
```
Acme Insurance
├── Complies with → GDPR
│   └── Requires → Data Protection Process
│       ├── Uses → Personal Data (term)
│       ├── Uses → Data Subject Rights (term)
│       └── Uses → Consent Management (term)
└── Complies with → Solvency II
    └── Requires → Risk Management Process
        ├── Uses → SCR (term)
        ├── Uses → Own Funds (term)
        └── Uses → ORSA (term)
```

Export to: JSON, RDF, OWL, GraphML, or import directly to Collibra/Alation.

---

## 🔌 Integration

### Export Formats

This frontend can export to:
- JSON-LD (semantic web)
- RDF/Turtle (ontologies)
- OWL (formal ontologies)
- GraphML (graph databases)
- CSV (spreadsheets)

### Platform Integrations

Templates included for:
- **Collibra** - Data governance
- **Alation** - Data catalog
- **Informatica** - Enterprise data management
- **Atlan** - Modern data workspace
- **Custom** - Build your own

---

## 🤝 Contributing

Contributions welcome! This is open source.

**How to contribute:**
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Ideas for contributions:**
- New export formats
- Better visualizations
- Mobile UX improvements
- Integration templates
- Documentation improvements

---

## 📄 License

**MIT License** - See [LICENSE](LICENSE)

Free for personal and commercial use. Attribution appreciated but not required.

You can:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Use privately
- ✅ Sublicense

You must:
- Include copyright notice
- Include license text

---

## 👤 Author

**Marc Rafael Lafuente**

- **LinkedIn:** [marcrafaellafuente](https://linkedin.com/in/marcrafaellafuente)
- **Company:** [Modular Taiga](https://modulartaiga.com)
- **Email:** info@modulartaiga.com

15+ years in Data Governance
Experience: Atradius, AXA, Allianz, PepsiCo, Zurich
CDMP Certified | DAMA Spain Member

---

## 🏢 For Enterprises

Need the full platform with automatic generation?

**Ontokai Cloud** includes:
- Regulatory knowledge bases (20+ frameworks)
- Automatic ontology generation (2-minute setup)
- API access and integrations
- Enterprise features (SSO, audit, SLA)
- Professional support

**Contact:** [Modular Taiga](https://modulartaiga.com) for licensing and custom deployments.

---

## 🔗 Links

- **Live Platform:** [ontokai.onrender.com](https://ontokai.onrender.com)
- **Company:** [Modular Taiga](https://modulartaiga.com)
- **Consulting:** Data governance transformation services
- **LinkedIn:** [Marc's Profile](https://linkedin.com/in/marcrafaellafuente)

---

## ⚖️ Legal

© 2025 Modular Taiga SL

- **Terms:** [Legal Notice](https://ontokai.onrender.com/legal-notice)
- **Privacy:** [Privacy Policy](https://ontokai.onrender.com/privacy)
- **Cookies:** [Cookie Policy](https://ontokai.onrender.com/cookies)

Automated outputs require validation by qualified professionals.

---

## ⭐ Support the Project

If you find Ontokai useful:
- ⭐ Star this repo
- 🐛 Report issues
- 💡 Suggest features
- 🔀 Contribute code
- 📢 Share with your network

---

**Built with expertise. Shared with the community.**
