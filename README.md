# XBS Events - Ubuntu Server Deployment Guide

Complete guide for deploying the XBS Events application on a fresh Ubuntu server.

## System Requirements

- Ubuntu 20.04+ (tested on Ubuntu 22.04)
- Minimum 1GB RAM (512MB possible but requires swap)
- 10GB+ free disk space
- Root or sudo access

## Step 1: Initial System Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

## Step 2: Install Node.js 20+

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

## Step 3: Install and Configure MySQL

```bash
# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation
```

### MySQL Secure Installation Responses:

1. **VALIDATE PASSWORD**: `y` (Yes)
2. **Password Policy**: `1` (MEDIUM)
3. **Root Password**: Set a strong password
4. **Confirm Password**: Re-enter same password
5. **Continue**: `y`
6. **Remove anonymous users**: `y`
7. **Disallow root remote login**: `y`
8. **Remove test database**: `y`
9. **Reload privileges**: `y`

```bash
# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Create application database and user
sudo mysql -u root -p
```

**Execute these SQL commands:**

```sql
CREATE DATABASE xbs_events;
CREATE USER 'xbs_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON xbs_events.* TO 'xbs_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Test database connection:**

```bash
mysql -u xbs_user -p xbs_events
# Enter password, then EXIT;
```

## Step 4: Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/your-username/xbs-events.git
cd xbs-events

# Install dependencies
npm install
```

## Step 5: Configure Environment

Create production environment file:

```bash
nano .env
```

**Add this content (replace password with your MySQL password):**

```env
# Production Environment
DB_PROVIDER="mysql"
DATABASE_URL="mysql://xbs_user:your_secure_password_here@localhost:3306/xbs_events"

# Generate a secure JWT secret (see command below)
JWT_SECRET="your_secure_jwt_secret_here"

NODE_ENV="production"
```

**Generate a secure JWT secret:**

```bash
node -e "console.log('JWT_SECRET=\"' + require('crypto').randomBytes(64).toString('hex') + '\"')"
# Copy the output and replace JWT_SECRET in .env file
```

## Step 6: Setup Database Schema

```bash
# Create database tables
npm run db:push

# Seed initial data (creates admin users)
npm run db:seed

# Verify setup
mysql -u xbs_user -p xbs_events -e "SHOW TABLES; SELECT email, role FROM users;"
```

## Step 7: Build Application

### For servers with 1GB+ RAM:

```bash
npm run build
```

### For servers with 512MB RAM:

```bash
# Build on local machine and transfer
# On your local machine:
npm run build
COPYFILE_DISABLE=1 tar -czf next-build.tar.gz .next

# Transfer to server:
scp next-build.tar.gz root@your-server-ip:~/xbs-events/

# On server:
tar -xzf next-build.tar.gz
rm next-build.tar.gz
```

## Step 8: Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 configuration file
nano ecosystem.config.js
```

**Add this content (adjust path as needed):**

```javascript
module.exports = {
  apps: [
    {
      name: "xbs-events",
      script: "npm",
      args: "start",
      cwd: "/root/xbs-events", // Adjust to your actual path
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
```

```bash
# Create logs directory
mkdir logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
# Follow the instructions shown (run the suggested command)
```
