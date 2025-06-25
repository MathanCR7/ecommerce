// src/pages/privacypolicypage/PrivacyPolicyPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./PrivacyPolicyPage.css"; // Link the CSS file

const PrivacyPolicyPage = () => {
  const effectiveDate = "October 26, 2023"; // <--- Update this date to the date you publish

  return (
    <>
      <Header />
      <div className="privacy-policy-page-container">
        <h1>Privacy Policy</h1>

        <p>Effective Date: {effectiveDate}</p>

        <section>
          <h2>Introduction</h2>
          <p>
            Welcome to THE FRUITBOWL & CO, accessible at [Your Website URL] (the
            "Site"). We are committed to protecting the privacy of our customers
            and visitors. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you visit our website
            and use our services. Please read this policy carefully to
            understand our policies and practices regarding your information and
            how we will treat it. By accessing or using our Site, you agree to
            this Privacy Policy. If you do not agree with our policies and
            practices, your choice is not to use our Site.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>
          <p>
            We collect various types of information in connection with the
            services we provide, including:
          </p>
          <ul>
            <li>
              <strong>Personal Identification Information:</strong> Name,
              shipping address, billing address, email address, phone number,
              and other similar identifiers you provide when creating an
              account, placing an order, subscribing to newsletters, or
              contacting us.
            </li>
            <li>
              <strong>Payment Information:</strong> Details required to process
              payments for your orders, such as credit card numbers, billing
              addresses, and security codes. Note that payment processing is
              typically handled by secure third-party payment gateways, and we
              do not store sensitive payment card details on our servers.
            </li>
            <li>
              <strong>Order and Transaction Information:</strong> Details about
              the products you purchase, order history, delivery details, and
              transaction amounts.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you access and
              use the Site, including your IP address, browser type, operating
              system, referring URLs, pages viewed, time spent on pages, clicks,
              and other diagnostic data. This helps us understand user behavior
              and improve our services.
            </li>
            <li>
              <strong>Device Information:</strong> Information about the device
              you use to access our Site, such as the hardware model, operating
              system and version, unique device identifiers, and mobile network
              information.
            </li>
            <li>
              <strong>Communication Data:</strong> Information you provide when
              you communicate with us through email, contact forms, customer
              support chats, or social media.
            </li>
            <li>
              <strong>Cookies and Tracking Technologies:</strong> Information
              collected through cookies, web beacons, and similar technologies
              about your browsing behavior on our Site. See the "Cookies and
              Tracking Technologies" section below for more details.
            </li>
          </ul>
        </section>

        <section>
          <h2>How We Collect Information</h2>
          <p>We collect information in several ways:</p>
          <ul>
            <li>
              <strong>Directly from You:</strong> We collect information you
              provide directly to us when you create an account, place an order,
              sign up for our newsletter, fill out forms, participate in
              surveys, or contact customer support.
            </li>
            <li>
              <strong>Automatically as You Navigate the Site:</strong> As you
              interact with our Site, we may use automated data collection
              technologies like cookies and web beacons to collect certain
              information about your equipment, browsing actions, and patterns.
            </li>
            <li>
              <strong>From Third Parties:</strong> We may receive information
              about you from third parties, such as payment processors, shipping
              partners, marketing partners, and data analytics providers, to the
              extent permitted by law.
            </li>
          </ul>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect for various purposes, including:
          </p>
          <ul>
            <li>To provide, operate, and maintain our Site and services.</li>
            <li>
              To process and fulfill your orders, including managing payments,
              shipping, and delivery.
            </li>
            <li>To create and manage your user account.</li>
            <li>To provide customer support and respond to your inquiries.</li>
            <li>
              To send you order confirmations, shipping notifications, and other
              transactional emails.
            </li>
            <li>
              To send you marketing communications, promotional offers, and
              newsletters (you can opt-out at any time).
            </li>
            <li>
              To personalize your experience on our Site and recommend products
              based on your browsing history and preferences.
            </li>
            <li>
              To monitor and analyze usage and trends to improve our Site,
              products, and services.
            </li>
            <li>
              To detect, prevent, and address technical issues, fraud, and
              security concerns.
            </li>
            <li>
              To comply with legal obligations and enforce our terms and
              conditions.
            </li>
            <li>For any other purpose with your consent.</li>
          </ul>
        </section>

        <section>
          <h2>Disclosure of Your Information</h2>
          <p>
            We may disclose your personal information to third parties in the
            following circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> We share information with
              third-party vendors, service providers, contractors, or agents who
              perform services for us or on our behalf, such as payment
              processing, order fulfillment, shipping, data analysis, email
              delivery, hosting services, customer service, and marketing
              assistance. These service providers have access to your personal
              information only to perform these tasks on our behalf and are
              obligated not to disclose or use it for any other purpose.
            </li>
            <li>
              <strong>Business Transfers:</strong> We may share or transfer your
              information in connection with, or during negotiations of, any
              merger, sale of company assets, financing, or acquisition of all
              or a portion of our business to another company.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose your
              information where required to do so by law or subpoena, or if we
              believe that such action is necessary to (a) comply with a legal
              obligation, (b) protect and defend our rights or property, (c)
              prevent or investigate possible wrongdoing in connection with the
              Site, (d) protect the personal safety of users of the Site or the
              public, or (e) protect against legal liability.
            </li>
            <li>
              <strong>With Your Consent:</strong> We may disclose your personal
              information for any other purpose with your consent.
            </li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2>Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to track the
            activity on our Site and hold certain information. Cookies are files
            with a small amount of data which may include an anonymous unique
            identifier. Cookies are sent to your browser from a website and
            stored on your device. Tracking technologies also used are beacons,
            tags, and scripts to collect and track information and to improve
            and analyze our Service.
          </p>
          <p>
            You can instruct your browser to refuse all cookies or to indicate
            when a cookie is being sent. However, if you do not accept cookies,
            you may not be able to use some portions of our Site.
          </p>
          <p>Examples of Cookies we use:</p>
          <ul>
            <li>
              <strong>Session Cookies:</strong> We use these to operate our
              Service.
            </li>
            <li>
              <strong>Preference Cookies:</strong> We use these to remember your
              preferences and various settings.
            </li>
            <li>
              <strong>Security Cookies:</strong> We use these for security
              purposes.
            </li>
            <li>
              <strong>Advertising Cookies:</strong> Used to serve you with
              advertisements that may be relevant to you and your interests.
            </li>
          </ul>
        </section>

        <section>
          <h2>Data Security</h2>
          <p>
            We have implemented measures designed to secure your personal
            information from accidental loss and from unauthorized access, use,
            alteration, and disclosure. All information you provide to us is
            stored on our secure servers behind firewalls. Any payment
            transactions will be encrypted using SSL technology.
          </p>
          <p>
            The safety and security of your information also depend on you.
            Where we have given you (or where you have chosen) a password for
            access to certain parts of our Site, you are responsible for keeping
            this password confidential. We ask you not to share your password
            with anyone.
          </p>
          <p>
            Unfortunately, the transmission of information via the internet is
            not completely secure. Although we do our best to protect your
            personal information, we cannot guarantee the security of your
            personal information transmitted to our Site. Any transmission of
            personal information is at your own risk. We are not responsible for
            the circumvention of any privacy settings or security measures
            contained on the Site.
          </p>
        </section>

        <section>
          <h2>Your Data Protection Rights</h2>
          <p>
            Depending on your location, you may have the following data
            protection rights:
          </p>
          <ul>
            <li>
              <strong>The right to access:</strong> You have the right to
              request copies of your personal data.
            </li>
            <li>
              <strong>The right to rectification:</strong> You have the right to
              request that we correct any information you believe is inaccurate
              or complete information you believe is incomplete.
            </li>
            <li>
              <strong>The right to erasure:</strong> You have the right to
              request that we erase your personal data, under certain
              conditions.
            </li>
            <li>
              <strong>The right to restrict processing:</strong> You have the
              right to request that we restrict the processing of your personal
              data, under certain conditions.
            </li>
            <li>
              <strong>The right to object to processing:</strong> You have the
              right to object to our processing of your personal data, under
              certain conditions.
            </li>
            <li>
              <strong>The right to data portability:</strong> You have the right
              to request that we transfer the data that we have collected to
              another organization, or directly to you, under certain
              conditions.
            </li>
          </ul>
          <p>
            If you make a request, we have one month to respond to you. If you
            would like to exercise any of these rights, please contact us using
            the contact information provided below.
          </p>
          <p>
            You also have the right to opt-out of receiving marketing
            communications from us. You can do this by following the unsubscribe
            link in any marketing email we send you or by contacting us
            directly.
          </p>
        </section>

        <section>
          <h2>Third-Party Websites</h2>
          <p>
            Our Site may contain links to websites operated by third parties.
            Please note that this Privacy Policy applies only to information
            collected through our Site. We are not responsible for the privacy
            practices of third-party websites. We encourage you to read the
            privacy policies of any third-party website you visit.
          </p>
        </section>

        <section>
          <h2>Children's Privacy</h2>
          <p>
            Our Site is not intended for children under the age of 13. We do not
            knowingly collect personally identifiable information from anyone
            under the age of 13. If you are a parent or guardian and you are
            aware that your child has provided us with personal data, please
            contact us. If we become aware that we have collected personal data
            from a child under age 13 without verification of parental consent,
            we take steps to remove that information from our servers.
          </p>
        </section>

        <section>
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Effective Date" at the top of this Privacy Policy.
            You are advised to review this Privacy Policy periodically for any
            changes. Changes to this Privacy Policy are effective when they are
            posted on this page.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us:
          </p>
          <ul>
            <li>
              By email:{" "}
              <a href="mailto:[Your Contact Email]">[Your Contact Email]</a>
            </li>
            <li>
              By visiting this page on our website: [Link to your Contact Us
              page, if applicable]
            </li>
            <li>By mail: [Your Address]</li>
          </ul>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;
