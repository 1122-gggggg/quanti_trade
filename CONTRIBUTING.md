# Contributing to ApexTrade Studio

Thank you for your interest in contributing to **ApexTrade Studio**! We welcome bug reports, feature requests, indicator additions, backtesting strategy improvements, and documentation pull requests.

## 🚀 How to Contribute

1. **Fork the Repository**
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-new-indicator
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "feat: add Stochastic Oscillator technical indicator"
   ```
4. **Test & Build**:
   Ensure all TypeScript types compile without errors before submitting:
   ```bash
   npm run build
   ```
5. **Open a Pull Request**: Submit a PR to the `main` branch with a clear summary of your changes.

## 📐 Code Style & Conventions

- Use **React 19 + TypeScript** with explicit type definitions.
- Place reusable technical analysis algorithms in `src/services/technicalIndicators.ts`.
- Place strategy algorithms in `src/services/backtester.ts`.
- Use Tailwind CSS utility classes for responsive, dark-mode-first glassmorphism styling.

## 📄 License

By contributing to ApexTrade Studio, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
