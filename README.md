
<h1>🎯 CareCamps Server</h1>

<p><strong>A health camp management system</strong> built with the <strong>MERN stack</strong>, allowing organizers to add and manage health camps while users/participants can join and pay for camps. The backend is powered by <strong>Node.js, Express.js, and MongoDB</strong>, ensuring secure authentication and payment processing with <strong>Firebase and Stripe</strong>.</p>

<h2>🚀 Technologies Used</h2>
<p>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
</p>
<hr>

<h2>✨ Core Features</h2>
<ul>
  <li>✅ <strong>Camp Listings</strong>: Users can browse available health camps added by organizers.</li>
  <li>✅ <strong>Camp Details</strong>: Clicking on a camp shows more details, including an option to join.</li>
  <li>✅ <strong>User Authentication</strong>: Firebase handles secure login and registration.</li>
  <li>✅ <strong>Dashboard System</strong>: 
    <ul>
      <li>Participants can manage their joined camps.</li>
      <li>Organizers can add, update, and remove camps.</li>
    </ul>
  </li>
  <li>✅ <strong>Secure Payment System</strong>: Stripe integration for camp fee payments.</li>
  <li>✅ <strong>Pagination, Search & Sorting</strong>: Implemented on various pages for optimized user experience.</li>
  <li>✅ <strong>JWT Security</strong>: Secure API authentication with JSON Web Token (JWT) and Axios interceptors.</li>
</ul>
<hr>

<h2>📦 Dependencies</h2>
<ul>
  <li><strong>Frontend:</strong>
    <ul>
      <li>react (^18.3.1)</li>
      <li>react-router-dom (^6.28.1)</li>
      <li>react-icons (^5.4.0)</li>
      <li>sweetalert2 (^11.15.10)</li>
      <li>axios (^1.7.9)</li>
    </ul>
  </li>
  <li><strong>Backend:</strong>
    <ul>
      <li>express (^4.21.2)</li>
      <li>mongodb (^6.12.0)</li>
      <li>jsonwebtoken (^9.0.2)</li>
      <li>stripe (^17.5.0)</li>
      <li>cors (^2.8.5)</li>
      <li>dotenv (^16.4.7)</li>
    </ul>
  </li>
</ul>
<p><em>(Full dependencies list available in <code>package.json</code>.)</em></p>
<hr>

<h2>🛠️ Installation & Running Locally</h2>
<p>Follow these steps to set up <strong>CareCamps</strong> on your local machine:</p>

<h3>1️⃣ Clone the Repository</h3>
<pre><code>git clone https://github.com/ashis263/care-camps-server.git
cd care-camps-server</code></pre>

<h3>2️⃣ Install Dependencies</h3>
<pre><code>npm install</code></pre>

<h3>3️⃣ Set Up Environment Variables</h3>
<p>Create a <code>.env</code> file and add the following:</p>
<pre><code>PORT=5000
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_SECRET_KEY
STRIPE_SECRET=YOUR_STRIPE_SECRET_KEY</code></pre>
<p><em>(Replace with your actual credentials.)</em></p>

<h3>4️⃣ Start the Development Server</h3>
<pre><code>npm start</code></pre>
<p>The backend will run at <code>http://localhost:5000/</code> by default.</p>
<hr>

<h2>🌐 Live Demo</h2>
<ul>
  <li>🚀 <a href="https://care-camps.web.app/">Firebase Deployment</a></li>
  <li>🚀 <a href="https://care-camps.netlify.app/">Netlify Deployment</a></li>
</ul>
<hr>

<h2>🤝 Contribution</h2>
<p>Feel free to fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you’d like to improve.</p>
