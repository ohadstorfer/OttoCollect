import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Search, Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

export default function Members() {
  const [members, setMembers] = useState<User[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const navigate = useNavigate();
  const { t } = useTranslation(['pages']);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Map Supabase database fields to our User type with proper type casting
        const mappedData: User[] = (data || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          role_id: profile.role_id || '', // Add required role_id
          role: profile.role as UserRole, // Cast to UserRole type
          rank: profile.rank as string,
          points: profile.points,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at || '',
          avatarUrl: profile.avatar_url,
          country: profile.country,
          about: profile.about
        }));
        
        setMembers(mappedData);
        setFilteredMembers(mappedData);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    // Apply search filter
    const filtered = members.filter(member => 
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.country && member.country.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'a-z':
          return a.username.localeCompare(b.username);
        case 'z-a':
          return b.username.localeCompare(a.username);
        case 'rank':
          return b.points - a.points;
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredMembers(sorted);
  }, [members, searchQuery, sortBy]);

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
  };

  return (
    <div className="page-container">
      <h1 className="page-title"> <span>{t('allUsers')}</span></h1>
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-muted-foreground mb-6">
            {t('connectWithCollectors')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card border rounded-lg p-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('search')}</span>
              </div>
              <Input
                placeholder={t('searchByUsernameOrCountry')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('sortBy')}</span>
              </div>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('newestMembers')}</SelectItem>
                  <SelectItem value="oldest">{t('oldestMembers')}</SelectItem>
                  <SelectItem value="a-z">{t('aZ')}</SelectItem>
                  <SelectItem value="z-a">{t('zA')}</SelectItem>
                  <SelectItem value="rank">{t('byPoints')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-medium mb-4"><span>{t('noMembersFound')}</span></h3>
            <p className="text-muted-foreground">{t('tryAdjustingSearchCriteria')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Card 
                key={member.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleUserClick(member.username)}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {member.avatarUrl ? (
                        <img 
                          src={member.avatarUrl} 
                          alt={member.username} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg"><span>{member.username}</span></h3>
                      <div className="flex items-center gap-2 mb-1">
                      <Badge variant="user" rank={member.rank} role={member.role} showIcon />
                      </div>
                      {member.country && (
                        <p className="text-sm text-muted-foreground mt-1">{member.country}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t p-3 bg-muted/20 flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('memberSince')}{new Date(member.createdAt).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm" className="h-auto py-0 px-2">{t('viewProfile')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
