# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)


# 🎮 Event Management System - Complete Documentation

## 📋 Table of Contents

- [📚 Libraries & Frameworks](#-libraries--frameworks)
- [🚀 Advanced Features](#-advanced-features)
- [🛠️ Setup & Installation](#️-setup--installation)
- [📝 Important Notes](#-important-notes)

---

## 📚 Libraries & Frameworks

### 🎯 Frontend Technologies

#### **React.js**
- **Purpose**: Core UI framework for building interactive user interfaces
- **Justification**: 
  - Component-based architecture for reusable UI elements
  - Virtual DOM for optimal performance
  - Large ecosystem and community support
  - Excellent state management capabilities
- **Problem Solved**: Provides structured approach to building complex UIs with maintainable code

#### **React Router**
- **Purpose**: Client-side routing for single-page application
- **Justification**:
  - Declarative routing configuration
  - Route-based code splitting
  - Browser history management
  - Seamless navigation between pages
- **Problem Solved**: Enables multi-page experience without full page reloads

#### **Axios**
- **Purpose**: HTTP client for API communication
- **Justification**:
  - Promise-based API for async operations
  - Request/response interceptors
  - Automatic JSON parsing
  - Error handling capabilities
- **Problem Solved**: Simplifies API calls with consistent error handling and response formatting

#### **Socket.io-client**
- **Purpose**: Real-time bidirectional communication
- **Justification**:
  - WebSocket wrapper for real-time features
  - Automatic reconnection handling
  - Room-based messaging
  - Cross-browser compatibility
- **Problem Solved**: Enables real-time features like chat, notifications, and live updates

#### **Custom CSS**
- **Purpose**: Styling and responsive design
- **Justification**:
  - Complete control over styling
  - Performance optimization (no additional library overhead)
  - Custom design system
  - Lightweight implementation
- **Problem Solved**: Provides consistent branding and responsive design without external dependencies

### 🎯 Backend Technologies

#### **Node.js**
- **Purpose**: JavaScript runtime for server-side development
- **Justification**:
  - Full-stack JavaScript development
  - Non-blocking I/O for high performance
  - Large npm ecosystem
  - Scalable architecture
- **Problem Solved**: Enables server-side logic with same language as frontend

#### **Express.js**
- **Purpose**: Web framework for Node.js
- **Justification**:
  - Minimalist and flexible
  - Middleware architecture
  - Easy routing configuration
  - Extensive middleware ecosystem
- **Problem Solved**: Provides structured approach to building REST APIs

#### **MongoDB**
- **Purpose**: NoSQL database for data persistence
- **Justification**:
  - Flexible schema design
  - Scalable for large datasets
  - Rich query capabilities
  - JSON-like document structure
- **Problem Solved**: Handles complex data relationships and evolving schema requirements

#### **Mongoose**
- **Purpose**: Object modeling for MongoDB
- **Justification**:
  - Schema validation
  - Middleware support
  - Query building
  - Population of related documents
- **Problem Solved**: Provides structured approach to database operations with validation

#### **Socket.io**
- **Purpose**: Real-time server-side communication
- **Justification**:
  - WebSocket server implementation
  - Room management
  - Event-driven architecture
  - Cross-browser support
- **Problem Solved**: Powers real-time features with reliable connection management

#### **JSON Web Tokens (JWT)**
- **Purpose**: Authentication and authorization
- **Justification**:
  - Stateless authentication
  - Secure token-based system
  - Expiration handling
  - Role-based access control
- **Problem Solved**: Provides secure authentication mechanism without session storage

#### **Nodemailer**
- **Purpose**: Email sending functionality
- **Justification**:
  - SMTP support
  - Template-based emails
  - Attachment handling
  - Multiple transport options
- **Problem Solved**: Enables email notifications for various system events

#### **Discord.js Integration**
- **Purpose**: Discord webhook integration
- **Justification**:
  - Rich embed message support
  - Event announcements
  - Club-specific notifications
  - Automated posting capabilities
- **Problem Solved**: Provides automated event announcements to Discord channels

---

## 🚀 Advanced Features

### Tier A: Core Advanced Features

#### 1. 🏆 Hackathon Team Registration [8 Marks]

**Feature Selection Justification:**
- **Business Value**: Addresses real-world hackathon coordination challenges
- **Technical Complexity**: Demonstrates advanced workflow management and team dynamics
- **User Experience**: Solves common pain points in team formation and registration

**Design Choices & Implementation Approach:**

**Team Creation Workflow:**
```javascript
// Team leader initiates team creation
const createTeam = async (teamData) => {
  const team = new Team({
    name: teamData.name,
    maxSize: teamData.maxSize,
    leader: userId,
    event: eventId,
    inviteCode: generateUniqueCode(),
    status: 'forming'
  });
  await team.save();
  return team;
};
```

**Invite System Design:**
- **Unique Code Generation**: Cryptographically secure random codes
- **Link-based Invites**: Shareable URLs with embedded tokens
- **Member Status Tracking**: Pending/Accepted/Rejected states
- **Automatic Completion**: Team marked complete when all slots filled

**Technical Decisions:**
1. **Database Schema**: Separate Team and TeamMember collections for scalability
2. **Invite Codes**: Short-lived tokens with expiration for security
3. **Real-time Updates**: Socket.io for live team status changes
4. **Ticket Generation**: Batch QR code creation for team members

**Implementation Highlights:**
- Team management dashboard with real-time member status
- Invite tracking with expiration handling
- Automatic ticket generation upon team completion
- Role-based permissions (leader vs member actions)

#### 2. 💳 Merchandise Payment Approval Workflow [8 Marks]

**Feature Selection Justification:**
- **Business Need**: Addresses payment verification challenges for physical merchandise
- **Process Automation**: Reduces manual administrative overhead
- **User Trust**: Provides transparent payment tracking system

**Design Choices & Implementation Approach:**

**Payment State Machine:**
```javascript
const orderStates = {
  PENDING_PAYMENT: 'pending_payment',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

const transitionOrder = async (orderId, newState, proofData) => {
  const order = await Order.findById(orderId);
  if (isValidTransition(order.status, newState)) {
    order.status = newState;
    if (proofData) order.paymentProof = proofData;
    await order.save();
    emitStatusChange(order);
  }
};
```

**File Upload System:**
- **Image Validation**: File type, size, and format checking
- **Cloud Storage**: Secure file storage with CDN delivery
- **Proof Management**: Version control for payment proofs

**Technical Decisions:**
1. **State Machine Pattern**: Ensures valid order status transitions
2. **File Handling**: Multer for multipart form data processing
3. **Admin Dashboard**: Separate interface for payment approval
4. **QR Code Generation**: Conditional generation based on approval status

**Implementation Highlights:**
- Payment proof upload with image validation
- Admin approval dashboard with batch operations
- Automatic stock management on approval
- QR code generation only for approved orders
- Email notifications for status changes

### Tier B: Real-time & Communication Features

#### 1. 💬 Real-Time Discussion Forum [6 Marks]

**Feature Selection Justification:**
- **Community Building**: Fosters engagement around events
- **Support System**: Enables Q&A between participants and organizers
- **Real-time Collaboration**: Live discussions enhance event experience

**Design Choices & Implementation Approach:**

**Forum Architecture:**
```javascript
// Message threading system
const createMessage = async (content, eventId, userId, parentMessageId = null) => {
  const message = new Message({
    content,
    eventId,
    senderId: userId,
    parentMessageId,
    timestamp: new Date(),
    reactions: new Map(),
    isPinned: false
  });
  
  await message.save();
  await message.populate('senderId', 'firstName lastName');
  
  // Real-time broadcast
  socket.to(`event-${eventId}`).emit('new-message', message);
  return message;
};
```

**Real-time Features:**
- **Socket.io Integration**: Live message delivery
- **Message Threading**: Hierarchical conversation structure
- **Reaction System**: Emoji reactions with real-time updates
- **Moderation Tools**: Pin, delete, and announcement capabilities

**Technical Decisions:**
1. **Room-based Sockets**: Separate rooms for each event
2. **Message Pagination**: Efficient loading of message history
3. **Notification System**: Real-time alerts for new messages
4. **Permission System**: Role-based message actions

**Implementation Highlights:**
- Real-time message delivery with typing indicators
- Message threading for organized conversations
- Organizer moderation tools (pin, delete, announcements)
- Reaction system with emoji support
- Notification system for new messages and replies

#### 2. 🔐 Organizer Password Reset Workflow [6 Marks]

**Feature Selection Justification:**
- **Security**: Secure password management for organizers
- **Admin Control**: Centralized password reset management
- **Audit Trail**: Complete history of password reset requests

**Design Choices & Implementation Approach:**

**Request Management System:**
```javascript
const createPasswordResetRequest = async (organizerId, clubName, reason) => {
  const request = new PasswordResetRequest({
    organizerId,
    clubName,
    reason,
    status: 'pending',
    requestDate: new Date(),
    adminComments: []
  });
  
  await request.save();
  await request.populate('organizerId', 'firstName lastName email');
  
  // Notify admins
  socket.to('admin-room').emit('new-reset-request', request);
  return request;
};
```

**Admin Approval Process:**
- **Request Dashboard**: Centralized view of all requests
- **Status Tracking**: Pending/Approved/Rejected states
- **Comment System**: Admin notes and communication
- **Password Generation**: Secure temporary password creation

**Technical Decisions:**
1. **Request Lifecycle**: Complete state tracking from request to completion
2. **Admin Notifications**: Real-time alerts for new requests
3. **Secure Password Generation**: Cryptographically secure temporary passwords
4. **Audit Logging**: Complete history of all password changes

**Implementation Highlights:**
- Organizer request form with reason tracking
- Admin dashboard for request management
- Automatic password generation and distribution
- Request status tracking and history
- Email notifications for status changes

### Tier C: Integration & Enhancement Features

#### 1. 📊 Anonymous Feedback System [2 Marks]

**Feature Selection Justification:**
- **Continuous Improvement**: Collects valuable event feedback
- **User Engagement**: Gives voice to participants
- **Quality Metrics**: Provides data for event optimization

**Design Choices & Implementation Approach:**

**Feedback Collection System:**
```javascript
const submitFeedback = async (eventId, userId, rating, comment) => {
  // Verify attendance before allowing feedback
  const attendance = await Attendance.findOne({ eventId, userId });
  if (!attendance) {
    throw new Error('Must attend event to provide feedback');
  }
  
  const feedback = new Feedback({
    eventId,
    userId,
    rating: Math.max(1, Math.min(5, rating)), // Clamp 1-5
    comment: comment.trim(),
    isAnonymous: true,
    submissionDate: new Date()
  });
  
  await feedback.save();
  await updateEventAggregates(eventId);
  return feedback;
};
```

**Aggregation System:**
- **Rating Calculations**: Real-time average rating updates
- **Comment Filtering**: Filter by rating levels
- **Anonymous Processing**: Remove user identifiers from public view

**Technical Decisions:**
1. **Attendance Verification**: Only attendees can provide feedback
2. **Anonymous Storage**: Separate user ID from public display
3. **Real-time Aggregation**: Update event averages on new feedback
4. **Rating Validation**: Ensure 1-5 star rating range

**Implementation Highlights:**
- Star rating system (1-5) with visual feedback
- Anonymous comment submission
- Organizer dashboard with aggregated ratings
- Filter feedback by rating levels
- Export functionality for analysis

---

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (v5.0 or higher)
- **Git** for version control

### 🚀 Quick Start

#### 1. **Clone Repository**
```bash
git clone <repository-url>
cd event-management-system
```

#### 2. **Install Dependencies**

**Backend Dependencies:**
```bash
cd backend
npm install
```

**Frontend Dependencies:**
```bash
cd frontend
npm install
```

#### 3. **Environment Configuration**

**Backend Environment (.env):**
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/event-management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Discord Webhook Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
CLUB_CULTURAL_WEBHOOK_URL=https://discord.com/api/webhooks/CULTURAL_WEBHOOK_ID/CULTURAL_WEBHOOK_TOKEN
CLUB_TECHNICAL_WEBHOOK_URL=https://discord.com/api/webhooks/TECHNICAL_WEBHOOK_ID/TECHNICAL_WEBHOOK_TOKEN
CLUB_SPORTS_WEBHOOK_URL=https://discord.com/api/webhooks/SPORTS_WEBHOOK_ID/SPORTS_WEBHOOK_TOKEN
CLUB_OTHERS_WEBHOOK_URL=https://discord.com/api/webhooks/OTHERS_WEBHOOK_ID/OTHERS_WEBHOOK_TOKEN

# Server Configuration
PORT=5000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**Frontend Environment (.env):**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

#### 4. **Database Setup**

**Start MongoDB:**
```bash
# For macOS with Homebrew
brew services start mongodb-community

# For Ubuntu/Debian
sudo systemctl start mongod

# For Windows
net start MongoDB
```

**Seed Database (Optional):**
```bash
cd backend
npm run seed
```

#### 5. **Start Development Servers**

**Backend Server:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend Development Server:**
```bash
cd frontend
npm start
# Application runs on http://localhost:3000
```

#### 6. **Access Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Documentation**: http://localhost:5000/api-docs

### 📦 Production Deployment

#### **Backend Deployment:**
```bash
# Build for production
cd backend
npm run build

# Start production server
npm start
```

#### **Frontend Deployment:**
```bash
# Build for production
cd frontend
npm run build

# Deploy build folder to web server
```

### 🐳 Docker Setup (Optional)

**Dockerfile (Backend):**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
  
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/event-management
    depends_on:
      - mongodb
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

---

## 📝 Important Notes

### 🔒 Security Considerations

1. **JWT Secret**: Use a strong, unique secret key in production
2. **Environment Variables**: Never commit `.env` files to version control
3. **Password Security**: Use bcrypt for password hashing
4. **File Uploads**: Validate all uploaded files for security
5. **CORS Configuration**: Configure proper CORS policies for production

### 🚀 Performance Optimizations

1. **Database Indexing**: Add indexes for frequently queried fields
2. **Image Optimization**: Compress uploaded images
3. **Caching**: Implement Redis for session and data caching
4. **CDN**: Use CDN for static assets in production
5. **Lazy Loading**: Implement lazy loading for large datasets

### 🔄 Backup Strategy

1. **Database Backups**: Regular MongoDB backups
2. **File Backups**: Backup uploaded files and images
3. **Configuration Backups**: Version control for environment configurations
4. **Recovery Plan**: Document disaster recovery procedures

### 📊 Monitoring & Logging

1. **Application Logs**: Implement structured logging
2. **Error Tracking**: Use error monitoring services
3. **Performance Metrics**: Monitor API response times
4. **User Analytics**: Track user behavior and system usage

### 🧪 Testing

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database operations
3. **E2E Tests**: Test complete user workflows
4. **Load Testing**: Test system performance under load

### 📱 Browser Compatibility

- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions
- **Mobile**: Responsive design for all screen sizes

### 🌐 API Documentation

- **Swagger/OpenAPI**: Complete API documentation at `/api-docs`
- **Postman Collection**: Exportable API collection for testing
- **Rate Limiting**: Implement API rate limiting for production
- **Versioning**: API versioning for backward compatibility

### 📞 Support & Maintenance

1. **Documentation**: Keep documentation updated
2. **Code Reviews**: Regular code review process
3. **Dependencies**: Keep dependencies updated
4. **Security Updates**: Regular security patch updates
5. **User Feedback**: Collect and act on user feedback

---

## 🎯 Conclusion

This Event Management System demonstrates advanced full-stack development capabilities with:

- **Scalable Architecture**: Modular design supporting growth
- **Real-time Features**: Socket.io integration for live updates
- **Security**: Robust authentication and authorization
- **User Experience**: Intuitive interface with comprehensive features
- **Business Value**: Practical solutions for real-world event management

The system successfully implements all selected advanced features with proper justification for each technical decision, providing a complete solution for modern event management needs.

---

**📧 Contact**: For support or questions, please refer to project documentation or contact development team.

**🔄 Version**: 1.0.0
**📅 Last Updated**: 2024