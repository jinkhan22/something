# Contributing to Automotive Appraisal Application

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the project
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment or discrimination of any kind
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm v7 or higher
- Git
- Code editor (VS Code recommended)

### Setup

1. **Fork the Repository**:
   - Click the "Fork" button on GitHub
   - Clone your fork locally:
     ```bash
     git clone https://github.com/YOUR_USERNAME/automotive-appraisal.git
     cd automotive-appraisal
     ```

2. **Add Upstream Remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/automotive-appraisal.git
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Verify Setup**:
   ```bash
   npm test
   npm start
   ```

## Development Process

### Workflow

1. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Changes**:
   - Write code following our standards
   - Add tests for new features
   - Update documentation as needed

3. **Test Your Changes**:
   ```bash
   npm run lint
   npm test
   npm start  # Manual testing
   ```

4. **Commit Your Changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**:
   - Go to GitHub and create a PR
   - Fill out the PR template
   - Link related issues

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Coding Standards

### TypeScript

- **Use Strict Mode**: Enable strict TypeScript checking
- **Type Everything**: Avoid `any` type, use proper interfaces
- **Interfaces Over Types**: Prefer interfaces for object shapes
- **Naming Conventions**:
  - PascalCase for types, interfaces, classes
  - camelCase for variables, functions
  - UPPER_CASE for constants

**Example**:
```typescript
// Good
interface VehicleData {
  vin: string;
  year: number;
  make: string;
}

const calculateMarketValue = (data: VehicleData): number => {
  // Implementation
};

// Bad
const calculate_market_value = (data: any) => {
  // Implementation
};
```

### React

- **Functional Components**: Use functional components with hooks
- **Props Interface**: Define props interface for all components
- **Hooks Rules**: Follow React hooks rules
- **Component Structure**:
  ```typescript
  // 1. Imports
  import React, { useState, useEffect } from 'react';
  
  // 2. Types/Interfaces
  interface MyComponentProps {
    title: string;
    onSave: () => void;
  }
  
  // 3. Component
  export const MyComponent: React.FC<MyComponentProps> = ({ title, onSave }) => {
    // 4. Hooks
    const [value, setValue] = useState('');
    
    // 5. Effects
    useEffect(() => {
      // Effect logic
    }, []);
    
    // 6. Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };
    
    // 7. Render
    return (
      <div>
        <h1>{title}</h1>
        <input value={value} onChange={handleChange} />
        <button onClick={onSave}>Save</button>
      </div>
    );
  };
  ```

### File Organization

- **One Component Per File**: Each component in its own file
- **Index Files**: Use index.ts for barrel exports
- **Naming**: Match filename to component name
- **Location**:
  - Components: `src/renderer/components/`
  - Pages: `src/renderer/pages/`
  - Services: `src/main/services/` or `src/renderer/services/`
  - Types: `src/types/`
  - Tests: `tests/`

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Use semicolons
- **Line Length**: Max 100 characters
- **Trailing Commas**: Use trailing commas in multi-line

**Example**:
```typescript
const config = {
  name: 'Automotive Appraisal',
  version: '1.0.0',
  features: [
    'PDF Processing',
    'Market Analysis',
    'Report Generation',
  ],
};
```

### Comments

- **JSDoc**: Use JSDoc for functions and classes
- **Inline Comments**: Explain complex logic
- **TODO Comments**: Mark incomplete work

**Example**:
```typescript
/**
 * Calculate market value using quality-weighted average
 * @param comparables - Array of comparable vehicles
 * @param lossVehicle - Loss vehicle data
 * @returns Market value calculation result
 */
function calculateMarketValue(
  comparables: ComparableVehicle[],
  lossVehicle: ExtractedVehicleData
): MarketValueCalculation {
  // TODO: Add support for regional adjustments
  
  // Calculate weighted average
  const totalWeight = comparables.reduce((sum, comp) => sum + comp.qualityScore, 0);
  const weightedSum = comparables.reduce(
    (sum, comp) => sum + (comp.adjustedPrice * comp.qualityScore),
    0
  );
  
  return weightedSum / totalWeight;
}
```

## Testing Guidelines

### Test Coverage

- **Minimum Coverage**: 80% for new code
- **Critical Paths**: 100% coverage for critical features
- **Test Types**:
  - Unit tests for services and utilities
  - Component tests for React components
  - Integration tests for workflows
  - E2E tests for critical user flows

### Writing Tests

**Unit Test Example**:
```typescript
import { MarketValueCalculator } from '../src/renderer/services/marketValueCalculator';

describe('MarketValueCalculator', () => {
  let calculator: MarketValueCalculator;
  
  beforeEach(() => {
    calculator = new MarketValueCalculator();
  });
  
  describe('calculateMarketValue', () => {
    it('should calculate weighted average correctly', () => {
      const comparables = [
        { adjustedPrice: 20000, qualityScore: 100 },
        { adjustedPrice: 21000, qualityScore: 90 },
      ];
      
      const result = calculator.calculateMarketValue(comparables, lossVehicle);
      
      expect(result.finalMarketValue).toBeCloseTo(20473.68, 2);
    });
    
    it('should handle empty comparables array', () => {
      expect(() => {
        calculator.calculateMarketValue([], lossVehicle);
      }).toThrow('At least one comparable required');
    });
  });
});
```

**Component Test Example**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparableVehicleForm } from '../src/renderer/components/ComparableVehicleForm';

describe('ComparableVehicleForm', () => {
  it('should render all form fields', () => {
    render(<ComparableVehicleForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Make')).toBeInTheDocument();
  });
  
  it('should validate required fields', async () => {
    const onSubmit = jest.fn();
    render(<ComparableVehicleForm onSubmit={onSubmit} />);
    
    fireEvent.click(screen.getByText('Submit'));
    
    expect(screen.getByText('Source is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- ComparableVehicleForm.test.tsx

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Commit Guidelines

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```
feat(comparables): add distance calculation

Implement haversine formula for calculating distance between
loss vehicle and comparable vehicles.

Closes #123
```

```
fix(pdf): handle corrupted PDF files

Add error handling for corrupted PDF files to prevent
application crash.

Fixes #456
```

```
docs(api): update API reference

Add documentation for new market analysis endpoints.
```

### Commit Best Practices

- **Atomic Commits**: One logical change per commit
- **Clear Messages**: Describe what and why, not how
- **Present Tense**: Use "add" not "added"
- **Imperative Mood**: Use "fix" not "fixes"
- **Reference Issues**: Link to related issues

## Pull Request Process

### Before Submitting

1. **Update Your Branch**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run All Checks**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Update Documentation**:
   - Update README if needed
   - Add/update API documentation
   - Update CHANGELOG

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Testing
- [ ] Unit tests added/updated
- [ ] Component tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)
Add screenshots for UI changes

## Additional Notes
Any additional information
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review code
3. **Feedback**: Address review comments
4. **Approval**: At least one approval required
5. **Merge**: Maintainer merges PR

### After Merge

- Delete your branch
- Update your fork
- Close related issues

## Issue Guidelines

### Creating Issues

**Bug Report Template**:
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 12.0]
- App Version: [e.g., 1.0.0]
- Node Version: [e.g., 18.0.0]

## Screenshots
If applicable

## Additional Context
Any other relevant information
```

**Feature Request Template**:
```markdown
## Feature Description
Clear description of the feature

## Problem It Solves
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Any other relevant information
```

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested
- `wontfix`: This will not be worked on

## Communication

### Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Pull Requests**: Code review and discussion

### Response Times

- **Issues**: We aim to respond within 48 hours
- **Pull Requests**: Initial review within 3-5 days
- **Questions**: Response within 24-48 hours

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

## Questions?

If you have questions:
1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Create a new issue with the `question` label

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to the Automotive Appraisal Application! 🚗
