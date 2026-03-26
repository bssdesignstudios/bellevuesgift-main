import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StaffProfile {
  id: number | string;
  name: string;
  email: string;
  role: string;
}

export default function StaffProfilePage() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: async () => {
      const { data } = await axios.get('/api/staff/profile');
      return data as StaffProfile;
    },
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
      });
    }
  }, [profile?.id]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return axios.put('/api/staff/profile', profileForm);
    },
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      return axios.post('/api/staff/password', passwordForm);
    },
    onSuccess: () => {
      toast.success('Password updated');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.current_password?.[0]
        || error?.response?.data?.message
        || 'Failed to update password';
      toast.error(message);
    },
  });

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateProfileMutation.mutate();
  };

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updatePasswordMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your staff profile and password.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="name@bellevue.com"
                  required
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Role: {isLoading ? 'Loading...' : profile?.role ?? '—'}
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending || isLoading}>
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.password_confirmation}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={updatePasswordMutation.isPending}>
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
