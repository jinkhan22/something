# Developer Guide

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16 or higher (v18+ recommended)
- **npm**: v7 or higher (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

### Initial Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd automotive-appraisal
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   This will:
   - Install all npm packages
   - Run postinstall script to setup Tesseract assets
   - Prepare the development environment

3. **Verify Installation**:
   ```bash
   npm test
   ```
   Run tests to ensure everything is set up correctly.

4. **Start Development Server**:
   ```bash
   npm start
   ```
   This launches the Electron app with hot reload enabled.

### Project Structure

```
automotive-appraisal/
├── src/                          # Source code
│   ├── main/                    # Main process (Node.js)
│   ├── renderer/                # Renderer process (React)
│   ├── types/                   # TypeScript definitions
│   ├── preload.ts              # Preload script
│   └── renderer.ts             # Renderer entry
├── tests/                       # Test files
├── scripts/                     # Build scripts
├── tesseract-assets/           # OCR assets
├── forge.config.ts             # Electron Forge config
├── vite.*.config.ts            # Vite configs
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
└── package.json                # Dependencies

```

## Development Workflow

### Running the Application

```bash
# Start development server with hot reload
npm start

# The application will:
# 1. Check system requirements
# 2. Verify OCR assets
# 3. Launch Electron window
# 4. Open DevTools (in development)
```

### Making Changes

1. **Edit Source Files**: Make changes in `src/` directory
2. **Hot Reload**: Changes automatically reload (Vite HMR)
3. **Check Console**: Monitor DevTools for errors
4. **Test Changes**: Verify functionality works as expected

### Code Style

The project uses ESLint and TypeScript for code quality:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

**Style Guidelines**:
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Use async/await over promises
- Add JSDoc comments for complex functions
- Keep functions small and focused
- Use meaningful variable names

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- ComparableVehicleForm.test.tsx
```

**Testing Best Practices**:
- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies
- Aim for >80% code coverage

### Building

```bash
# Package the application
npm run package

# Create installers
npm run make

# Output will be in the 'out' directory
```

## Adding New Features

### Step-by-Step Guide

#### 1. Define Types

Add TypeScript interfaces in `src/types/index.ts`:

```typescript
// Example: Adding a new feature type
export interface NewFeature {
  id: string;
  name: string;
  value: number;
  createdAt: Date;
}
```

#### 2. Create Service (if needed)

**Main Process Service** (`src/main/services/newFeatureService.ts`):

```typescript
import { NewFeature } from '../../types';

export class NewFeatureService {
  async createFeature(data: Partial<NewFeature>): Promise<NewFeature> {
    // Validate data
    if (!data.name) {
      throw new Error('Name is required');
    }
    
    // Create feature
    const feature: NewFeature = {
      id: generateId(),
      name: data.name,
      value: data.value || 0,
      createdAt: new Date()
    };
    
    // Save to storage
    await this.saveFeature(feature);
    
    return feature;
  }
  
  private async saveFeature(feature: NewFeature): Promise<void> {
    // Implementation
  }
}
```

**Renderer Service** (`src/renderer/services/newFeatureCalculator.ts`):

```typescript
export class NewFeatureCalculator {
  calculate(input: number): number {
    // Calculation logic
    return input * 2;
  }
}
```

#### 3. Add IPC Handlers

In `src/main/ipc-handlers.ts`:

```typescript
import { NewFeatureService } from './services/newFeatureService';

const newFeatureService = new NewFeatureService();

// Register handler
ipcMain.handle('newFeature:create', async (event, data: Partial<NewFeature>) => {
  try {
    const feature = await newFeatureService.createFeature(data);
    return { success: true, data: feature };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('newFeature:getAll', async (event) => {
  try {
    const features = await newFeatureService.getAllFeatures();
    return { success: true, data: features };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### 4. Update Preload Script

In `src/preload.ts`:

```typescript
// Add to contextBridge.exposeInMainWorld
newFeature: {
  create: (data: Partial<NewFeature>) => 
    ipcRenderer.invoke('newFeature:create', data),
  getAll: () => 
    ipcRenderer.invoke('newFeature:getAll'),
}
```

#### 5. Update Type Definitions

In `src/types/index.ts`, add to global Window interface:

```typescript
declare global {
  interface Window {
    electron: {
      // ... existing APIs
      newFeature: {
        create: (data: Partial<NewFeature>) => Promise<{ success: boolean; data?: NewFeature; error?: string }>;
        getAll: () => Promise<NewFeature[]>;
      };
    };
  }
}
```

#### 6. Update Zustand Store

In `src/renderer/store.ts`:

```typescript
interface AppState {
  // ... existing state
  features: NewFeature[];
  
  // ... existing actions
  loadFeatures: () => Promise<void>;
  createFeature: (data: Partial<NewFeature>) => Promise<void>;
}

const useAppStore = create<AppState>((set, get) => ({
  // ... existing state
  features: [],
  
  // ... existing actions
  loadFeatures: async () => {
    const features = await window.electron.newFeature.getAll();
    set({ features });
  },
  
  createFeature: async (data: Partial<NewFeature>) => {
    const result = await window.electron.newFeature.create(data);
    if (result.success) {
      set(state => ({
        features: [...state.features, result.data]
      }));
    } else {
      throw new Error(result.error);
    }
  },
}));
```

#### 7. Create UI Components

**Form Component** (`src/renderer/components/NewFeatureForm.tsx`):

```typescript
import React, { useState } from 'react';
import { Button, Input, Form } from 'antd';
import { useAppStore } from '../store';

export const NewFeatureForm: React.FC = () => {
  const [form] = Form.useForm();
  const createFeature = useAppStore(state => state.createFeature);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await createFeature(values);
      form.resetFields();
      message.success('Feature created successfully');
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Name is required' }]}
      >
        <Input placeholder="Enter name" />
      </Form.Item>
      
      <Form.Item
        name="value"
        label="Value"
        rules={[{ required: true, message: 'Value is required' }]}
      >
        <Input type="number" placeholder="Enter value" />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Create Feature
        </Button>
      </Form.Item>
    </Form>
  );
};
```

**List Component** (`src/renderer/components/NewFeatureList.tsx`):

```typescript
import React, { useEffect } from 'react';
import { Table } from 'antd';
import { useAppStore } from '../store';

export const NewFeatureList: React.FC = () => {
  const features = useAppStore(state => state.features);
  const loadFeatures = useAppStore(state => state.loadFeatures);
  
  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleDateString(),
    },
  ];
  
  return (
    <Table
      dataSource={features}
      columns={columns}
      rowKey="id"
    />
  );
};
```

#### 8. Add Route (if needed)

In `src/renderer/App.tsx`:

```typescript
<Route path="/features" element={<FeaturesPage />} />
```

#### 9. Write Tests

**Service Test** (`tests/newFeatureService.test.ts`):

```typescript
import { NewFeatureService } from '../src/main/services/newFeatureService';

describe('NewFeatureService', () => {
  let service: NewFeatureService;
  
  beforeEach(() => {
    service = new NewFeatureService();
  });
  
  describe('createFeature', () => {
    it('should create a feature with valid data', async () => {
      const data = { name: 'Test Feature', value: 100 };
      const feature = await service.createFeature(data);
      
      expect(feature).toBeDefined();
      expect(feature.name).toBe('Test Feature');
      expect(feature.value).toBe(100);
      expect(feature.id).toBeDefined();
    });
    
    it('should throw error if name is missing', async () => {
      await expect(service.createFeature({ value: 100 }))
        .rejects.toThrow('Name is required');
    });
  });
});
```

**Component Test** (`tests/NewFeatureForm.test.tsx`):

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewFeatureForm } from '../src/renderer/components/NewFeatureForm';

describe('NewFeatureForm', () => {
  it('should render form fields', () => {
    render(<NewFeatureForm />);
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
    expect(screen.getByText('Create Feature')).toBeInTheDocument();
  });
  
  it('should submit form with valid data', async () => {
    render(<NewFeatureForm />);
    
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Feature' }
    });
    fireEvent.change(screen.getByLabelText('Value'), {
      target: { value: '100' }
    });
    
    fireEvent.click(screen.getByText('Create Feature'));
    
    await waitFor(() => {
      expect(screen.getByText('Feature created successfully')).toBeInTheDocument();
    });
  });
});
```

## Common Development Tasks

### Adding a New Page

1. Create page component in `src/renderer/pages/`
2. Add route in `src/renderer/App.tsx`
3. Add navigation link in sidebar
4. Write tests

### Adding a New Service

1. Create service class in `src/main/services/` or `src/renderer/services/`
2. Add IPC handlers if main process service
3. Update preload script if needed
4. Write unit tests

### Adding a New Component

1. Create component in `src/renderer/components/`
2. Use TypeScript for props interface
3. Add to component index if needed
4. Write component tests

### Modifying Calculations

1. Update calculator service in `src/renderer/services/`
2. Update types if formula changes
3. Update tests with new expected values
4. Update documentation

### Adding New Data Fields

1. Update types in `src/types/index.ts`
2. Update storage service to handle new fields
3. Update UI components to display/edit fields
4. Update validation logic
5. Add migration if needed for existing data

## Debugging

### Main Process Debugging

Add breakpoints in VS Code:

1. Add configuration to `.vscode/launch.json`:
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Electron Main",
     "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
     "program": "${workspaceFolder}/src/main.ts",
     "protocol": "inspector"
   }
   ```

2. Set breakpoints in main process files
3. Press F5 to start debugging

### Renderer Process Debugging

Use Chrome DevTools (automatically opens in development):

1. Open DevTools (Cmd+Option+I on macOS)
2. Use Console, Sources, Network tabs
3. Set breakpoints in Sources tab
4. Use React DevTools extension

### Logging

Add logging throughout the application:

```typescript
// Main process
console.log('[Main]', 'Processing PDF:', filename);

// Renderer process
console.log('[Renderer]', 'Calculating market value');

// Error logging
console.error('[Error]', 'Failed to save:', error);
```

### Common Issues

**Issue**: Hot reload not working
- **Solution**: Restart dev server, check for syntax errors

**Issue**: IPC handler not responding
- **Solution**: Check handler is registered, verify channel name matches

**Issue**: TypeScript errors
- **Solution**: Run `npm install`, check tsconfig.json, restart TS server

**Issue**: Tests failing
- **Solution**: Check test setup, verify mocks, update snapshots if needed

**Issue**: Build fails
- **Solution**: Check for missing dependencies, verify forge.config.ts

## Performance Optimization

### Identifying Performance Issues

1. **Use React DevTools Profiler**:
   - Record component renders
   - Identify slow components
   - Check for unnecessary re-renders

2. **Use Chrome Performance Tab**:
   - Record performance profile
   - Analyze CPU usage
   - Check for memory leaks

3. **Add Performance Monitoring**:
   ```typescript
   const start = performance.now();
   // ... operation
   const duration = performance.now() - start;
   console.log(`Operation took ${duration}ms`);
   ```

### Optimization Techniques

**Memoization**:
```typescript
const expensiveCalculation = useMemo(() => {
  return calculateMarketValue(comparables);
}, [comparables]);
```

**Debouncing**:
```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
```

**Lazy Loading**:
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

**Virtual Scrolling**:
```typescript
<VirtualizedTable
  data={largeDataset}
  rowHeight={50}
  visibleRows={20}
/>
```

## Best Practices

### TypeScript

- Use strict mode
- Define interfaces for all data structures
- Avoid `any` type
- Use union types for variants
- Use generics for reusable code

### React

- Use functional components with hooks
- Keep components small and focused
- Extract custom hooks for reusable logic
- Use error boundaries
- Memoize expensive calculations

### State Management

- Keep state as local as possible
- Use Zustand for global state
- Avoid prop drilling
- Use selectors for derived state
- Keep actions simple and focused

### Error Handling

- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging
- Implement error boundaries
- Handle edge cases

### Testing

- Write tests for new features
- Test edge cases and errors
- Use descriptive test names
- Mock external dependencies
- Aim for high coverage

### Security

- Validate all user input
- Sanitize file paths
- Use context isolation
- Avoid eval and innerHTML
- Keep dependencies updated

### Performance

- Debounce user input
- Memoize expensive calculations
- Use lazy loading
- Optimize images
- Profile and measure

## Troubleshooting

### Development Issues

**Cannot find module errors**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors after update**:
```bash
npm run lint
# Fix reported issues
```

**Tests failing after changes**:
```bash
npm test -- --updateSnapshot
```

**Build errors**:
```bash
rm -rf out .vite
npm run package
```

### Runtime Issues

**PDF processing fails**:
- Check OCR assets are present
- Verify PDF is valid
- Check console for errors

**Market value not calculating**:
- Ensure comparables exist
- Check for validation errors
- Verify calculation logic

**Report generation fails**:
- Check all required fields present
- Verify file permissions
- Check disk space

## Contributing

### Workflow

1. Create feature branch from `main`
2. Make changes with tests
3. Run linter and tests
4. Commit with descriptive message
5. Push and create pull request
6. Address review feedback
7. Merge when approved

### Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: fix bug in calculation
docs: update documentation
test: add tests for service
refactor: restructure component
perf: optimize calculation
chore: update dependencies
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Resources

### Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Ant Design Components](https://ant.design/components)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Tools

- [VS Code](https://code.visualstudio.com)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [Postman](https://www.postman.com) (for API testing)

### Community

- GitHub Issues for bug reports
- GitHub Discussions for questions
- Stack Overflow for general help

---

Happy coding! If you have questions or need help, don't hesitate to ask.
