
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { importBanknoteData } from "@/scripts/importBanknoteData";

const DataImporter = () => {
  const [csvData, setCsvData] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!csvData) {
      toast({
        title: "Error",
        description: "No data to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const count = await importBanknoteData(csvData);
      toast({
        title: "Import Successful",
        description: `${count} banknotes imported`,
      });
      setCsvData("");
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import banknote data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Import Banknote Data</h2>
      <Textarea
        placeholder="Paste CSV data here..."
        value={csvData}
        onChange={(e) => setCsvData(e.target.value)}
        className="min-h-[300px] font-mono text-sm"
      />
      <div className="flex justify-end">
        <Button 
          onClick={handleImport} 
          disabled={!csvData || importing}
        >
          {importing ? "Importing..." : "Import Data"}
        </Button>
      </div>
    </div>
  );
};

export default DataImporter;
