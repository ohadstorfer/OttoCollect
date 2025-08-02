import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, User } from 'lucide-react';
import { statisticsService, CollectionViewStats, BlogPostViewStats } from '@/services/statisticsService';

export const ViewStatsSection: React.FC = () => {
  const [collectionViews, setCollectionViews] = useState<CollectionViewStats[]>([]);
  const [blogPostViews, setBlogPostViews] = useState<BlogPostViewStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadViewStats();
  }, []);

  const loadViewStats = async () => {
    try {
      const [collectionData, blogData] = await Promise.all([
        statisticsService.getCollectionViewStats(),
        statisticsService.getBlogPostViewStats()
      ]);
      
      setCollectionViews(collectionData.slice(0, 20)); // Top 20
      setBlogPostViews(blogData.slice(0, 20)); // Top 20
    } catch (error) {
      console.error('Error loading view stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading view statistics...</div>;
  }

  console.log('View stats data:', { collectionViews, blogPostViews });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle><span>Top Collection Views by User</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Username
                  </div>
                </TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <Eye className="mr-2 h-4 w-4" />
                    Total Views
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionViews.map((view, index) => (
                <TableRow key={`${view.userId}-${view.countryId}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <span className="mr-2 text-muted-foreground">#{index + 1}</span>
                      {view.username}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{view.countryName}</TableCell>
                  <TableCell className="text-right">{view.totalViews.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {collectionViews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No collection views recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><span>Top Blog Post Views</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    Blog Post Title
                  </div>
                </TableHead>
                <TableHead className="text-right">Total Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogPostViews.map((view, index) => (
                <TableRow key={view.postId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <span className="mr-2 text-muted-foreground">#{index + 1}</span>
                      <span className="truncate max-w-[300px]" title={view.postTitle}>
                        {view.postTitle}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{view.totalViews.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {blogPostViews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No blog post views recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};