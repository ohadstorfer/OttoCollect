import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="page-container max-w-4xl mx-auto py-10">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="page-title">
            <span>Privacy Policy</span>
          </h1>
        </div>

        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            <p className="mb-6">
              Your privacy is important to us. This privacy statement explains how user (also "you", "your", "member") personal information is collected, used, secured and processed on ottocollect (also "we", "us", "our"). Many parts of ottocollect are freely accessible without the need for registration. In order to use some key-features of ottocollect (such as personal collection management), you must first complete the registration form. If you do not agree with our privacy policy you can't use our services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Collection of information</h2>
            <p className="mb-4">
              Your personal data is stored in our database, server logs and their backups, as well as on cookies in your browser. ottocollect does not collect any sensitive personal data.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Database</h3>
            <p className="mb-3">
              Most of your personal data is stored in our database. This includes your:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>first and last name (mandatory),</li>
              <li>email address (mandatory),</li>
              <li>Facebook or Google ID (if you use any of these services to log in).</li>
            </ul>
            <p className="mb-4">
              Any additional info you may provide while updating your personal page, writing forum posts and private message, answering surveys and updating your personal inventory.
            </p>
            <p className="mb-4">
              If you use ottocollect Marketplace, the following information is also stored:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>physical address (mandatory),</li>
              <li>chosen payment information (such as bank account number, PayPal/Skrill email address - mandatory for sellers).</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Server logs</h3>
            <p className="mb-4">
              As is true of most Web sites, we gather certain information automatically and store it in log files. This information includes internet protocol (IP) addresses, user-agent identifier, referring pages and time stamp. Any request which generates an exception (rare occasion) on ottocollect is saved in a specialized error log and may contain your ottocollect user name. Any request which generates a fatal error (very rare occasion) is additionally sent via email to our development team.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Cookies</h3>
            <p className="mb-4">
              A cookie is a small text file that is stored on a user's computer for record-keeping purposes. We use both session ID cookies and persistent cookies. We use session cookies to make it easier for you to navigate ottocollect. A session ID cookie expires when you close your browser. A persistent cookie remains on your hard drive for an extended period of time. We set a persistent cookie to make your session last longer, so you don't have to enter your password too often. You can remove persistent cookies by following directions provided by your Internet browser vendor.
            </p>
            <p className="mb-4">
              Ottocollect does not use cookies to store personally identifiable information such as your name or age.
            </p>
            <p className="mb-4">
              Third party vendors may use their own cookies to deliver ads related to ottocollect, while you are surfing other websites. This is called Behavioral Advertising or Interest-Based Advertising. For example, ottocollect may use a Google service called Remarketing, which delivers Ottocollect ads to users around the Google Display Network, based on their activity on ottocollect. You can change your Google ad settings on <a href="https://adssettings.google.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://adssettings.google.com</a>. You can opt-out of interest-based ads on <a href="http://optout.networkadvertising.org/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">http://optout.networkadvertising.org/</a>. We have no access to or control over these cookies. See "Advertisers".
            </p>
            <p className="mb-4">
              If you reject cookies, you may still use ottocollect, but your ability to use some areas of Ottocollect will be limited.
            </p>
            <p className="mb-4">
              This privacy statement covers the use of cookies by ottocollect only and does not cover the use of cookies by any third parties.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Use of information</h2>
            <p className="mb-4">
              We collect this data based on your consent to provide services related to creating and maintaining your personal collection, to better our services, resolve problems and bugs faster by analyzing server logs and automatic error reports. We do not use personal data to make automated decisions nor do we transfer it internationally.
            </p>
            <p className="mb-4">
              We use this information to analyze trends, to administer Colnect, to track users' movements around ottocollect and to gather demographic information about our userbase as a whole.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Cookies</h3>
            <p className="mb-4">
              We set a persistent cookie to make your session last longer, so you don't have to enter your password too often. Persistent cookies also enable us to track and target the interests of our users to enhance the experience on ottocollect.
            </p>
            <p className="mb-4">
              ottocollect may use aggregate (non-personally identifying) information to track ottocollect development and for other legitimate purposes. This includes, but not limited to, number of active collectors, their collectibles types, their collection sizes, their country of origin and their use of Colnect.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Personal Collection</h3>
            <p className="mb-4">
              Managing your personal collection and profile on ottocollect may make inventory information you submit publicly available. In case your privacy settings have allowed your lists to be viewed publicly in the past, we cannot guarantee that nobody (be it crawlers or other users) has saved it.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Forums</h3>
            <p className="mb-4">
              If you use ottocollect's forums or chat messages, you should be aware that any personally identifiable information you submit there can be read, collected, or used by other users of these forums, and could be used to send you unsolicited messages. We are not responsible for the personally identifiable information you choose to submit there.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Customer Service</h3>
            <p className="mb-4">
              We will communicate with you in response to your inquiries, to provide the services you request, and to manage your account.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Choice/Opt-out</h2>
            <p className="mb-4">
              We will send you strictly service-related announcements on rare occasions when it is necessary to do so. Generally, you may not opt-out of these communications, which are not promotional in nature. If you do not wish to receive them, you have the option to deactivate or remove your account.
            </p>
            <p className="mb-4">
              Other email preferences may be set using "My Account" option on the top bar of the site.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Third Parties</h2>
            <p className="mb-4">
              We DO NOT share personally identifiable information with third parties except for the rare cases described in this document. Do note that personal information you place on your profile or post on our forums may be publicly available.
            </p>
            <p className="mb-4">
              We reserve the right to disclose your personally identifiable information as required by law and when we believe that disclosure is necessary to protect our rights and/or to comply with a judicial proceeding, court order, or legal process served on Colnect.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Advertisers</h3>
            <p className="mb-4">
              Most ads appearing on Ottocollect are delivered by our advertising partners such as Google and eBay. Some advertising partners may use cookies or similar technologies to better measure campaign effectiveness, target future campaigns and deliver a more targeted experience to users. Ottocollect is not responsible for third party advertisers' use of cookies or other personally identifiable information. You should consult the privacy statements on their websites. We offer a premium service of exclude all ads from the Ottocollect pages you view.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Analytics</h3>
            <p className="mb-4">
              We use a third-party tracking service, Google Analytics, to track non-personally identifiable information about visitors to ottocollect. This helps us monitor use of ottocollect and improve our service. Please consult Google's privacy policy.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Integrated Payment Methods</h3>
            <p className="mb-4">
              If you choose to use an integrated payment method (such as PayPal) we disclose your email and chosen shipping address in order to make the transaction possible.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Links to Other Sites</h2>
            <p className="mb-4">
              ottocollect contains links to other sites that are not owned or controlled by ottocollect. Please be aware that we are not responsible for the privacy practices of such other sites.
            </p>
            <p className="mb-4">
              We encourage you to be aware when you leave ottocollect and to read the privacy statements of each and every website that collects personally identifiable information.
            </p>
            <p className="mb-4">
              This privacy statement applies only to information collected by ottocollect.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Tell Your Friends</h2>
            <p className="mb-4">
              If you choose to use our referral service to tell a friend about ottocollect, we will ask you for your friend's email address. We will send your friend a one-time email inviting them to join ottocollect. Your friend will see your email address and your ottocollect username in this email.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Security</h2>
            <p className="mb-4">
              We generally follow accepted industry standards to protect the personal information submitted to us, both during transmission and once we receive it.
            </p>
            <p className="mb-4">
              No method of transmission over the Internet, or method of electronic storage, is 100% secure, however. Therefore, while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">You're in charge of your data</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Accessing and changing your data</h3>
            <p className="mb-4">
              All personal data you share with us can be found in your profile/ my collection and your Marketplace. You can access and change this data any time.
            </p>
            <p className="mb-4">
              Digital version of your personal data can be found here.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Account removal</h3>
            <p className="mb-4">
              If you no longer want to use your ottocollect account you can deactivate it. After deactivation your lists will be hidden but your collection will not be deleted and you will be able to get it back in case you change your mind. If you're sure that you want your account completely deleted, please contact our support at <a href="mailto:accounts@ottocollect.com" className="text-primary hover:underline">accounts@ottocollect.com</a>. This action cannot be undone and your collection will be lost forever.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">User rights under GDPR</h2>
            <p className="mb-4">
              If GDPR applies to you there are some rights you are subject to. Some of them have already been addressed in this document.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>we inform you about collection and use of your personal data,</li>
              <li>you can review the information you provide us,</li>
              <li>you can change and complete your personal data,</li>
              <li>you can remove your account and we'll take care of the rest,</li>
              <li>processing of your data can be suppressed,</li>
              <li>you can download a digital copy of your data and ask us to transfer your data to another controller,</li>
              <li>you can ask us to stop contacting you with direct marketing,</li>
              <li>you don't have to agree to automatic processing of your personal data or transferring it to third parties for further processing.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">Data retention</h2>
            <p className="mb-4">
              We retain your personal data for at least as long as your ottocollect account is active. Remember that we may use the data you provided for a prolonged period of time for example to finalize Marketplace transactions or when we detect suspected behavior which would otherwise expose other users to fraud. Following your account deactivation, you may request complete removal of your information by writing <a href="mailto:support@ottocollect.com" className="text-primary hover:underline">support@ottocollect.com</a>
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Changes to this Privacy Statement</h2>
            <p className="mb-4">
              We reserve the right to modify this privacy statement at any time. Any such change will be announced by email.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have any questions or suggestions regarding our privacy policy, please contact us at <a href="mailto:support@ottocollect.com" className="text-primary hover:underline">support@ottocollect.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 