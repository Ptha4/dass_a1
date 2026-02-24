# 🔍 Payment Proof Debug - TROUBLESHOOTING GUIDE

## 🚨 **Current Issue**

Payment proof upload appears to work, but organizer sees 0 pending payment proofs.

## 📊 **Debug Analysis**

### **✅ What's Working:**
- File upload successful (212KB PNG image)
- Registration found correctly
- Event data populated correctly
- Event organizerId: `699c70aede706889f3977e82`

### **❌ What's Missing:**
- No "Payment proof saved successfully with ID:" message
- No "=== END PAYMENT PROOF CREATION DEBUG ===" message
- Organizer sees 0 pending proofs

## 🔍 **Likely Causes**

### **1. Payment Proof Save Error:**
```javascript
// The save() operation is failing silently
await paymentProof.save(); // This might be throwing an error
```

### **2. Database Schema Issue:**
```javascript
// Possible validation error in PaymentProof schema
{
    registrationId: ObjectId (unique: true), // Might conflict with existing proof
    userId: ObjectId,
    eventId: ObjectId,
    // ... other fields
}
```

### **3. Base64 Data Too Large:**
```javascript
// 212KB image = ~285KB base64 string
// MongoDB document size limit: 16MB
// Should be fine, but worth checking
```

## 🛠️ **Debug Steps**

### **1. Check Payment Proof Creation:**
```bash
# Look for these logs in next upload attempt:
=== PAYMENT PROOF CREATION DEBUG ===
Creating payment proof with data: {...}
Payment proof saved successfully with ID: ...
=== END PAYMENT PROOF CREATION DEBUG ===

# OR error logs:
ERROR saving payment proof: {...}
Save error details: {...}
```

### **2. Check Existing Payment Proofs:**
```bash
# Check database for existing payment proofs
node -e "
const mongoose = require('mongoose');
const PaymentProof = require('./models/PaymentProof');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('=== CHECKING EXISTING PAYMENT PROOFS ===');
    
    const allProofs = await PaymentProof.find({});
    console.log('Total payment proofs:', allProofs.length);
    
    const pendingProofs = await PaymentProof.find({ status: 'pending' });
    console.log('Pending payment proofs:', pendingProofs.length);
    
    pendingProofs.forEach((proof, index) => {
      console.log(\`Pending Proof \${index + 1}:\`, {
        id: proof._id,
        registrationId: proof.registrationId,
        userId: proof.userId,
        eventId: proof.eventId,
        status: proof.status,
        uploadedAt: proof.uploadedAt
      });
    });
    
    // Check for proofs with this registration ID
    const regProofs = await PaymentProof.find({ 
      registrationId: '699d61b76a7b50a546edbb52' 
    });
    console.log('Proofs for this registration:', regProofs.length);
    
    mongoose.disconnect();
  })
  .catch(console.error);
"
```

### **3. Check Organizer Events:**
```bash
# Check if organizer has events
node -e "
const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('=== CHECKING ORGANIZER EVENTS ===');
    
    const organizerId = '699c70aede706889f3977e82';
    const events = await Event.find({ organizerId });
    
    console.log('Organizer events:', events.length);
    events.forEach((event, index) => {
      console.log(\`Event \${index + 1}:\`, {
        id: event._id,
        name: event.eventName,
        type: event.eventType,
        organizerId: event.organizerId
      });
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
"
```

### **4. Test Upload Again:**
```bash
# Try uploading again and watch for detailed logs
# The new error handling should show any save errors
```

## 🎯 **Expected Debug Output**

### **✅ Successful Upload:**
```
=== PAYMENT PROOF CREATION DEBUG ===
Creating payment proof with data: {
  registrationId: 699d61b76a7b50a546edbb52,
  userId: 699d0748ba84bd253b654245,
  eventId: 699d618a6a7b50a546edb7e2,
  eventOrganizerId: 699c70aede706889f3977e82,
  fileName: 'Screenshot 2026-02-20 at 08.07.22.png',
  status: 'pending'
}
Payment proof saved successfully with ID: 507f1f2b3d4a2b8c9e8f7d1
=== END PAYMENT PROOF CREATION DEBUG ===
Registration saved successfully with payment proof reference
```

### **❌ Error Case:**
```
=== PAYMENT PROOF CREATION DEBUG ===
Creating payment proof with data: {...}
ERROR saving payment proof: [Error: Duplicate key error...]
Save error details: {
  name: 'MongoServerError',
  message: 'E11000 duplicate key error collection...',
  code: 11000
}
```

## 🔧 **Possible Fixes**

### **1. Remove Unique Constraint:**
```javascript
// In PaymentProof.js, change:
registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true,
    unique: true  // REMOVE THIS LINE
}
```

### **2. Handle Duplicate Registration:**
```javascript
// Check if payment proof already exists for this registration
const existingProof = await PaymentProof.findOne({ registrationId });
if (existingProof) {
    return res.status(400).json({ 
        message: 'Payment proof already exists for this registration' 
    });
}
```

---

**🔍 Run the debug commands above to identify the exact issue!**
