import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/services/profileService';
import {
    Users,
    BookOpen,
    Globe,
    History,
    Award,
    ArrowRight,
    ExternalLink,
    Database,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';

const AboutUs: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const skewedBgColor = theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-700';


    // Founder user IDs
    const founderIds = [
        'e0ceafe0-0a02-42a9-a72f-6232af4b2579', // Assaf
        '589295a6-1042-4e19-afd7-9060d53324fe'  // Dror
    ];

    // Fetch founder profiles
    const { data: founders, isLoading: foundersLoading } = useQuery({
        queryKey: ['founders', founderIds],
        queryFn: async () => {
            const profiles = await Promise.all(
                founderIds.map(id => getUserProfile(id))
            );
            return profiles.filter(Boolean);
        },
        enabled: founderIds.length > 0,
    });

    const handleFounderClick = (username: string) => {
        navigate(`/profile/${username}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-900 dark:to-dark-800">
            <SEOHead
                title={SEO_CONFIG.pages.aboutUs.title}
                description={SEO_CONFIG.pages.aboutUs.description}
                keywords={SEO_CONFIG.pages.aboutUs.keywords}
            />
            <div className="container mx-auto px-4 py-8 max-w-6xl">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-4">
                        <span>About OttoCollect </span>
                    </h1>
                    <div className="w-24 h-1 bg-ottoman-600 mx-auto rounded-full"></div>
                </div>

                {/* About the Project Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-6 flex items-center gap-3">
                                <BookOpen className="h-8 w-8 text-ottoman-600" />
                                <span>About the Project</span>
                            </h2>

                            <div className="space-y-6 text-lg leading-relaxed text-ottoman-800 dark:text-ottoman-200">
                                <p>
                                    Ottoman Banknotes is a comprehensive catalog and collection management tool dedicated to collectors of Ottoman Empire banknotes and currencies from territories once ruled by the Ottoman Empire.
                                </p>

                                <p>
                                    Our mission is to document and preserve the numismatic history of the Ottoman Empire while building a community of collectors across regions that share this historical heritage, including Turkey, Greece, Jordan, Lebanon, Syria, Israel, Cyprus, Albania, Montenegro and more.
                                </p>

                                <p>
                                    We provide detailed information on Ottoman banknotes as well as banknotes from various countries that were once under Ottoman rule. This makes our platform uniquely valuable to collectors who typically expand their collections to include Ottoman currencies after completing collections from their home countries.
                                </p>

                                <p>
                                    Our platform allows collectors to track their personal collections, share images, participate in discussions, and connect with fellow enthusiasts around the world.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Founders Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-8 flex items-center gap-3">
                                <Users className="h-8 w-8 text-ottoman-600" />
                                <span>Our Founders</span>
                            </h2>

                            {foundersLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Assaf Unger */}
                                    <Card
                                        className="bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border-ottoman-300 dark:border-ottoman-700 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                        onClick={() => handleFounderClick(founders?.[0]?.username || '')}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="mb-4">
                                                {founders?.[0]?.avatarUrl ? (
                                                    <img
                                                        src={founders[0].avatarUrl}
                                                        alt="Assaf Unger"
                                                        className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 bg-ottoman-200 dark:bg-ottoman-800 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-ottoman-600 dark:text-ottoman-400">
                                                            A
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-ottoman-900 dark:text-ottoman-100 mb-2">
                                                <span>Assaf Unger</span>
                                            </h3>

                                            {founders?.[0]?.rank && (
                                                <Badge variant="user" rank={founders[0].rank} className="mb-3" />
                                            )}

                                            <p className="text-ottoman-700 dark:text-ottoman-300 mb-4 leading-relaxed">
                                                Assaf has been collecting banknotes for over 40 years and is a leading expert in Ottoman Empire and Palestinian banknotes. He founded this platform to share his knowledge and passion with fellow collectors worldwide.
                                            </p>

                                            <Button
                                                variant="outline"
                                                className="group-hover:bg-ottoman-600 group-hover:text-white transition-colors duration-300"
                                            >
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                View Collection
                                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Dror Korcharz */}
                                    <Card
                                        className="bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border-ottoman-300 dark:border-ottoman-700 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                        onClick={() => handleFounderClick(founders?.[1]?.username || '')}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="mb-4">
                                                {founders?.[1]?.avatarUrl ? (
                                                    <img
                                                        src={founders[1].avatarUrl}
                                                        alt="Dror Korcharz"
                                                        className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full mx-auto border-4 border-ottoman-300 dark:border-ottoman-600 bg-ottoman-200 dark:bg-ottoman-800 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-ottoman-600 dark:text-ottoman-400">
                                                            D
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-ottoman-900 dark:text-ottoman-100 mb-2">
                                                <span>Dror Korcharz</span>
                                            </h3>

                                            {founders?.[1]?.rank && (
                                                <Badge variant="user" rank={founders[1].rank} className="mb-3" />
                                            )}

                                            <div className="text-ottoman-700 dark:text-ottoman-300 mb-4 leading-relaxed space-y-3">
                                                <p>
                                                    Dror is a renowned expert on Ottoman banknotes with over 40 years of collecting experience. He holds an active management role in (IBA) and has contributed significantly to the field of numismatics.
                                                </p>
                                                <p>
                                                    His specialized knowledge of Ottoman currency variants, seals, and historical context has made him a sought-after consultant for collectors and institutions across multiple countries formerly under Ottoman rule.
                                                </p>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="group-hover:bg-ottoman-600 group-hover:text-white transition-colors duration-300"
                                            >
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                View Collection
                                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* Platform Features Section */}
                <section className="mb-16">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <div className="text-center max-w-3xl mx-auto mb-16">
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-ottoman-900 dark:text-ottoman-100 mb-4">
                                    <span>Comprehensive Platform for Collectors</span>
                                </h2>
                                <p className="text-lg text-ottoman-700 dark:text-ottoman-200">
                                    Everything you need to manage, showcase, and grow your Ottoman and it's successor countries banknotes collection
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {/* Catalogues */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/catalog')}>
                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <Database className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>Catalogues</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        Browse comprehensive catalogue of ottoman and it's successor countries banknotes
                                    </p>
                                </div>

                                {/* Collection Tools */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/collection')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <BookOpen className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>Collection Tools</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        Track your collection, wishlist, and display missing items with detailed information
                                    </p>
                                </div>

                                {/* Marketplace */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/marketplace')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <DollarSign className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>Marketplace</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        Buy and sell banknotes within the community through our integrated marketplace
                                    </p>
                                </div>

                                {/* Community */}
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-ottoman-50 to-ottoman-100 dark:from-dark-700 dark:to-dark-600 border border-ottoman-200 dark:border-ottoman-700" onClick={() => navigate('/community')}>

                                    <div className="w-12 h-12 mb-4 bg-ottoman-600 rounded-lg flex items-center justify-center">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-serif font-semibold mb-2 text-ottoman-800 dark:text-ottoman-200">
                                        <span>Community</span>
                                    </h3>
                                    <p className="text-ottoman-600 dark:text-ottoman-300">
                                        View other personal collection. Connect interact and follow other collectors from around the world.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Call to Action */}
                <section className="text-center">
                    <Card className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-ottoman-200 dark:border-ottoman-800">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-serif font-bold mb-4 text-ottoman-800 dark:text-white">
                                <span>Join Our Community</span>
                            </h2>
                            <p className="mb-6 text-lg text-ottoman-700 dark:text-ottoman-100">
                                Start exploring Ottoman banknotes and connect with fellow collectors from around the world.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onClick={() => navigate('/catalog')}
                                    className="bg-white text-ottoman-600 hover:bg-ottoman-50"
                                >
                                    <BookOpen className="h-5 w-5 mr-2" />
                                    Explore Catalog
                                </Button>
                                {!user && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => navigate('/auth')}
                                        className="border-white text-white hover:bg-white hover:text-ottoman-600"
                                    >
                                        <Users className="h-5 w-5 mr-2" />
                                        Join Community
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
};

export default AboutUs; 