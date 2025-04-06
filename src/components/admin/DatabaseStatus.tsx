
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { checkBanknotesExist } from "@/services/banknoteService";

export default function DatabaseStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkDatabase() {
      try {
        const exists = await checkBanknotesExist();
        setHasData(exists);
      } catch (err) {
        setError(typeof err === 'string' ? err : 'Failed to connect to the database');
      } finally {
        setIsLoading(false);
      }
    }

    checkDatabase();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const exists = await checkBanknotesExist();
      setHasData(exists);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to connect to the database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Database Status</CardTitle>
        <CardDescription>Check connection and data status in Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ottoman-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-md">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className={hasData ? "text-green-600 p-4 bg-green-50 rounded-md" : "text-amber-600 p-4 bg-amber-50 rounded-md"}>
            <p className="font-semibold">{hasData ? "Database Status: Good" : "Database Status: Empty"}</p>
            <p>{hasData ? "Banknotes data is available in the database." : "No banknotes found in the database. Please import data."}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? "Checking..." : "Refresh Status"}
        </Button>
      </CardFooter>
    </Card>
  );
}
