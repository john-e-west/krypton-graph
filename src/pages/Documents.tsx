const Documents = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Manage and organize your knowledge documents
        </p>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <p className="text-center text-muted-foreground">
          No documents found. Upload your first document to get started.
        </p>
      </div>
    </div>
  )
}

export default Documents