# Deployment Guide - Super Admin Feature

## 🚀 **Deployment Checklist**

### **1. Environment Variables Setup**

Create a `.env` file in your backend directory with these variables:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# Server
PORT=5000
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
NEXT_PUBLIC_HOST_URL=https://your-backend-domain.com

# Email (optional)
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_password
EMAIL_FROM=noreply@yourdomain.com
```

### **2. Frontend Environment Variables**

Create a `.env.local` file in your frontend root directory:

```env
NEXT_PUBLIC_HOST_URL=https://your-backend-domain.com
```

### **3. CORS Configuration**

The backend CORS is now configured to:
- ✅ Allow localhost in development
- ✅ Allow your deployment domains
- ✅ Use environment variables for dynamic domains

### **4. Super Admin User Creation**

After deployment, create the super admin user by calling:

```bash
# If your backend is running
curl -X POST https://your-backend-domain.com/api/users/create-demo-users
```

Or use the create-super-admin.js script:

```bash
HOST_URL=https://your-backend-domain.com node create-super-admin.js
```

## 🔧 **Troubleshooting 404 Errors**

### **Common Causes:**

1. **Missing Environment Variables**
   - Check if `NEXT_PUBLIC_HOST_URL` is set correctly
   - Verify the backend URL is accessible

2. **CORS Issues**
   - Add your frontend domain to the CORS allowed origins
   - Check browser console for CORS errors

3. **Backend Not Running**
   - Ensure the backend server is running on the correct port
   - Check if the super admin routes are properly loaded

4. **Database Connection**
   - Verify MongoDB connection string
   - Ensure the super admin user exists in the database

### **Debug Steps:**

1. **Check Backend Health:**
   ```bash
   curl https://your-backend-domain.com/api/users/create-demo-users
   ```

2. **Test Super Admin Login:**
   ```bash
   curl -X POST https://your-backend-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@demo.com","password":"superadmin123"}'
   ```

3. **Check Frontend API Calls:**
   - Open browser dev tools
   - Check Network tab for failed requests
   - Verify the API URLs are correct

## 📋 **Deployment Platforms**

### **Vercel (Frontend)**
1. Set environment variables in Vercel dashboard
2. Deploy with `npm run build`
3. Ensure `NEXT_PUBLIC_HOST_URL` points to your backend

### **Railway/Heroku (Backend)**
1. Set environment variables in platform dashboard
2. Ensure MongoDB connection string is correct
3. Deploy with `npm start`

### **MongoDB Atlas**
1. Create a cluster
2. Get connection string
3. Add your server IP to whitelist
4. Update `MONGO_URI` in environment variables

## 🔐 **Super Admin Credentials (After Deployment)**

Once deployed and users are created:

- **Email**: `superadmin@demo.com`
- **Password**: `superadmin123`
- **Role**: Super Admin

## 🧪 **Testing After Deployment**

1. **Test Login:**
   - Go to your deployed frontend
   - Login with super admin credentials
   - Should redirect to Super Admin Dashboard

2. **Test User Management:**
   - Create a new user
   - View user list
   - Delete a user

3. **Test Activity Monitoring:**
   - Check activity log
   - Verify login tracking

## 🚨 **Security Notes**

1. **Change Default Passwords** in production
2. **Use HTTPS** for all communications
3. **Restrict CORS** to your domains only
4. **Use Environment Variables** for sensitive data
5. **Enable MongoDB Authentication**

## 📞 **Support**

If you still get 404 errors:

1. Check the browser console for specific error messages
2. Verify all environment variables are set
3. Test the backend endpoints directly
4. Check if the super admin user exists in the database

The super admin feature should work seamlessly once properly deployed with the correct environment configuration!
