# 🚢 Shipments Manager

A comprehensive web application for managing shipment data, boxes, and products with user authentication and role-based access control.

## ✨ Features

### 🔐 Authentication & Authorization
- **User Registration & Login** with JWT tokens
- **Role-based Access Control** (Admin, Manager, Operator)
- **Secure Password Hashing** with bcrypt
- **Protected API Routes**

### 📦 Shipment Management
- **Create, Read, Update, Delete** shipments
- **Multiple Boxes** per shipment
- **Multiple Products** per box
- **Automatic Calculations**:
  - Volume (L×B×H)
  - Volume Weight (L×B×H/4500)
  - Final Weight (max of box weight vs volume weight)
  - Total shipment weights and charges

### 🏷️ Product Management
- **SKU-based Product System**
- **Category Organization**
- **Search & Filter** capabilities
- **Admin-only** product creation/modification

### 👥 User Management
- **Admin Dashboard** for user management
- **Profile Updates**
- **Password Management**
- **Account Status Control**

## 🏗️ Architecture

- **Frontend**: React 18 with React Router v6
- **Backend**: Express.js with Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator for input validation
- **Security**: Helmet, CORS, rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ShipmentsManager
```

### 2. Install Dependencies
```bash
# Install all dependencies (frontend + backend)
npm install

# Or install separately
npm install                    # Frontend dependencies
npm run install-server        # Backend dependencies
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/shipments_manager

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12
```

### 4. Start MongoDB
```bash
# Start MongoDB service
mongod

# Or if using MongoDB Atlas, update MONGODB_URI in .env
```

### 5. Run the Application
```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately
npm start          # Frontend (port 3000)
npm run server     # Backend (port 5000)
```

## 📁 Project Structure

```
ShipmentsManager/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── utils/             # Utility functions
│   └── App.js             # Main React app
├── server/                 # Express backend
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── index.js           # Server entry point
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin/Manager)
- `PUT /api/products/:id` - Update product (Admin/Manager)
- `DELETE /api/products/:id` - Delete product (Admin)

### Shipments
- `GET /api/shipments` - Get all shipments
- `GET /api/shipments/:id` - Get single shipment
- `POST /api/shipments` - Create shipment
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment (Admin/Manager)

### Users (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🔐 User Roles & Permissions

### 👑 Admin
- Full access to all features
- User management
- Product management
- Shipment management
- System configuration

### 👨‍💼 Manager
- Product creation and modification
- Shipment management
- Limited user access
- Cannot delete users

### 👷 Operator
- View products and shipments
- Create shipments
- Basic operations
- No administrative access

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['admin', 'manager', 'operator'],
  isActive: Boolean,
  lastLogin: Date,
  timestamps: true
}
```

### Product Model
```javascript
{
  sku: String (unique),
  name: String,
  description: String,
  category: String,
  isActive: Boolean,
  createdBy: ObjectId (ref: User),
  timestamps: true
}
```

### Shipment Model
```javascript
{
  date: Date,
  invoiceNo: String (unique),
  partyName: String,
  startTime: String,
  endTime: String,
  boxes: [BoxSchema],
  totalWeight: Number,
  totalVolume: Number,
  totalVolumeWeight: Number,
  chargedWeight: Number,
  status: Enum ['draft', 'packing', 'ready', 'shipped', 'delivered'],
  notes: String,
  createdBy: ObjectId (ref: User),
  updatedBy: ObjectId (ref: User),
  timestamps: true
}
```

## 🛠️ Development

### Adding New Features
1. Create/update models in `server/models/`
2. Add routes in `server/routes/`
3. Update frontend components in `src/components/`
4. Test API endpoints
5. Update documentation

### Code Style
- Use ES6+ features
- Follow RESTful API conventions
- Implement proper error handling
- Add input validation
- Include JSDoc comments

## 🚨 Security Features

- **JWT Authentication** with expiration
- **Password Hashing** using bcrypt
- **Input Validation** with express-validator
- **CORS Protection**
- **Helmet Security Headers**
- **Role-based Access Control**
- **SQL Injection Prevention** (MongoDB)
- **XSS Protection**

## 📊 Performance Features

- **Database Indexing** for faster queries
- **Pagination** for large datasets
- **Efficient Queries** with MongoDB aggregation
- **Response Caching** strategies
- **Optimized Frontend** rendering

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests (when implemented)
npm run test:server

# Run all tests
npm run test:all
```

## 🚀 Deployment

### Frontend (React)
```bash
npm run build
# Deploy build/ folder to your hosting service
```

### Backend (Express)
```bash
# Set NODE_ENV=production
# Update environment variables
# Use PM2 or similar process manager
pm2 start server/index.js
```

### Database (MongoDB)
- Use MongoDB Atlas for cloud hosting
- Set up proper authentication
- Configure network access
- Enable monitoring and backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Changelog

### v1.0.0
- Initial release with full CRUD operations
- User authentication and authorization
- Product and shipment management
- Role-based access control
- MongoDB integration
- Responsive React frontend

---

**Happy Shipping! 🚢📦**
