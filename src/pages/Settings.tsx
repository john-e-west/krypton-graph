const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">General Settings</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Configure general application settings
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">API Configuration</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Set up API keys and endpoints
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Data Management</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Import, export, and backup your data
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings