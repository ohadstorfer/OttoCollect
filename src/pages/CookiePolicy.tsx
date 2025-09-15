import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function CookiePolicy() {
  const navigate = useNavigate();

  return (
    <div className="page-container max-w-4xl mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="icon"
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold"> <span> Cookie Policy </span> </h1>
      </div>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> Essential Cookies </span> </h2>
          <p>
            Our website uses only essential cookies that are strictly necessary for the operation of our website.
            These cookies enable core functionality such as user authentication and session management.
            Without these cookies, you would not be able to log in or maintain a secure session on our website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> What Are Cookies? </span> </h2>
          <p>
            Cookies are small text files that are stored on your device when you visit a website.
            They help the website remember information about your visit, which can both make it work better
            and make your next visit easier.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> How We Use Essential Cookies </span> </h2>
          <p className="mb-4">
            We use essential cookies for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Authentication:</strong> To remember your login status and keep you signed in
              during your session.
            </li>
            <li>
              <strong>Security:</strong> To protect user accounts and prevent unauthorized access.
            </li>
            <li>
              <strong>Session Management:</strong> To maintain your session while you browse different
              pages of our website.
            </li>
            <li>
              <strong>Basic Functionality:</strong> To ensure the website works correctly and maintains
              your preferences during your visit.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> Cookie Duration </span> </h2>
          <p>
            Our essential cookies are session cookies, which means they are temporary and are deleted
            when you close your browser. Some security-related cookies may persist for a longer period
            to maintain your secure session and remember your login status.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> Managing Cookies </span> </h2>
          <p>
            Since we only use essential cookies that are strictly necessary for the website to function,
            these cookies will always be active and cannot be disabled. However, you can set your browser
            to block or alert you about these cookies, but some parts of the website may not work properly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> Updates to This Policy </span> </h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices or for
            operational, legal, or regulatory reasons. We encourage you to periodically review this page
            for the latest information on our cookie practices.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3"> <span> Contact Us </span> </h2>
          <p>
            If you have any questions about our use of cookies, please contact us through our{' '}
            <a href="/contact" className="text-primary hover:underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
} 