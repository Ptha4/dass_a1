# 🚀 Payment Processing Database Migration - DEPLOYMENT GUIDE

## 📋 **Overview**

This guide explains how to migrate payment proof storage from local file system to database for production deployment.

## 🎯 **Why Database Storage?**

### **✅ Benefits:**
- **Scalability**: Handle multiple server instances
- **Performance**: CDN integration for faster image delivery
- **Security**: Controlled access through API endpoints
- **Backup**: Automatic database backups include payment proofs
- **Analytics**: Easy querying and reporting

### **❌ Local Storage Issues:**
- **Docker**: Files lost on container restart
- **Load Balancing**: Files not available across instances
- **Disk Space**: Limited server storage capacity
- **Backup Complexity**: Manual file backup required

## 🏗️ **New Architecture**

### **PaymentProof Model:**
```javascript
{
  registrationId: ObjectId,    // Reference to registration
  userId: ObjectId,         // User who uploaded
  eventId: ObjectId,         // Event reference
  fileName: String,          // Stored filename
  originalName: String,       // Original filename
  mimeType: String,          // File type
  fileSize: Number,          // File size in bytes
  filePath: String,          // Current file path
  publicUrl: String,         // Public accessible URL
  uploadedAt: Date,          // Upload timestamp
  status: String,            // pending/approved/rejected
  reviewedBy: ObjectId,       // Who reviewed
  reviewedAt: Date,          // Review timestamp
  reviewNotes: String,        // Review comments
  rejectionReason: String      // Rejection reason
}
```

### **API Endpoints:**
- `GET /api/payment-proofs/:id` - Serve payment proof image
- `GET /api/payment-proofs/:id/details` - Get payment proof details
- `POST /api/register/:registrationId/payment-proof` - Upload payment proof
- `GET /api/register/pending-approvals` - Get pending approvals
- `PATCH /api/register/:registrationId/approve-payment` - Approve/reject payment

## 🔄 **Migration Process**

### **1. Backup Current Data**
```bash
# Backup current payment proof files
cp -r uploads/payment-proofs/ backups/payment-proofs-$(date +%Y%m%d-%H%M%S)/

# Backup database
mongodump --db event-management --out backups/db-$(date +%Y%m%d-%H%M%S)/
```

### **2. Run Migration Script**
```bash
cd backend
npm run migrate:payment-proofs
```

### **3. Migration Script Features:**
- ✅ **Finds all registrations** with local file payment proofs
- ✅ **Creates PaymentProof records** in database
- ✅ **Updates registration references** to point to database IDs
- ✅ **Preserves approval status** and timestamps
- ✅ **Handles duplicates** by skipping already migrated records
- ✅ **Detailed logging** of migration progress

### **4. Expected Output:**
```
=== MIGRATING PAYMENT PROOFS TO DATABASE ===
Connected to database
Found 15 registrations with local file payment proofs
✅ Migrated payment proof for registration 507f1f2b3d4a2b8c9e8f7d1
✅ Migrated payment proof for registration 507f1f2b3d4a2b8c9e8f7d2
...
=== MIGRATION SUMMARY ===
Total registrations with proofs: 15
Successfully migrated: 15
Skipped (already migrated): 0
=== END MIGRATION ===
```

## 🚀 **Deployment Steps**

### **1. Pre-Deployment Checklist**
- [ ] **Backup current data** (files + database)
- [ ] **Test migration** in staging environment
- [ ] **Verify payment proof functionality** after migration
- [ ] **Update frontend** to use new API endpoints
- [ ] **Test file serving** through new routes

### **2. Production Deployment**
```bash
# 1. Deploy backend code with new PaymentProof model
git add .
git commit -m "Implement database storage for payment proofs"
git push origin main

# 2. Run migration on production server
npm run migrate:payment-proofs

# 3. Restart application
npm start
```

### **3. Post-Deployment Verification**
```bash
# Test payment proof upload
curl -X POST http://localhost:5000/api/register/REGISTRATION_ID/payment-proof \
  -H "x-auth-token: YOUR_TOKEN" \
  -F "paymentProof=@/path/to/test-image.jpg"

# Test payment proof retrieval
curl -X GET http://localhost:5000/api/payment-proofs/PROOF_ID \
  -H "x-auth-token: YOUR_TOKEN"

# Test pending approvals
curl -X GET http://localhost:5000/api/register/pending-approvals \
  -H "x-auth-token: ORGANIZER_TOKEN"
```

## 🔧 **Configuration Updates**

### **Environment Variables** (if using cloud storage):
```env
# AWS S3 (optional for production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Cloudinary (optional for production)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📊 **Database Indexes**

The PaymentProof model includes optimized indexes:

```javascript
// For fast lookups
PaymentProofSchema.index({ registrationId: 1 });
PaymentProofSchema.index({ userId: 1 });
PaymentProofSchema.index({ eventId: 1 });
PaymentProofSchema.index({ status: 1 });
PaymentProofSchema.index({ uploadedAt: -1 });
```

## 🔒 **Security Considerations**

### **File Access Control:**
- ✅ **Authorization checks** for file access
- ✅ **Owner verification** (user who uploaded)
- ✅ **Organizer access** (event organizers)
- ✅ **Secure file serving** with proper headers

### **File Validation:**
- ✅ **File type validation** (images only)
- ✅ **File size limits** enforced
- ✅ **Path traversal prevention**
- ✅ **Malicious file detection**

## 🎯 **Benefits After Migration**

### **For Production:**
- ✅ **Scalable file storage** with CDN integration
- ✅ **Database backups** include payment proof references
- ✅ **Multi-server support** with shared database
- ✅ **Fast image delivery** through optimized endpoints
- ✅ **Analytics capabilities** for payment proof tracking

### **For Development:**
- ✅ **Easier debugging** with structured data
- ✅ **Better testing** with mockable database
- ✅ **Clear data model** for payment proofs
- ✅ **Improved error handling** and logging

## 🔄 **Rollback Plan**

If migration fails:

```bash
# 1. Restore database backup
mongorestore backups/db-YYYYMMDD-HHMMSS/event-management

# 2. Restore file backup
cp -r backups/payment-proofs-YYYYMMDD-HHMMSS/ uploads/payment-proofs/

# 3. Update code to previous version
git checkout PREVIOUS_COMMIT_HASH
```

## 📞 **Support**

### **Migration Issues:**
- **Database connection**: Check MONGODB_URI in .env
- **File not found**: Verify uploads/payment-proofs/ directory exists
- **Permission errors**: Ensure proper file system permissions
- **Memory issues**: Run migration with increased Node.js memory limit

### **Post-Migration Issues:**
- **404 errors**: Check file paths in PaymentProof documents
- **Access denied**: Verify authorization logic in routes
- **Slow loading**: Add CDN integration for file serving

---

**🎮 Payment proof database migration provides a robust, scalable solution for production deployment!**
