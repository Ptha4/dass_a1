# 🔧 Backend reCAPTCHA Import Fix

## **Problem:**
```
TypeError: expressRecaptcha is not a function
```

## **Solution Applied:**
Changed the import syntax from:
```javascript
const expressRecaptcha = require('express-recaptcha');
const recaptcha = expressRecaptcha({...});
```

To:
```javascript
const Recaptcha = require('express-recaptcha');
const recaptcha = new Recaptcha({...});
```

## **What Changed:**
1. ✅ Fixed import to use `Recaptcha` class
2. ✅ Added `new` keyword for instantiation
3. ✅ Compatible with express-recaptcha v5.1.0

## **Next Steps:**
1. **Restart the backend server**:
   ```bash
   cd /Users/tharanitheertha/dass_a1/backend
   npm start
   ```

2. **Test the login again** - should work now!

## **Expected Result:**
- ✅ Backend starts without errors
- ✅ reCAPTCHA middleware loads properly
- ✅ Login/registration works with CAPTCHA bypass

**The backend should now start successfully!** 🎉
