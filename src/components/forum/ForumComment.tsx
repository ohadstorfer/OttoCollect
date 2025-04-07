
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ForumComment as ForumCommentType } from '@/types';
import UserProfileLink from '@/components/common/UserProfileLink';

interface ForumCommentProps {
  comment: ForumCommentType;
}

const ForumComment = ({ comment }: ForumCommentProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {comment.author && (
              <UserProfileLink
                userId={comment.author.id}
                username={comment.author.username}
                avatarUrl={comment.author.avatarUrl}
                rank={comment.author.rank}
                showRank={true}
              />
            )}
          </div>
          <div className="flex items-center text-muted-foreground text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(comment.createdAt), 'PP')}
          </div>
        </div>
        <div className="ml-10">
          {comment.content.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? "mt-2" : ""}>
              {paragraph}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumComment;
