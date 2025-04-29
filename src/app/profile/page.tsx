'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadProfilePhoto, changePassword, deleteAccount, EmailPreferences, getEmailPreferences, updateEmailPreferences } from '@/lib/auth-client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { motion } from 'framer-motion';

type UserType = 'student' | 'personal' | 'sme' | string;

// Inline SVG for default avatar - no need for an external file
const DefaultAvatar = () => (
  <svg
    className="h-full w-full text-green-500"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<UserType>('');
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for password change, email preferences, and account deletion
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhotoURL(user.photoURL || '');
      
      // If user has a userType preference, set it
      if (user.userType) {
        setSelectedType(user.userType as UserType);
      }
    }
  }, [user]);

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  // Load email preferences
  useEffect(() => {
    if (user) {
      const loadPreferences = async () => {
        setLoadingPreferences(true);
        try {
          const prefs = await getEmailPreferences();
          setEmailPreferences(prefs);
        } catch (error) {
          console.error('Failed to load email preferences:', error);
        } finally {
          setLoadingPreferences(false);
        }
      };
      
      loadPreferences();
    }
  }, [user]);

  if (!user) {
    return null; // Don't render anything while checking auth
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleTypeSelection = async (type: UserType) => {
    setSelectedType(type);
    
    setIsLoading(true);
    try {
      // Call the updateUserProfile function to save the user type
      const updatedUser = await updateUser({
        ...user,
        userType: type
      });
      
      toast({
        title: "Profile updated",
        description: `Your profile has been set as ${type}`,
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    setIsLoading(true);
    try {
      // Update the user's name
      const updatedUser = await updateUser({
        ...user,
        name
      });
      
      toast({
        title: "Profile updated",
        description: "Your name has been updated successfully",
      });
      
      setIsEditingName(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Error updating name:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your name. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const updatedUser = await updateUser({
        ...user,
        name,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update profile.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoClick = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const newPhotoURL = await uploadProfilePhoto(file);
      setPhotoURL(newPhotoURL);
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload profile photo.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords don\'t match');
      return;
    }
    
    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully."
      });
      
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeleteError('');
    
    if (!deletePassword) {
      setDeleteError('Password is required to delete your account');
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteAccount(deletePassword);
      
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully."
      });
      
      router.push('/auth/login');
    } catch (error: any) {
      setDeleteError(error.message || 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email preference toggling
  const handleToggleEmailPreference = async (field: keyof Omit<EmailPreferences, 'userId' | 'lastUpdated'>, value: boolean) => {
    if (!emailPreferences) return;
    
    const updatedPrefs = {
      ...emailPreferences,
      [field]: value
    };
    
    try {
      const result = await updateEmailPreferences({
        projectUpdates: updatedPrefs.projectUpdates,
        marketingEmails: updatedPrefs.marketingEmails,
        weeklyDigest: updatedPrefs.weeklyDigest
      });
      
      if (result) {
        setEmailPreferences(result);
        
        toast({
          title: "Preferences updated",
          description: "Your email preferences have been updated successfully."
        });
      }
    } catch (error) {
      console.error('Failed to update email preferences:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your email preferences. Please try again."
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-white overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-green-300 opacity-20"
            style={{
              width: `${100 + i * 30}px`,
              height: `${150 + i * 20}px`,
              top: `${10 + i * 12}%`,
              left: `${15 + i * 15}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 10, 0],
              y: [0, 15, 0],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="container mx-auto p-6 max-w-5xl relative z-10">
        <header className="mb-8 flex justify-between items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button 
              variant="ghost" 
              onClick={() => router.push('/home')}
              className="mb-4 transition-all hover:scale-105"
            >
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <motion.h1 
              className="text-3xl font-bold text-green-800 drop-shadow-md"
              style={{ textShadow: "0px 2px 4px rgba(0, 128, 0, 0.2)" }}
            >
              Your Profile
            </motion.h1>
            <motion.p 
              className="text-green-600 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Manage your account settings and preferences
            </motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button 
              variant="outline" 
              className="text-red-500 border-red-200 hover:bg-red-50 transition-all hover:shadow-lg hover:scale-105"
              onClick={handleSignOut}
            >
              <Icons.logout className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </motion.div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Tabs defaultValue="profile" className="mb-8">
            <TabsList className="mb-6 p-1 bg-green-50/80 backdrop-blur-sm shadow-md rounded-lg">
              <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">Profile Information</TabsTrigger>
              <TabsTrigger value="type" className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">User Type</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">Account Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="transition-all duration-300 transform">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border-none overflow-hidden bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <CardTitle className="text-2xl text-white">Profile Information</CardTitle>
                    <CardDescription className="text-green-100">
                      View and manage your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Profile picture */}
                      <div className="flex flex-col items-center">
                        <motion.div 
                          className="relative cursor-pointer group" 
                          onClick={handlePhotoClick}
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          animate={{ 
                            y: [0, -8, 0],
                            boxShadow: [
                              "0px 0px 10px rgba(0,128,0,0.3)", 
                              "0px 0px 30px rgba(0,128,0,0.6)", 
                              "0px 0px 10px rgba(0,128,0,0.3)"
                            ]
                          }}
                          transition={{ 
                            y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            boxShadow: { duration: 2, repeat: Infinity }
                          }}
                        >
                          <div className="w-32 h-32 rounded-full shadow-lg overflow-hidden border-4 border-white">
                            <div className="absolute inset-0 bg-gradient-to-tr from-green-300/20 to-transparent z-10" />
                            <Avatar className="w-32 h-32">
                              {photoURL ? (
                                <AvatarImage src={photoURL} />
                              ) : (
                                <DefaultAvatar />
                              )}
                              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              {isUploading ? (
                                <Icons.loader className="h-6 w-6 text-white animate-spin" />
                              ) : (
                                <Icons.image className="h-6 w-6 text-white" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                      />
                      <p className="text-sm text-muted-foreground mt-3">
                        Click on the avatar to upload a new photo
                      </p>
                    </div>
                    
                    {/* User details */}
                    <div className="flex-1 space-y-4">
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Label className="text-sm text-gray-500">Full Name</Label>
                        {isEditingName ? (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              onClick={handleUpdateName} 
                              disabled={isLoading}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 hover:shadow-md transition-all"
                            >
                              {isLoading ? (
                                <Icons.loader className="h-4 w-4 animate-spin" />
                              ) : "Save"}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsEditingName(false)}
                              size="sm"
                              className="hover:shadow-md transition-all"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-lg font-medium">{name || 'Not set'}</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsEditingName(true)}
                              className="text-green-600 hover:shadow-md transition-all hover:scale-105"
                            >
                              <Icons.edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Label className="text-sm text-gray-500">Email Address</Label>
                        <p className="text-lg mt-1">{email}</p>
                      </div>
                      
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Label className="text-sm text-gray-500">Account Created</Label>
                        <p className="text-lg mt-1">{formatDate(user.createdAt)}</p>
                      </div>
                      
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Label className="text-sm text-gray-500">User Type</Label>
                        <p className="text-lg mt-1 capitalize">
                          {selectedType || 'Not selected'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="type" className="transition-all duration-300 transform">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border-none overflow-hidden bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <CardTitle className="text-2xl text-white">Who are you?</CardTitle>
                    <CardDescription className="text-green-100">
                      Select the option that best describes you. This helps us tailor the experience to your needs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Student Option */}
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 1 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Card 
                          className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform border-2 ${
                            selectedType === 'student' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200'
                          }`}
                          onClick={() => !isLoading && handleTypeSelection('student')}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Student</CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center pt-0">
                            <div className="w-full aspect-square relative mb-4 rounded-md overflow-hidden shadow-inner">
                              <Image 
                                src="/student.gif" 
                                alt="Student" 
                                fill 
                                className="object-cover" 
                                unoptimized
                              />
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                              For students working on school projects and learning eco-friendly crafting
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Personal Option */}
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: -1 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <Card 
                          className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform border-2 ${
                            selectedType === 'personal' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200'
                          }`}
                          onClick={() => !isLoading && handleTypeSelection('personal')}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Personal</CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center pt-0">
                            <div className="w-full aspect-square relative mb-4 rounded-md overflow-hidden shadow-inner">
                              <Image 
                                src="/personal.gif" 
                                alt="Personal" 
                                fill 
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                              For individuals interested in DIY projects and sustainable living
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* SME Option */}
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 1 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Card 
                          className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform border-2 ${
                            selectedType === 'sme' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200'
                          }`}
                          onClick={() => !isLoading && handleTypeSelection('sme')}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Small Business</CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center pt-0">
                            <div className="w-full aspect-square relative mb-4 rounded-md overflow-hidden shadow-inner">
                              <Image 
                                src="/sme.gif" 
                                alt="Small Business" 
                                fill 
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                              For small businesses focusing on eco-friendly products and sustainable practices
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center p-6">
                    {isLoading ? (
                      <Button disabled className="bg-green-700 hover:bg-green-800 shadow-lg">
                        <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Updating profile...
                      </Button>
                    ) : null}
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="settings" className="transition-all duration-300 transform">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border-none overflow-hidden bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <CardTitle className="text-2xl text-white">Account Settings</CardTitle>
                    <CardDescription className="text-green-100">
                      Manage your account preferences and security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <motion.div 
                      className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h3 className="text-lg font-medium mb-2">Password</h3>
                      <p className="text-gray-600 mb-4">Change your password to keep your account secure</p>
                      <Button 
                        className="bg-green-700 hover:bg-green-800 shadow-md hover:shadow-lg transition-all hover:scale-105"
                        onClick={() => setShowPasswordDialog(true)}
                      >
                        Change Password
                      </Button>
                    </motion.div>
                    
                    <Separator className="my-4" />
                    
                    <motion.div 
                      className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      <h3 className="text-lg font-medium mb-2">Email Preferences</h3>
                      <p className="text-gray-600 mb-4">Manage your email notification preferences</p>
                      
                      {loadingPreferences ? (
                        <div className="flex justify-center py-4">
                          <Icons.loader className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                      ) : emailPreferences ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="projectUpdates" className="text-base font-medium">Project Updates</Label>
                              <p className="text-sm text-gray-500">Receive notifications about your projects</p>
                            </div>
                            <Switch 
                              id="projectUpdates"
                              checked={emailPreferences.projectUpdates}
                              onCheckedChange={(checked) => handleToggleEmailPreference('projectUpdates', checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="weeklyDigest" className="text-base font-medium">Weekly Digest</Label>
                              <p className="text-sm text-gray-500">Receive a weekly summary of new DIY ideas</p>
                            </div>
                            <Switch 
                              id="weeklyDigest"
                              checked={emailPreferences.weeklyDigest}
                              onCheckedChange={(checked) => handleToggleEmailPreference('weeklyDigest', checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="marketingEmails" className="text-base font-medium">Marketing Emails</Label>
                              <p className="text-sm text-gray-500">Receive promotional offers and updates</p>
                            </div>
                            <Switch 
                              id="marketingEmails"
                              checked={emailPreferences.marketingEmails}
                              onCheckedChange={(checked) => handleToggleEmailPreference('marketingEmails', checked)}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-green-700">Failed to load email preferences</p>
                      )}
                    </motion.div>
                    
                    <Separator className="my-4" />
                    
                    <motion.div 
                      className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
                      <p className="text-gray-600 mb-4">Permanently delete your account and all your data</p>
                      <Button 
                        variant="destructive" 
                        className="shadow-md hover:shadow-lg transition-all hover:scale-105"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        Delete Account
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Password Change Dialog */}
        <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Password</AlertDialogTitle>
              <AlertDialogDescription>
                Enter your current password and a new password to update your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <form onSubmit={handleChangePassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
              
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              
              <AlertDialogFooter className="pt-4">
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : "Update Password"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="font-medium">To confirm, please enter your password:</p>
              <Input 
                type="password" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
              
              {deleteError && (
                <p className="text-red-500 text-sm">{deleteError}</p>
              )}
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 