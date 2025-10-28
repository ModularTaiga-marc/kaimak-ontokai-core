# Contributing to Ontokai Core

Thank you for your interest in contributing to Ontokai! This document provides guidelines for contributing to the open-source frontend components.

## 🌟 How to Contribute

### Reporting Issues

- **Search first:** Check if the issue already exists
- **Be specific:** Include browser, OS, and steps to reproduce
- **Screenshots:** Include visual evidence when relevant
- **Expected vs Actual:** Clearly describe what should happen vs what does happen

### Suggesting Features

- **Use case first:** Explain the problem you're solving
- **Community benefit:** How does this help other users?
- **Implementation ideas:** Share your technical approach (optional)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly:** Ensure nothing breaks
5. **Commit with clear messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push to your fork:** `git push origin feature/your-feature-name`
7. **Open a Pull Request**

## 📋 Development Guidelines

### Code Style

- **HTML:** Semantic markup, proper indentation
- **CSS:** Use Tailwind utility classes when possible
- **JavaScript:** ES6+, no jQuery, clear variable names
- **Comments:** Explain "why", not "what"

### Testing

Before submitting:
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on mobile (responsive design)
- [ ] Check console for errors
- [ ] Verify accessibility (keyboard navigation, screen readers)

### Commit Messages

Follow this format:
```
type(scope): subject

body (optional)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

**Examples:**
```
feat(wizard): add industry dropdown with autocomplete
fix(graph): resolve D3.js rendering issue on Safari
docs(readme): update integration guide for Collibra
```

## 🎯 Areas for Contribution

### High Priority

- **Export formats:** Additional formats (Turtle, N-Triples, etc.)
- **Visualizations:** Alternative graph layouts, filtering
- **Mobile UX:** Improved touch interactions
- **Accessibility:** WCAG 2.1 AA compliance
- **Internationalization:** Multi-language support

### Integration Templates

Help developers integrate with more platforms:
- **Data Catalogs:** Collibra, Alation, Atlan, DataHub
- **MDM Systems:** Informatica, Talend, SAP MDG
- **Graph Databases:** Neo4j, TigerGraph, Neptune
- **Semantic Platforms:** Stardog, GraphDB, Virtuoso

### Documentation

- **Tutorials:** Step-by-step guides
- **Use cases:** Real-world examples
- **API docs:** If you build integrations
- **Videos:** Screen recordings, demos

## 🚫 Out of Scope

The following are **NOT** part of this repository:

- Backend API changes (proprietary)
- LLM integration (proprietary)
- Regulatory knowledge bases (proprietary)
- Core generation algorithms (proprietary)

For enterprise features, contact [Modular Taiga](https://modulartaiga.com).

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Your code will be:
- ✅ Free for commercial use
- ✅ Modifiable by anyone
- ✅ Distributable under the same license

## 🤝 Code of Conduct

### Our Standards

- **Respectful:** Treat everyone with kindness
- **Inclusive:** Welcome all backgrounds and experience levels
- **Collaborative:** Share knowledge, help others
- **Constructive:** Feedback should be helpful, not hurtful

### Unacceptable Behavior

- Harassment, discrimination, or trolling
- Spam, advertising, or self-promotion
- Publishing others' private information
- Any illegal activity

## 🔍 Review Process

1. **Initial review:** Maintainers check basic requirements
2. **Technical review:** Code quality, testing, documentation
3. **Approval:** At least one maintainer approval required
4. **Merge:** Merged to main branch
5. **Release:** Included in next version

**Response times:**
- Issues: 1-3 business days
- PRs: 3-7 business days
- Questions: 1-2 business days

## 💬 Getting Help

- **Questions:** Open a [GitHub Discussion](https://github.com/ModularTaiga-marc/kaimak-ontokai-core/discussions)
- **Bugs:** File an [Issue](https://github.com/ModularTaiga-marc/kaimak-ontokai-core/issues)
- **Enterprise:** Contact [Modular Taiga](https://modulartaiga.com)

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in relevant documentation

Thank you for making Ontokai better! 🎉

---

**Maintainer:** Marc Rafael Lafuente ([@marcrafaellafuente](https://linkedin.com/in/marcrafaellafuente))
**Company:** [Modular Taiga](https://modulartaiga.com)
