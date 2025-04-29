'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface User {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  createdAt: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          toast({
            variant: "destructive",
            title: "Authentication error",
            description: "You need to be logged in to view this page.",
          });
          router.push('/auth/login');
          return;
        }
        
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        } else {
          const error = await response.json();
          toast({
            variant: "destructive",
            title: "Error fetching users",
            description: error.error || "Failed to fetch users",
          });
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred while fetching users",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [user, router, toast]);
  
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Loading user data...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            {users.length} registered users in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No users found in the database
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 