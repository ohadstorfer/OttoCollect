
import { useState } from "react";
import { importBanknoteData } from "@/scripts/importBanknoteData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DatabaseStatus from "@/components/admin/DatabaseStatus";

export default function Admin() {
  const [csvData, setCsvData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!csvData) {
      toast({
        title: "Error",
        description: "Please paste CSV data first.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const count = await importBanknoteData(csvData);
      setImportResult(count);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${count} banknotes.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: "There was an error importing the data. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <DatabaseStatus />
        
        <Card>
          <CardHeader>
            <CardTitle>Import Banknote Data</CardTitle>
            <CardDescription>
              Paste the CSV data below and click Import to add banknotes to the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste CSV data here..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              disabled={isImporting}
            />
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            {importResult !== null && (
              <div className="text-sm text-green-600">
                Successfully imported {importResult} banknotes.
              </div>
            )}
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !csvData}
              className="ml-auto"
            >
              {isImporting ? "Importing..." : "Import Data"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
