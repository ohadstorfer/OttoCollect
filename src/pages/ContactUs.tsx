import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Instagram, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getSuperAdmins } from '@/services/adminService';
import { User } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';

export default function ContactUs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuperAdmins = async () => {
      try {
        const admins = await getSuperAdmins();
        // Filter to only show specific admin users
        const specificAdminIds = [
          'e0ceafe0-0a02-42a9-a72f-6232af4b2579',
          '589295a6-1042-4e19-afd7-9060d53324fe'
        ];
        const filteredAdmins = admins.filter(admin => specificAdminIds.includes(admin.id));
        setSuperAdmins(filteredAdmins);
      } catch (error) {
        console.error('Error fetching super admins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuperAdmins();
  }, []);

  const handleMessageAdmin = (adminId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messaging/${adminId}`);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">
        <span>Contact Us</span>
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-center text-muted-foreground mb-8">
          We're here to help! Choose the best way to reach us based on your needs.
        </p>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Section */}
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle>Email Support</CardTitle>
              <CardDescription>
                Get in touch via email for general inquiries
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <a 
                href="mailto:info@ottocollect.com" 
                className="text-primary hover:underline font-medium"
              >
                info@ottocollect.com
              </a>
            </CardContent>
          </Card>

          {/* Social Media Section */}
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <Instagram className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle>Follow Us</CardTitle>
              <CardDescription>
                Stay updated with our latest news and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline"
                onClick={() => window.open('https://www.instagram.com/ottocollect?igsh=MXdnN2M2bTEwZjlwZg%3D%3D&utm_source=qr', '_blank')}
                className="w-full"
              >
                <Instagram className="h-4 w-4 mr-2" />
                @ottocollect
              </Button>
            </CardContent>
          </Card>

          {/* Direct Messaging Section */}
          <Card className="ottoman-card">
            <CardHeader className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle>Direct Message</CardTitle>
              <CardDescription>
                Send a private message to our administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in to message our administrators
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Sign In
                  </Button>
                </div>
              ) : loading ? (
                <div className="text-center text-muted-foreground">
                  Loading administrators...
                </div>
              ) : superAdmins.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No administrators available
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Choose an administrator to message:
                  </p>
                  {superAdmins.map((admin) => (
                    <Button
                      key={admin.id}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => handleMessageAdmin(admin.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {admin.avatarUrl ? (
                            <img 
                              src={admin.avatarUrl} 
                              alt={admin.username} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{admin.username}</p>
                          <p className="text-xs text-muted-foreground">Administrator</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="ottoman-card mt-8">
          <CardHeader>
            <CardTitle className="text-center">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2 text-sm text-muted-foreground">
              <p>
                • For general questions and support, use our email
              </p>
              <p>
                • Follow us on Instagram for updates and community highlights
              </p>
              <p>
                • Message our administrators directly for account-specific issues
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}