---
description: Frontend development standards, best practices, and conventions for the Chapur Pay JSP and browser JavaScript UI, including DWR integration, Bootstrap patterns, context paths, and UI testing practices
globs: ["src/main/webapp/**/*.jsp", "src/main/webapp/resources/**/*.{js,css,html}", "src/main/resources/dwr.xml", "src/test/**/*.java", "pom.xml"]
alwaysApply: true
---

# Frontend Project Configuration and Best Practices

## Table of Contents

- [Overview](#overview)
- [Chapur Pay UI and Connection Rules](#chapur-pay-ui-and-connection-rules)
  - [UI to Core Boundary](#ui-to-core-boundary)
  - [Profile-Aware UI Configuration](#profile-aware-ui-configuration)
  - [UI and E2E Test Conditions](#ui-and-e2e-test-conditions)
- [Technology Stack](#technology-stack)
  - [Core Technologies](#core-technologies)
  - [UI Framework](#ui-framework)
  - [State Management & Data Flow](#state-management--data-flow)
  - [Testing Framework](#testing-framework)
  - [Development Tools](#development-tools)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
  - [Language and Naming Conventions](#language-and-naming-conventions)
  - [Component Conventions](#component-conventions)
  - [State Management](#state-management)
  - [Service Layer Architecture](#service-layer-architecture)
- [UI/UX Standards](#uiux-standards)
  - [Bootstrap Integration](#bootstrap-integration)
  - [Form Handling](#form-handling)
  - [Navigation Patterns](#navigation-patterns)
  - [Accessibility](#accessibility)
- [Testing Standards](#testing-standards)
  - [End-to-End Testing with Cypress](#end-to-end-testing-with-cypress)
  - [Test Organization](#test-organization)
- [Configuration Standards](#configuration-standards)
  - [TypeScript Configuration](#typescript-configuration)
  - [ESLint Configuration](#eslint-configuration)
  - [Environment Configuration](#environment-configuration)
- [Performance Best Practices](#performance-best-practices)
  - [Component Optimization](#component-optimization)
  - [Bundle Optimization](#bundle-optimization)
  - [API Efficiency](#api-efficiency)
- [Development Workflow](#development-workflow)
  - [Git Workflow](#git-workflow)
  - [Development Scripts](#development-scripts)
  - [Code Quality](#code-quality)
- [Migration Strategy](#migration-strategy)
  - [JSP and JavaScript Maintenance](#jsp-and-javascript-maintenance)
  - [UI Modernization](#ui-modernization)

---

## Overview

This document outlines the best practices, conventions, and standards used by the Chapur Pay UI. The UI is server-rendered JSP with browser JavaScript, Bootstrap, jQuery, DataTables, and DWR resources inside the Spring Boot WAR. React, Create React App, and Cypress are not part of the current runtime.

## Chapur Pay UI and Connection Rules

### UI to Core Boundary

The UI must never connect directly to Oracle or any other database. JSP pages and browser JavaScript communicate with the Chapur Pay core through Spring MVC routes, forms, fetch requests, or DWR services. The core owns authentication, authorization, validation, transactions, stored procedures, and database error handling.

- Build URLs with `${pageContext.request.contextPath}` in JSP or the server-provided context path in JavaScript; do not hardcode hostnames, ports, or environment-specific context paths.
- Use the generated DWR endpoints under `${pageContext.request.contextPath}/dwr/` for existing DWR services.
- Do not put JDBC URLs, database usernames, passwords, Oracle driver code, or service credentials in JSP, JavaScript, HTML, browser storage, or network payloads.
- Do not add a browser-side fallback that calls the database when an API or DWR request fails. Display a user-safe error and let the core log the technical cause.
- Keep UI behavior independent of the database profile. Environment selection belongs to Spring Boot configuration in the core.

```jsp
<script src="${pageContext.request.contextPath}/dwr/engine.js"></script>
<script src="${pageContext.request.contextPath}/dwr/interface/dwrCatalogoServicio.js"></script>
```

### Profile-Aware UI Configuration

The UI is deployed with the WAR and therefore uses the active Spring profile's context path and service configuration:

| Profile | UI condition | Required behavior |
| --- | --- | --- |
| `dev` | `parametro.ambiente.prueba=true` | Use development core endpoints and non-production test data only. |
| `qa` | `parametro.ambiente.prueba=true` | Use QA core endpoints and test accounts/data only. |
| `prod` | `parametro.ambiente.prueba=false` | Hide or disable test-only actions and never point the UI to dev/QA services. |

UI code must derive its base path from the rendered context path. If a separately deployed browser application is added later, its API URL must be supplied through environment-specific build configuration, validated at startup, and must point to the core API, never to Oracle.

### UI and E2E Test Conditions

- Unit tests mock DWR, HTTP clients, browser APIs, and service responses. They must not open Oracle connections or call shared Chapur services.
- End-to-end tests may call the core only when an explicit test base URL and test credentials are provided by the test runner. Use isolated accounts and data, and clean up created records.
- E2E tests must never infer a production URL from the default profile or hardcode a production hostname.
- Test selectors should use stable `data-testid` attributes or accessible roles, not database-generated values or implementation-specific CSS selectors.
- Validate both the success path and the UI response to core failures such as timeout, authorization failure, validation error, and database-unavailable responses.
- The repository currently has no separate `frontend/` or Cypress runtime. Do not add React/Cypress setup instructions as if they were available; for the existing UI, test JSP/JavaScript behavior with the project's Java test setup or an explicitly added browser-test tool.

Example of an explicit E2E configuration without secrets in source control:

```javascript
const coreUrl = Cypress.env('CHAPUR_CORE_URL');

if (!coreUrl || /prod/i.test(coreUrl)) {
    throw new Error('E2E tests require a non-production Chapur core URL');
}
```

## Technology Stack

### Core Technologies
- **JSP**: Server-rendered views under `src/main/webapp/WEB-INF/jsp`
- **Spring MVC**: Controller and view routing in the Java core
- **JavaScript**: Browser-side behavior and page interactions
- **DWR 3.0.2**: Generated browser proxies for Java remote services
- **Maven/WAR**: UI packaged and deployed with the Chapur Pay backend

### UI Framework
- **Bootstrap**: Existing CSS and JavaScript responsive components
- **jQuery 3.2.1**: DOM manipulation and event handling
- **jQuery UI**: Widgets and date picker behavior
- **DataTables**: Tables, filtering, pagination, export, and responsive behavior
- **Bootbox, SweetAlert2, and Tippy.js**: Dialogs, alerts, and tooltips
- **Vue 2.6.8**: Use only in existing pages that already depend on it; do not introduce Vue into unrelated JSPs

### State Management & Data Flow
- **Page-local JavaScript state**: Keep state scoped to the page/module that owns it
- **DWR callbacks**: Existing asynchronous communication with Java services
- **Fetch/AJAX**: Use only for existing HTTP endpoints and always include the application context path
- **Session state**: Owned by the server; never store database credentials or service tokens in browser storage

### Testing Framework
- **JUnit 4.11 and Spring Boot Starter Test**: Current project test dependencies
- **Mockito 1.9.5**: Mock DWR-facing services and backend collaborators in Java tests
- **Browser testing**: No Cypress or separate frontend test runner is currently configured
- **E2E policy**: Any future browser suite must use an explicit non-production core URL and isolated test accounts

### Development Tools
- **Maven**: Builds the complete WAR, including JSP and static resources
- **JSTL 1.2**: JSP standard tags
- **Spring Session Data Redis**: Server-side session support when enabled by deployment
- **Actuator**: Core health endpoint used to validate deployment
- **External servlet container**: Deploy the generated WAR to the supported GlassFish/container environment

## Project Structure

```
src/main/webapp/
├── WEB-INF/jsp/          # Server-rendered JSP views and fragments
├── resources/js/         # Page and feature JavaScript
├── resources/css/        # Application and component styles
├── resources/images/     # Logos and static images
└── resources/librerias/ # Vendored Bootstrap, jQuery, DWR, and plugins
src/main/resources/dwr.xml # DWR scanning and URL mapping
pom.xml                   # Maven build for the complete WAR
```

## Coding Standards

### Naming Conventions

- **JSP Naming**: Use descriptive names that match the feature and existing view conventions
- **JavaScript Naming**: Use camelCase for variables and functions (e.g., `candidateId`, `handleQuery`)
- **Constants Naming**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_ROWS`, `CONTEXT_PATH`)
- **CSS Class Naming**: Use kebab-case for CSS classes (e.g., `candidate-card`, `position-details`)
- **File Naming**: Preserve the existing feature-based naming convention for JSP, JavaScript, and CSS files
- **CSS Class Naming**: Use kebab-case for CSS classes (e.g., `candidate-card`, `position-details`)
- **Hook Naming**: Use camelCase starting with "use" prefix (e.g., `useCandidate`, `usePositionData`, `useFormValidation`)

**Examples:**

```typescript
// Good: All in English
import React, { useState, useEffect } from 'react';

type CandidateCardProps = {
    candidate: Candidate;
    index: number;
    onClick: (candidate: Candidate) => void;
};

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, index, onClick }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    // Handle candidate card click event
    const handleCardClick = () => {
        onClick(candidate);
    };
    
    return (
        <div className="candidate-card" onClick={handleCardClick}>
            {/* Component JSX */}
        </div>
    );
};

// Avoid: Non-English comments or names
const TarjetaCandidato: React.FC<PropsTarjetaCandidato> = ({ candidato, indice, alHacerClic }) => {
    const [estaCargando, setEstaCargando] = useState(false);
    
    // Manejar evento de clic en la tarjeta de candidato
    const manejarClicTarjeta = () => {
        alHacerClic(candidato);
    };
    
    return (
        <div className="tarjeta-candidato" onClick={manejarClicTarjeta}>
            {/* JSX del componente */}
        </div>
    );
};
```

**Error Messages and Console Logs:**

```typescript
// Good: English error messages
catch (error) {
    console.error('Failed to fetch candidates:', error);
    setError('Unable to load candidates. Please try again later.');
}

// Avoid: Non-English messages
catch (error) {
    console.error('Error al obtener candidatos:', error);
    setError('No se pudieron cargar los candidatos. Por favor, inténtelo de nuevo más tarde.');
}
```

**Service Layer Examples:**

```typescript
// Good: English naming in services
export const candidateService = {
    getAllCandidates: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/candidates`);
            return response.data;
        } catch (error) {
            console.error('Error fetching candidates:', error);
            throw error;
        }
    }
};

// Avoid: Non-English naming
export const servicioCandidatos = {
    obtenerTodosLosCandidatos: async () => {
        try {
            const respuesta = await axios.get(`${API_BASE_URL}/candidates`);
            return respuesta.data;
        } catch (error) {
            console.error('Error al obtener candidatos:', error);
            throw error;
        }
    }
};
```

### Component Conventions

#### Functional Components
- **Always use functional components** with hooks instead of class components
- Use **TypeScript for new components** when possible
- Keep **JavaScript for legacy components** until migration

```typescript
// Preferred - TypeScript functional component
import React, { useState, useEffect } from 'react';

type Position = {
    id: number;
    title: string;
    status: 'Open' | 'Contratado' | 'Cerrado' | 'Borrador';
};

const Positions: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([]);
    // Component logic
};
```

#### Component Props
- **Define TypeScript interfaces** for component props when using TypeScript
- Use **destructuring** for props
- Include **default values** where appropriate

```typescript
type CandidateCardProps = {
    candidate: Candidate;
    index: number;
    onClick: (candidate: Candidate) => void;
};

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, index, onClick }) => {
    // Component implementation
};
```

### State Management

#### Local State with Hooks
- Use **useState** for component-level state
- Use **useEffect** for side effects and data fetching
- **Extract custom hooks** for reusable stateful logic

```javascript
const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Borrador'
});

const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
};
```

#### Loading and Error States
- **Always handle loading states** for async operations
- **Implement error handling** with user-friendly messages
- **Use React Bootstrap Alert** components for feedback

```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

// In async function
try {
    setLoading(true);
    const data = await apiCall();
    setSuccess('Operation completed successfully');
} catch (error) {
    setError('Error message: ' + error.message);
} finally {
    setLoading(false);
}
```

### Service Layer Architecture

#### API Services
- **Centralize API calls** in service files
- Use **axios** for HTTP requests
- **Export service objects** with grouped methods
- **Handle errors at service level** when appropriate

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3010';

export const positionService = {
    getAllPositions: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/positions`);
            return response.data;
        } catch (error) {
            console.error('Error fetching positions:', error);
            throw error;
        }
    },
    
    updatePosition: async (id, positionData) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/positions/${id}`, positionData);
            return response.data;
        } catch (error) {
            console.error('Error updating position:', error);
            throw error;
        }
    }
};
```

## UI/UX Standards

### Bootstrap Integration
- Use **React Bootstrap components** instead of plain Bootstrap
- **Import Bootstrap CSS** in the main App component
- Follow **Bootstrap responsive grid system** (Container, Row, Col)

```javascript
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
```

### Form Handling
- Use **controlled components** for form inputs
- Implement **real-time validation** where appropriate
- **Disable submit buttons** during form submission
- **Clear form state** after successful submission

```javascript
<Form onSubmit={handleSubmit}>
    <Form.Group className="mb-3">
        <Form.Label>Title *</Form.Label>
        <Form.Control
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
        />
    </Form.Group>
    <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
    </Button>
</Form>
```

### Navigation Patterns
- Use **React Router** for all navigation
- **Implement breadcrumbs** with back navigation
- Use **programmatic navigation** with useNavigate hook

```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigation examples
<Button variant="link" onClick={() => navigate('/')}>
    ← Back to Dashboard
</Button>
```

### Accessibility
- Include **aria-label** attributes for interactive elements
- Use **semantic HTML** elements
- Ensure **keyboard navigation** support
- Provide **alternative text** for images

```javascript
<Form.Control 
    type="text" 
    placeholder="Search by title" 
    aria-label="Search positions by title"
/>
```

## Testing Standards

### End-to-End Testing with Cypress
- **Test user workflows** rather than implementation details
- Use **data-testid** attributes for reliable element selection
- **Organize tests by feature** (candidates.cy.ts, positions.cy.ts)
- **Include API testing** alongside UI testing

```typescript
describe('Positions API - Update', () => {
    beforeEach(() => {
        cy.window().then((win) => {
            win.localStorage.clear();
        });
    });

    it('should update a position successfully', () => {
        const updateData = {
            title: 'Updated Test Position',
            status: 'Open'
        };

        cy.request({
            method: 'PUT',
            url: `${API_URL}/positions/${testPositionId}`,
            body: updateData
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.data.title).to.eq(updateData.title);
        });
    });
});
```

### Test Organization
- **Group related tests** with describe blocks
- **Use descriptive test names** that explain the expected behavior
- **Test both success and error scenarios**
- **Include edge cases** and validation testing

## Configuration Standards

### TypeScript Configuration
- Enable **strict mode** for type checking
- Use **path mapping** with "@/*" for cleaner imports
- Include **both Cypress and Node types**
- Configure **ES5 target** for broader compatibility

```json
{
    "compilerOptions": {
        "strict": true,
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        },
        "types": ["cypress", "node"]
    }
}
```

### ESLint Configuration
- Extend **React App** configuration
- Include **Jest rules** for testing
- **Automatic code formatting** and error detection
- **Consistent code style** across the project

### Environment Configuration
- Use **environment variables** for API URLs
- **Separate configurations** for development and production
- **Configure Cypress** with environment-specific settings

```javascript
// cypress.config.ts
export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        env: {
            API_URL: 'http://localhost:3010'
        }
    }
});
```

## Performance Best Practices

### Component Optimization
- **Lazy load** components when appropriate
- **Memoize expensive calculations** with useMemo
- **Avoid unnecessary re-renders** with useCallback
- **Extract reusable logic** into custom hooks

### Bundle Optimization
- **Tree shaking** enabled through Create React App
- **Code splitting** at route level
- **Optimize images** and static assets
- **Monitor bundle size** with build tools

### API Efficiency
- **Implement proper error handling** for network requests
- **Cache API responses** where appropriate
- **Use loading states** to improve perceived performance
- **Batch API calls** when possible

## Development Workflow

- **Feature Branches**: Develop features in separate branches, adding descriptive suffix "-frontend" to allow working in parallel and avoid conflicts or collisions
- **Descriptive Commits**: Write descriptive commit messages in English
- **Code Review**: Code review before merging
- **Small Branches**: Keep branches small and focused

### Development Scripts
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev  # Run the JSP UI with the core
mvn package                                           # Build the WAR with UI resources
mvn test -DskipTests=false                            # Run Java tests explicitly
```

### Code Quality
- **Maven compilation** without errors
- **JSP and JavaScript review** before commits
- **All enabled tests passing** before deployment
- **No database credentials** in browser resources or rendered HTML

## Migration Strategy

### JSP and JavaScript Maintenance
- **Keep server-rendered JSP** as the current UI architecture
- **Use JavaScript modules** for new browser behavior where the existing browser support allows it
- **Maintain existing JavaScript** incrementally; do not introduce React or TypeScript without an approved separate frontend migration
- **Preserve DWR and context-path conventions** when modifying existing pages

### UI Modernization
- **Reuse existing JSP fragments** instead of duplicating markup
- **Use Bootstrap and accessible HTML** for consistent responsive behavior
- **Keep page scripts scoped** to their owning view or feature
- **Prefer DWR/service abstractions** over embedding backend or database logic in the browser

This document serves as the foundation for maintaining code quality and consistency across the Chapur Pay JSP UI. All team members should follow these practices to ensure a maintainable and scalable codebase.
