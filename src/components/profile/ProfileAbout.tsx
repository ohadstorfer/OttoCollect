
import React from "react";
import { User } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ProfileAboutProps {
  profile: User;
}

export function ProfileAbout({ profile }: ProfileAboutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">About</CardTitle>
      </CardHeader>
      <CardContent>
        {profile.about ? (
          <p className="whitespace-pre-wrap">{profile.about}</p>
        ) : (
          <p className="text-muted-foreground italic">
            This user hasn't added any information about themselves yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
