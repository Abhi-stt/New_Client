export default function TermsOfService() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose max-w-none">
        <h2>Acceptance of Terms</h2>
        <p>
          By using CA Portal Email Integration, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
        </p>

        <h2>Service Description</h2>
        <p>
          CA Portal Email Integration provides email management and forwarding services that allow users to:
        </p>
        <ul>
          <li>Connect their Gmail accounts securely</li>
          <li>Sync and view emails within the application</li>
          <li>Create and manage email forwarding rules</li>
          <li>Forward emails based on configurable conditions</li>
        </ul>

        <h2>User Responsibilities</h2>
        <p>
          As a user of our service, you agree to:
        </p>
        <ul>
          <li>Use the service only for lawful purposes</li>
          <li>Not attempt to gain unauthorized access to any part of the service</li>
          <li>Not use the service to send spam or malicious content</li>
          <li>Comply with all applicable laws and regulations</li>
          <li>Maintain the security of your account credentials</li>
        </ul>

        <h2>Gmail API Usage</h2>
        <p>
          Our service uses Google's Gmail API to provide email functionality. By using our service, you acknowledge that:
        </p>
        <ul>
          <li>You are granting us permission to access your Gmail account</li>
          <li>We will only access the minimum required data for our services</li>
          <li>You can revoke access at any time through your Google account settings</li>
          <li>Our use of the Gmail API is subject to Google's Terms of Service</li>
        </ul>

        <h2>Data Privacy</h2>
        <p>
          We are committed to protecting your privacy. Please review our Privacy Policy for detailed information about how we collect, use, and protect your data.
        </p>

        <h2>Service Availability</h2>
        <p>
          We strive to maintain high service availability but cannot guarantee uninterrupted service. We reserve the right to:
        </p>
        <ul>
          <li>Perform maintenance and updates</li>
          <li>Modify or discontinue features</li>
          <li>Suspend service for security or legal reasons</li>
        </ul>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our service.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the application interface.
        </p>

        <h2>Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us at:
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
