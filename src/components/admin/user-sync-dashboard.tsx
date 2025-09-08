import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle, RefreshCw, User, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface UserMapping {
  id: string
  clerk_user_id: string
  zep_user_id: string
  email: string
  name: string
  roles: string[]
  status: 'active' | 'deleted' | 'suspended'
  last_synced_at: string
  created_at: string
  updated_at: string
}

interface SyncMetrics {
  totalUsers: number
  activeUsers: number
  deletedUsers: number
  suspendedUsers: number
  syncSuccessRate: number
  lastSyncTime: string
  failedSyncs: number
}

export function UserSyncDashboard() {
  const [mappings, setMappings] = useState<UserMapping[]>([])
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mappingsRes, metricsRes] = await Promise.all([
        fetch('/api/admin/user-mappings'),
        fetch('/api/admin/sync-metrics')
      ])

      if (!mappingsRes.ok || !metricsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const mappingsData = await mappingsRes.json()
      const metricsData = await metricsRes.json()

      setMappings(mappingsData)
      setMetrics(metricsData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async (userId: string) => {
    setSyncing(userId)
    try {
      const response = await fetch('/api/admin/manual-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      toast.success('User synced successfully')
      await fetchData()
    } catch (error) {
      console.error('Error syncing user:', error)
      toast.error('Failed to sync user')
    } finally {
      setSyncing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode }> = {
      active: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      deleted: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      suspended: { variant: 'secondary', icon: <AlertCircle className="w-3 h-3" /> }
    }

    const config = variants[status] || variants.active

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeUsers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.syncSuccessRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Last sync: {formatDate(metrics.lastSyncTime)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Syncs</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.failedSyncs}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.suspendedUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.deletedUsers} deleted
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Mappings</CardTitle>
          <CardDescription>
            Manage and monitor user synchronization between Clerk and ZEP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">{mapping.email}</TableCell>
                    <TableCell>{mapping.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {mapping.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(mapping.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(mapping.last_synced_at || mapping.updated_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualSync(mapping.clerk_user_id)}
                        disabled={syncing === mapping.clerk_user_id}
                      >
                        {syncing === mapping.clerk_user_id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Sync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}