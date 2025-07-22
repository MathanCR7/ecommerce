# Full-Stack MERN E-commerce Platform



<p align="center">
  A complete, feature-rich e-commerce solution built with the MERN stack. This project includes a modern, responsive customer-facing website and a powerful, separate admin dashboard for total business management.
</p>

<br>

<!-- Optional: Add a screenshot or GIF of your application here -->
<!-- ![Project Demo](./assets/demo.gif) -->

## ✨ Core Features

### 🛍️ Customer E-commerce Site (`ecomm_website_client`)
- **Secure Authentication:** JWT-based login/registration, plus Google OAuth for one-click access.
- **Dynamic Product Catalog:** Browse, search, and filter products by category.
- **Shopping Cart & Wishlist:** Add items to a persistent cart and save favorites to a wishlist.
- **Seamless Checkout:** Securely pay using the Razorpay payment gateway.
- **Geofenced Delivery:** An intelligent system validates if the delivery address is within a custom-defined service area.
- **User Profile Management:** Users can update their profile, manage addresses, and view order history.
- **Order Tracking:** Real-time status updates for placed orders.

### ⚙️ Administrative Dashboard (`admin_dashboard_client`)
- **Analytics Dashboard:** At-a-glance view of sales, orders, and customer metrics.
- **User Management:** View, manage, and monitor all registered customer accounts.
- **Product & Inventory Control:** Add, edit, and delete products, categories, and manage stock levels.
- **Order Management:** A comprehensive system to view, process, and update order statuses (e.g., "Processing", "Shipped", "Delivered").
- **Promotions & Coupons:** Create and manage discount codes to drive sales.
- **Point of Sale (POS):** A dedicated interface for in-store order creation.
- **Reports Generation:** Generate sales and activity reports for business analysis.

## 🛠️ Tech Stack & Architecture

This project is a monorepo-style setup with three main components: a Node.js backend, a React client for customers, and a separate React client for admins.

| Component         | Technologies                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**       | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white) |
| **Frontend**      | ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)                                                                                                |
| **Integrations**  | ![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF) ![Google OAuth](https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white) ![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white) ![Nodemailer](https://img.shields.io/badge/Nodemailer-3A99D8?style=for-the-badge&logo=gmail&logoColor=white)       |
| **Deployment**    | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)                                                                                                                                                                                                                                                                            |

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn
- MongoDB (local instance or a cloud URI from MongoDB Atlas)
- Docker (optional, for containerized setup)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

2. Configure Environment Variables
Navigate to the backend directory and create a .env file by copying the example:
Generated bash
cd backend
cp .env.example .env
Use code with caution.
Bash
Now, open the .env file and fill in your credentials for the database, JWT secrets, frontend URLs, and all integrated services (Razorpay, Google, Twilio, etc.).
3. Install Dependencies & Run
You will need to run the backend and both frontend clients in separate terminals.
Terminal 1: Start the Backend Server
Generated bash
cd backend
npm install
npm run dev
# Server will start on http://localhost:5000 (or your configured PORT)
Use code with caution.
Bash
Terminal 2: Start the E-commerce Client
Generated bash
cd ecomm_website_client
npm install
npm run dev
# App will be available at http://localhost:5173
Use code with caution.
Bash
Terminal 3: Start the Admin Dashboard Client
Generated bash
cd admin_dashboard_client
npm install
npm run dev
# App will be available at http://localhost:5170
Use code with caution.
Bash
🔑 Environment Variables (backend/.env)
Your .env file in the backend directory should look like this. Never commit your actual .env file to version control.
Generated env
# --- Server Configuration ---
NODE_ENV=development
PORT=5000

# --- Database ---
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

# --- Frontend URLs (for CORS) ---
FRONTEND_URLS=http://localhost:5173,http://localhost:5170
ECOM_FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5170

# --- Security / Session / JWT (Generate your own secrets) ---
SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET
JWT_SECRET=YOUR_RANDOM_JWT_SECRET
COOKIE_DOMAIN=localhost
COOKIE_EXPIRES_IN_MS=86400000

# --- Twilio ---
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID=YOUR_TWILIO_VERIFY_SID
TWilio_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER

# --- Email (Nodemailer with Gmail) ---
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM="Your Store Name <your-email@gmail.com>"

# --- Google OAuth ---
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# --- Razorpay ---
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_CURRENCY=INR

# --- Delivery Zone Polygon Coordinates ---
# Example: A square around a central point
DELIVERY_ZONE_POLYGON_COORDINATES='[[[LAT, LNG],[LAT, LNG],[LAT, LNG],[LAT, LNG],[LAT, LNG]]]'
Use code with caution.
Env
<br>
<br>
<p align="center">
<h2>👨‍💻 Author & Contact</h2>
<p>This project was created with ❤️ by <strong>MATHAN C</strong>.</p>
<p>Feel free to connect with me and check out my other work!</p>
<p>
<a href="https://www.linkedin.com/in/mathan-c/" target="_blank">
<img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
</a>
&nbsp;
<a href="https://github.com/MathanCR7" target="_blank">
<img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
</a>
</p>
</p>
