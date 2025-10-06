export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <h2>Information We Collect</h2>
        <p>
          CA Portal Email Integration collects and processes the following information:
        </p>
        <ul>
          <li>Gmail account information (email address, profile information)</li>
          <li>Email content for syncing and forwarding purposes</li>
          <li>User preferences and settings</li>
          <li>Usage analytics and error logs</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>
          We use the collected information to:
        </p>
        <ul>
          <li>Provide email integration services</li>
          <li>Sync and display your emails</li>
          <li>Execute email forwarding rules as configured by you</li>
          <li>Improve our services and user experience</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement appropriate security measures to protect your information:
        </p>
        <ul>
          <li>All data transmission is encrypted using HTTPS</li>
          <li>OAuth 2.0 authentication for secure Gmail access</li>
          <li>Regular security audits and updates</li>
          <li>Access controls and monitoring</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as required by law.
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and data</li>
          <li>Withdraw consent for data processing</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
          <br />
          Email: abhishek@thecodingstudio.in
        </p>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
