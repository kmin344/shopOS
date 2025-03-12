# 🛍️ ShopOS - Ecommerce Operating System

A flexible and customizable ecommerce API built with NestJS, GraphQL, and TypeORM.

## Features

- 🔧 Dynamic custom fields for all entities
- 📦 Product catalog management
- 🛒 Order processing system
- 📑 Category organization
- 🎯 GraphQL API with TypeScript type safety
- 🗄️ PostgreSQL database with TypeORM

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- PostgreSQL
- Yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shopos.git
cd shopos
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=shopos
```

5. Start the development server:
```bash
yarn start:dev
```

The GraphQL playground will be available at http://localhost:3000/graphql

## API Examples

### Custom Fields

1. Create a custom field:
```graphql
mutation {
  createCustomField(input: {
    name: "Color"
    fieldType: STRING
    entityType: PRODUCT
    isRequired: false
    description: "Product color variant"
  }) {
    id
    name
    fieldType
  }
}
```

2. Query entity custom fields:
```graphql
query {
  customFieldsByEntity(entityType: PRODUCT) {
    id
    name
    fieldType
    description
    isRequired
  }
}
```

### Products

1. Create a product:
```graphql
mutation {
  createProduct(input: {
    name: "Gaming Laptop"
    price: 1299.99
    stock: 10
    categoryId: "category-uuid"
    description: "High-performance gaming laptop"
  }) {
    id
    name
    customFieldValues {
      value
      customField {
        name
      }
    }
  }
}
```

2. Query products with custom fields:
```graphql
query {
  products {
    id
    name
    price
    category {
      name
    }
    customFieldValues {
      value
      customField {
        name
        fieldType
      }
    }
  }
}
```

## Architecture

ShopOS is built with a modular architecture:

- `CoreModule`: Handles basic ecommerce entities (Products, Categories, Orders)
- `CustomFieldModule`: Provides dynamic field functionality
- `ConnectorModule`: (Coming soon) Integration with external services

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is [MIT licensed](LICENSE).
