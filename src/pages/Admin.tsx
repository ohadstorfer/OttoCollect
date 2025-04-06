
  // We're just updating the role comparison check
  // Find the line that has the error and replace it
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return (
      <div className="page-container">
        <h1 className="page-title">Admin</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Access Restricted</h2>
            <p className="mb-6 text-muted-foreground">
              This area is restricted to administrators only.
            </p>
          </div>
        </div>
      </div>
    );
  }
